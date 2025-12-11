import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { decryptData } from '../utils/encryption';

/**
 * Interface para callback de progresso da sincronização
 */
export interface SyncProgress {
  phase: 'validating' | 'campaigns' | 'adsets' | 'ads' | 'metrics' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
  percentage: number;
}

/**
 * Tipo do callback de progresso
 */
export type ProgressCallback = (progress: SyncProgress) => void;

/**
 * Serviço responsável por sincronizar dados da Meta Ads API
 * Implementa rate limiting inteligente e sincronização em lotes
 */
export class MetaSyncService {
  private baseUrl = 'https://graph.facebook.com/v19.0';
  private accessToken: string;
  private progressCallback?: ProgressCallback;

  // Configurações de rate limiting
  private readonly REQUEST_DELAY_MS = 1000; // Delay de 1 segundo entre requisições
  private readonly BATCH_SIZE = 3; // Processa 3 campanhas por vez
  private readonly BATCH_DELAY_MS = 3000; // Pausa de 3 segundos entre lotes
  private readonly MAX_RETRIES = 3; // Máximo de tentativas em caso de erro
  private readonly RETRY_DELAY_MS = 5000; // Delay de 5 segundos antes de tentar novamente

  constructor(accessToken?: string, progressCallback?: ProgressCallback) {
    // Usa token passado ou busca do ambiente
    this.accessToken = accessToken || import.meta.env.VITE_META_ACCESS_TOKEN || '';
    this.progressCallback = progressCallback;
  }

  /**
   * Aguarda um período de tempo (helper para rate limiting)
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Atualiza o progresso da sincronização
   */
  private updateProgress(phase: SyncProgress['phase'], current: number, total: number, message: string): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    if (this.progressCallback) {
      this.progressCallback({ phase, current, total, message, percentage });
    }

    logger.info(`Progresso da sincronização: ${message}`, { phase, current, total, percentage });
  }

  /**
   * Faz uma requisição à API com retry automático
   */
  private async fetchWithRetry(url: string, retryCount = 0): Promise<any> {
    try {
      // Aguarda antes de fazer a requisição (rate limiting)
      await this.sleep(this.REQUEST_DELAY_MS);

      const response = await fetch(url);
      const data = await response.json();

      // Verifica se há erro na resposta
      if (data.error) {
        // Se for rate limit, aguarda mais tempo e tenta novamente
        if (data.error.code === 4 || data.error.code === 17 || data.error.message.includes('rate limit')) {
          if (retryCount < this.MAX_RETRIES) {
            const waitTime = this.RETRY_DELAY_MS * (retryCount + 1);
            logger.warn(`Rate limit atingido, aguardando ${waitTime}ms antes de tentar novamente`, {
              retryCount: retryCount + 1,
              maxRetries: this.MAX_RETRIES
            });

            this.updateProgress('campaigns', 0, 0, `Aguardando ${Math.round(waitTime / 1000)}s devido ao limite da API...`);

            await this.sleep(waitTime);
            return this.fetchWithRetry(url, retryCount + 1);
          }
        }

        throw new Error(`Meta API Error: ${data.error.message} (Code: ${data.error.code})`);
      }

      return data;
    } catch (error: any) {
      // Se for erro de rede e ainda temos tentativas, tenta novamente
      if (retryCount < this.MAX_RETRIES && error.message.includes('fetch')) {
        logger.warn(`Erro de rede, tentando novamente em ${this.RETRY_DELAY_MS}ms`, {
          retryCount: retryCount + 1,
          error: error.message
        });

        await this.sleep(this.RETRY_DELAY_MS);
        return this.fetchWithRetry(url, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Valida o token de acesso testando uma chamada simples à API
   */
  private async validateToken(): Promise<{ valid: boolean; error?: string }> {
    try {
      this.updateProgress('validating', 0, 1, 'Validando token de acesso...');

      logger.info('Validando token com API Meta', {
        tokenPrefix: this.accessToken.substring(0, 20) + '...',
        tokenLength: this.accessToken.length
      });

      const url = `${this.baseUrl}/me?access_token=${this.accessToken}`;
      const data = await this.fetchWithRetry(url);

      logger.info('Token validado com sucesso na API Meta', {
        userId: data.id,
        userName: data.name
      });

      this.updateProgress('validating', 1, 1, 'Token validado com sucesso!');

      return { valid: true };
    } catch (error: any) {
      logger.error('Erro ao validar token', {
        error: error.message,
        stack: error.stack
      });
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Sincroniza todos os dados de uma conexão Meta com rate limiting inteligente
   * @param connectionId ID da conexão no banco de dados
   */
  async syncConnection(connectionId: string): Promise<void> {
    try {
      logger.info('Iniciando sincronização Meta', { connectionId });

      // Atualiza status para sincronizando
      await supabase
        .from('data_connections')
        .update({ status: 'syncing' })
        .eq('id', connectionId);

      // Busca dados da conexão
      const { data: connection } = await supabase
        .from('data_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (!connection) throw new Error('Conexão não encontrada');

      // Busca token OAuth se não foi passado no construtor
      if (!this.accessToken) {
        const { data: tokenData, error: tokenError } = await supabase
          .from('oauth_tokens')
          .select('access_token')
          .eq('connection_id', connectionId)
          .maybeSingle();

        if (tokenError) {
          logger.error('Erro ao buscar token no banco', tokenError);
          throw new Error(`Erro ao buscar token: ${tokenError.message}`);
        }

        if (!tokenData?.access_token) {
          logger.error('Token não encontrado no banco', { connectionId });
          throw new Error('Token de acesso não encontrado no banco de dados');
        }

        logger.info('Token encontrado no banco', {
          connectionId,
          tokenPrefix: tokenData.access_token.substring(0, 20) + '...',
          tokenLength: tokenData.access_token.length
        });

        // Verifica se o token parece estar criptografado (tokens Meta começam com EAA)
        const looksEncrypted = !tokenData.access_token.startsWith('EAA');

        if (looksEncrypted) {
          try {
            // Descriptografa o token antes de usar
            logger.info('Token parece estar criptografado, tentando descriptografar');
            this.accessToken = decryptData(tokenData.access_token).trim();
            logger.info('Token descriptografado com sucesso', {
              tokenLength: this.accessToken.length,
              tokenPrefix: this.accessToken.substring(0, 20) + '...'
            });
          } catch (decryptError: any) {
            logger.error('Erro ao descriptografar token', {
              error: decryptError.message,
              tokenPrefix: tokenData.access_token.substring(0, 20) + '...'
            });
            throw new Error(`Falha ao descriptografar token: ${decryptError.message}`);
          }
        } else {
          // Token não está criptografado, usa direto
          logger.info('Token não parece estar criptografado, usando diretamente');
          this.accessToken = tokenData.access_token.trim();
        }
      }

      if (!this.accessToken) {
        throw new Error('Token de acesso não encontrado');
      }

      logger.info('Iniciando validação do token');

      // Valida o token antes de prosseguir
      const validation = await this.validateToken();
      if (!validation.valid) {
        const errorMsg = validation.error || 'Token inválido';
        logger.error('Validação do token falhou', { error: errorMsg });
        throw new Error(`Validação do token falhou: ${errorMsg}`);
      }

      logger.info('Token validado com sucesso, prosseguindo com sincronização');

      const accountId = connection.config?.accountId;
      if (!accountId) throw new Error('Account ID não encontrado');

      // 1. Busca campanhas ativas dos últimos 90 dias
      this.updateProgress('campaigns', 0, 1, 'Buscando campanhas...');
      logger.info('Buscando campanhas Meta');
      const allCampaigns = await this.fetchCampaigns(accountId);

      // Filtra apenas campanhas ativas ou recentes
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 90); // Últimos 90 dias

      const campaigns = allCampaigns.filter(campaign => {
        const createdDate = new Date(campaign.created_time);
        return campaign.status === 'ACTIVE' || createdDate >= recentDate;
      });

      logger.info('Campanhas filtradas para sincronização', {
        total: allCampaigns.length,
        filtered: campaigns.length
      });

      if (campaigns.length === 0) {
        this.updateProgress('complete', 1, 1, 'Nenhuma campanha ativa encontrada');

        await supabase
          .from('data_connections')
          .update({
            status: 'connected',
            last_sync: new Date().toISOString()
          })
          .eq('id', connectionId);

        return;
      }

      // 2. Processa campanhas em lotes para evitar rate limit
      const totalCampaigns = campaigns.length;
      let processedCampaigns = 0;

      for (let i = 0; i < campaigns.length; i += this.BATCH_SIZE) {
        const batch = campaigns.slice(i, i + this.BATCH_SIZE);
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(campaigns.length / this.BATCH_SIZE);

        this.updateProgress(
          'campaigns',
          processedCampaigns,
          totalCampaigns,
          `Processando lote ${batchNumber}/${totalBatches} de campanhas...`
        );

        logger.info(`Processando lote ${batchNumber}/${totalBatches} de campanhas`, {
          batchSize: batch.length,
          processed: processedCampaigns,
          total: totalCampaigns
        });

        // Processa cada campanha do lote
        for (const campaign of batch) {
          try {
            await this.saveCampaign(connectionId, campaign);
            processedCampaigns++;

            this.updateProgress(
              'campaigns',
              processedCampaigns,
              totalCampaigns,
              `Campanha "${campaign.name}" salva (${processedCampaigns}/${totalCampaigns})`
            );

            // 3. Busca ad sets de cada campanha
            this.updateProgress('adsets', 0, 1, `Buscando ad sets da campanha "${campaign.name}"...`);
            const adSets = await this.fetchAdSets(campaign.id);
            logger.info('Ad Sets encontrados', { campaignId: campaign.id, count: adSets.length });

            // 4. Salva ad sets no banco
            for (let j = 0; j < adSets.length; j++) {
              const adSet = adSets[j];
              await this.saveAdSet(connectionId, campaign.id, adSet);

              this.updateProgress(
                'adsets',
                j + 1,
                adSets.length,
                `Ad Set "${adSet.name}" salvo (${j + 1}/${adSets.length})`
              );

              // 5. Busca anúncios de cada ad set
              this.updateProgress('ads', 0, 1, `Buscando anúncios do ad set "${adSet.name}"...`);
              const ads = await this.fetchAds(adSet.id);
              logger.info('Anúncios encontrados', { adSetId: adSet.id, count: ads.length });

              // 6. Salva anúncios no banco
              for (let k = 0; k < ads.length; k++) {
                const ad = ads[k];
                await this.saveAd(connectionId, campaign.id, adSet.id, ad);

                this.updateProgress(
                  'ads',
                  k + 1,
                  ads.length,
                  `Anúncio "${ad.name}" salvo (${k + 1}/${ads.length})`
                );
              }
            }

            // 7. Busca métricas da campanha (últimos 90 dias para garantir histórico completo)
            this.updateProgress('metrics', 0, 1, `Buscando métricas da campanha "${campaign.name}"...`);
            const dateEnd = new Date().toISOString().split('T')[0];
            const dateStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            logger.info('Buscando métricas do período', {
              campaignId: campaign.id,
              campaignName: campaign.name,
              dateStart,
              dateEnd,
              totalDays: 90
            });

            const insights = await this.fetchInsights(campaign.id, dateStart, dateEnd);
            logger.info('Métricas encontradas da API Meta', {
              campaignId: campaign.id,
              campaignName: campaign.name,
              count: insights.length,
              hasData: insights.length > 0
            });

            // Valida se métricas foram retornadas
            if (insights.length === 0) {
              logger.warn('Nenhuma métrica retornada pela API Meta para esta campanha', {
                campaignId: campaign.id,
                campaignName: campaign.name,
                period: `${dateStart} até ${dateEnd}`
              });
            }

            // 8. Salva métricas no banco com validação
            let metricsSaved = 0;
            let metricsErrors = 0;

            for (let m = 0; m < insights.length; m++) {
              const insight = insights[m];
              try {
                await this.saveMetrics(connectionId, campaign.id, insight);
                metricsSaved++;

                this.updateProgress(
                  'metrics',
                  m + 1,
                  insights.length,
                  `Métricas salvas (${m + 1}/${insights.length})`
                );
              } catch (metricError: any) {
                metricsErrors++;
                logger.error('Erro ao salvar métrica individual', {
                  campaignId: campaign.id,
                  date: insight.date_start,
                  error: metricError.message,
                  insightData: {
                    impressions: insight.impressions,
                    clicks: insight.clicks,
                    spend: insight.spend
                  }
                });
              }
            }

            logger.info('Resumo do salvamento de métricas', {
              campaignId: campaign.id,
              campaignName: campaign.name,
              total: insights.length,
              saved: metricsSaved,
              errors: metricsErrors
            });

          } catch (error: any) {
            logger.error(`Erro ao processar campanha ${campaign.id}`, {
              error: error.message,
              campaignId: campaign.id,
              campaignName: campaign.name
            });

            // Continua com a próxima campanha mesmo se houver erro
            this.updateProgress(
              'campaigns',
              processedCampaigns,
              totalCampaigns,
              `Erro na campanha "${campaign.name}", continuando...`
            );
          }
        }

        // Pausa entre lotes para evitar rate limit
        if (i + this.BATCH_SIZE < campaigns.length) {
          const remainingBatches = Math.ceil((campaigns.length - i - this.BATCH_SIZE) / this.BATCH_SIZE);
          this.updateProgress(
            'campaigns',
            processedCampaigns,
            totalCampaigns,
            `Aguardando ${this.BATCH_DELAY_MS / 1000}s antes do próximo lote (${remainingBatches} lotes restantes)...`
          );

          await this.sleep(this.BATCH_DELAY_MS);
        }
      }

      // Verifica quantas métricas foram realmente salvas no banco
      const { count: totalMetrics } = await supabase
        .from('ad_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId);

      logger.info('Verificando métricas salvas no banco', {
        connectionId,
        totalMetricsInDatabase: totalMetrics
      });

      // Atualiza status para conectado
      await supabase
        .from('data_connections')
        .update({
          status: 'connected',
          last_sync: new Date().toISOString()
        })
        .eq('id', connectionId);

      this.updateProgress('complete', totalCampaigns, totalCampaigns, 'Sincronização concluída com sucesso!');

      logger.info('Sincronização Meta concluída com sucesso', {
        connectionId,
        campanhasProcessadas: processedCampaigns,
        totalCampanhas: totalCampaigns,
        metricasNoBank: totalMetrics,
        status: 'success'
      });

    } catch (error: any) {
      logger.error('Erro na sincronização Meta', error, { connectionId });

      this.updateProgress('error', 0, 0, `Erro: ${error.message}`);

      // Atualiza status para erro
      await supabase
        .from('data_connections')
        .update({ status: 'error' })
        .eq('id', connectionId);

      throw error;
    }
  }

  /**
   * Busca todas as campanhas de uma conta
   */
  private async fetchCampaigns(accountId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${accountId}/campaigns?fields=id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_remaining&access_token=${this.accessToken}`;

    logger.info('Buscando campanhas da Meta API', { accountId, url: url.replace(this.accessToken, 'TOKEN_HIDDEN') });

    const data = await this.fetchWithRetry(url);
    return data.data || [];
  }

  /**
   * Busca todos os ad sets de uma campanha
   */
  private async fetchAdSets(campaignId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal&access_token=${this.accessToken}`;
    const data = await this.fetchWithRetry(url);
    return data.data || [];
  }

  /**
   * Busca todos os anúncios de um ad set
   */
  private async fetchAds(adSetId: string): Promise<any[]> {
    const url = `${this.baseUrl}/${adSetId}/ads?fields=id,name,status,creative{title,body,image_url}&access_token=${this.accessToken}`;
    const data = await this.fetchWithRetry(url);
    return data.data || [];
  }

  /**
   * Busca métricas/insights de uma campanha
   * Solicita TODOS os campos disponíveis na Meta Ads API para garantir alinhamento total com o Gerenciador de Anúncios
   */
  private async fetchInsights(campaignId: string, dateStart: string, dateEnd: string): Promise<any[]> {
    try {
      // Lista completa de campos da Meta Ads API para insights
      const fields = [
        // Métricas básicas
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        // Métricas de taxa (já calculadas pela API)
        'ctr', 'cpc', 'cpm', 'cpp',
        // Cliques detalhados
        'inline_link_clicks', 'cost_per_inline_link_click', 'outbound_clicks',
        // Conversões e ações
        'actions', 'action_values',
        // Vídeo
        'video_views', 'video_avg_time_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p100_watched_actions'
      ].join(',');

      const url = `${this.baseUrl}/${campaignId}/insights?fields=${fields}&time_range={"since":"${dateStart}","until":"${dateEnd}"}&time_increment=1&access_token=${this.accessToken}`;

      logger.info('Requisitando insights da API Meta', {
        campaignId,
        dateStart,
        dateEnd,
        fieldsCount: fields.split(',').length
      });

      const data = await this.fetchWithRetry(url);

      // Valida resposta da API
      if (!data || typeof data !== 'object') {
        logger.error('Resposta inválida da API Meta', {
          campaignId,
          responseType: typeof data,
          data: data
        });
        return [];
      }

      const insights = data.data || [];

      logger.info('Insights recebidos da API Meta', {
        campaignId,
        count: insights.length,
        hasData: insights.length > 0,
        firstDate: insights[0]?.date_start,
        lastDate: insights[insights.length - 1]?.date_start
      });

      return insights;
    } catch (error: any) {
      logger.error('Erro ao buscar insights da API Meta', {
        campaignId,
        dateStart,
        dateEnd,
        error: error.message,
        stack: error.stack
      });

      // Retorna array vazio em vez de propagar erro
      // para não interromper sincronização de outras campanhas
      return [];
    }
  }

  /**
   * Salva uma campanha no banco de dados
   */
  private async saveCampaign(connectionId: string, campaign: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verifica se a campanha já existe
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign.id)
      .maybeSingle();

    const campaignData = {
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      start_date: campaign.start_time,
      end_date: campaign.stop_time,
      daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
      budget_remaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
    };

    if (existing) {
      // Atualiza campanha existente
      const { error } = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', campaign.id);
      if (error) throw error;
    } else {
      // Insere nova campanha
      const { error } = await supabase
        .from('campaigns')
        .insert({
          id: campaign.id,
          connection_id: connectionId,
          user_id: user.id,
          platform: 'Meta',
          created_date: campaign.created_time,
          ...campaignData,
        });
      if (error) throw error;
    }
  }

  /**
   * Salva um ad set no banco de dados
   */
  private async saveAdSet(connectionId: string, campaignId: string, adSet: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verifica se o ad set já existe
    const { data: existing } = await supabase
      .from('ad_sets')
      .select('id')
      .eq('id', adSet.id)
      .maybeSingle();

    const adSetData = {
      name: adSet.name,
      status: adSet.status,
      daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
      lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
      targeting: JSON.stringify(adSet.targeting || {}),
      optimization_goal: adSet.optimization_goal,
    };

    if (existing) {
      // Atualiza ad set existente
      const { error } = await supabase
        .from('ad_sets')
        .update(adSetData)
        .eq('id', adSet.id);
      if (error) throw error;
    } else {
      // Insere novo ad set
      const { error } = await supabase
        .from('ad_sets')
        .insert({
          id: adSet.id,
          campaign_id: campaignId,
          connection_id: connectionId,
          user_id: user.id,
          ...adSetData,
        });
      if (error) throw error;
    }
  }

  /**
   * Salva um anúncio no banco de dados
   */
  private async saveAd(connectionId: string, campaignId: string, adSetId: string, ad: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Verifica se o anúncio já existe
    const { data: existing } = await supabase
      .from('ads')
      .select('id')
      .eq('id', ad.id)
      .maybeSingle();

    const adData = {
      name: ad.name,
      status: ad.status,
      ad_type: ad.creative?.object_type || 'other',
      headline: ad.creative?.title,
      description: ad.creative?.body,
      thumbnail_url: ad.creative?.image_url,
    };

    if (existing) {
      // Atualiza anúncio existente
      const { error } = await supabase
        .from('ads')
        .update(adData)
        .eq('id', ad.id);
      if (error) throw error;
    } else {
      // Insere novo anúncio
      const { error } = await supabase
        .from('ads')
        .insert({
          id: ad.id,
          ad_set_id: adSetId,
          campaign_id: campaignId,
          connection_id: connectionId,
          user_id: user.id,
          ...adData,
        });
      if (error) throw error;
    }
  }

  /**
   * Salva métricas no banco de dados
   * Extrai e armazena TODOS os campos retornados pela API Meta, incluindo JSONs brutos para auditoria
   */
  private async saveMetrics(connectionId: string, campaignId: string, insight: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Validação básica dos dados de entrada
    if (!insight.date_start) {
      throw new Error('Métrica sem data - campo date_start ausente');
    }

    // Extrai conversões das actions - verifica múltiplos tipos de conversão
    const actions = insight.actions || [];
    const conversions = this.extractActionValue(actions, [
      'offsite_conversion.fb_pixel_purchase',
      'purchase',
      'omni_purchase',
      'app_custom_event.fb_mobile_purchase'
    ]);

    // Extrai valor REAL das conversões (não estimar!)
    const actionValues = insight.action_values || [];
    const conversionValue = this.extractActionValue(actionValues, [
      'offsite_conversion.fb_pixel_purchase',
      'purchase',
      'omni_purchase',
      'app_custom_event.fb_mobile_purchase'
    ]);

    // Extrai visualizações de vídeo
    const videoViews = this.extractActionValue(actions, ['video_view']);

    // Extrai cliques em links inline
    const inlineLinkClicks = parseInt(insight.inline_link_clicks || '0');

    // Extrai cliques outbound
    const outboundClicks = parseInt(insight.outbound_clicks || '0');

    const spend = parseFloat(insight.spend || '0');

    // Calcula ROAS usando valor REAL de conversão (não estimativa)
    const roas = conversionValue > 0 && spend > 0 ? conversionValue / spend : 0;

    // Log detalhado para debugging e auditoria
    logger.info('Preparando para salvar métricas', {
      campaignId,
      date: insight.date_start,
      userId: user.id,
      connectionId,
      metrics: {
        impressions: insight.impressions,
        clicks: insight.clicks,
        spend,
        conversions,
        conversionValue,
        reach: insight.reach,
        frequency: insight.frequency,
        ctr: insight.ctr,
        cpc: insight.cpc,
        cpm: insight.cpm,
        roas
      },
      hasActions: actions.length > 0,
      hasActionValues: actionValues.length > 0
    });

    // Verifica se a métrica já existe (usando a unique constraint)
    const { data: existing } = await supabase
      .from('ad_metrics')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('date', insight.date_start)
      .is('ad_set_id', null)
      .is('ad_id', null)
      .maybeSingle();

    // Prepara dados para salvar - usa valores REAIS da API, não recalcula
    const metricsData = {
      // Métricas básicas
      impressions: parseInt(insight.impressions || '0'),
      clicks: parseInt(insight.clicks || '0'),
      spend: spend,
      reach: parseInt(insight.reach || '0'),
      frequency: parseFloat(insight.frequency || '0'),

      // Métricas de taxa - USA VALORES DA API, NÃO RECALCULA
      ctr: parseFloat(insight.ctr || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      cpp: parseFloat(insight.cpp || '0'),

      // Conversões - USA VALOR REAL, NÃO ESTIMA
      conversions: parseFloat(conversions),
      conversion_value: parseFloat(conversionValue),
      roas: roas,
      cost_per_result: conversions > 0 ? spend / conversions : 0,

      // Cliques detalhados
      inline_link_clicks: inlineLinkClicks,
      cost_per_inline_link_click: parseFloat(insight.cost_per_inline_link_click || '0'),
      outbound_clicks: outboundClicks,

      // Vídeo
      video_views: videoViews,

      // JSONs brutos para auditoria e recálculo futuro
      actions_raw: actions.length > 0 ? actions : null,
      action_values_raw: actionValues.length > 0 ? actionValues : null,
    };

    if (existing) {
      // Atualiza métrica existente
      logger.info('Atualizando métrica existente', {
        metricId: existing.id,
        campaignId,
        date: insight.date_start
      });

      const { error } = await supabase
        .from('ad_metrics')
        .update(metricsData)
        .eq('id', existing.id);

      if (error) {
        logger.error('Erro ao atualizar métrica', {
          metricId: existing.id,
          error: error.message,
          details: error
        });
        throw error;
      }

      logger.info('Métrica atualizada com sucesso', {
        metricId: existing.id,
        campaignId,
        date: insight.date_start
      });
    } else {
      // Insere nova métrica
      logger.info('Inserindo nova métrica', {
        campaignId,
        date: insight.date_start,
        userId: user.id,
        connectionId
      });

      const { data: insertedData, error } = await supabase
        .from('ad_metrics')
        .insert({
          connection_id: connectionId,
          user_id: user.id,
          campaign_id: campaignId,
          date: insight.date_start,
          ...metricsData,
        })
        .select();

      if (error) {
        logger.error('Erro ao inserir métrica', {
          campaignId,
          date: insight.date_start,
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint
        });
        throw error;
      }

      if (!insertedData || insertedData.length === 0) {
        logger.error('Métrica inserida mas não retornou dados', {
          campaignId,
          date: insight.date_start
        });
        throw new Error('Falha ao confirmar inserção da métrica no banco');
      }

      logger.info('Métrica inserida com sucesso', {
        metricId: insertedData[0].id,
        campaignId,
        date: insight.date_start,
        spend: insertedData[0].spend,
        impressions: insertedData[0].impressions,
        clicks: insertedData[0].clicks
      });
    }
  }

  /**
   * Extrai valor de uma ação específica do array actions ou action_values
   * Suporta múltiplos tipos de ação (ex: purchase, omni_purchase, etc)
   *
   * @param actionsArray - Array de actions ou action_values da API Meta
   * @param actionTypes - Array de tipos de ação para buscar (em ordem de prioridade)
   * @returns Valor numérico da ação encontrada, ou 0 se não encontrar
   */
  private extractActionValue(actionsArray: any[], actionTypes: string[]): number {
    if (!actionsArray || actionsArray.length === 0) return 0;

    // Percorre tipos de ação em ordem de prioridade
    for (const actionType of actionTypes) {
      const action = actionsArray.find((a: any) => a.action_type === actionType);
      if (action && action.value) {
        return parseFloat(action.value);
      }
    }

    return 0;
  }
}
