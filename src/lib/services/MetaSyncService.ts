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
  private baseUrl = 'https://graph.facebook.com/v21.0';
  private accessToken: string;
  private progressCallback?: ProgressCallback;
  private workspaceId: string | null = null;
  private clientId: string | null = null;

  private readonly REQUEST_DELAY_MS = 1000;
  private readonly BATCH_SIZE = 3;
  private readonly BATCH_DELAY_MS = 3000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 5000;

  constructor(accessToken?: string, progressCallback?: ProgressCallback) {
    this.accessToken = accessToken || '';
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

      // Log do status da resposta
      if (!response.ok) {
        logger.error('Erro HTTP na requisição à API Meta', {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(this.accessToken, 'TOKEN_HIDDEN')
        });
      }

      const data = await response.json();

      // Verifica se há erro na resposta
      if (data.error) {
        // Log detalhado do erro
        logger.error('Erro retornado pela API Meta', {
          errorCode: data.error.code,
          errorMessage: data.error.message,
          errorType: data.error.type,
          errorSubcode: data.error.error_subcode,
          fbtrace_id: data.error.fbtrace_id
        });

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
      try {
        const { error: updateError } = await supabase
          .from('data_connections')
          .update({ status: 'syncing' })
          .eq('id', connectionId);

        if (updateError) {
          logger.error('Erro ao atualizar status da conexão para "syncing"', {
            connectionId,
            error: updateError.message,
            code: updateError.code
          });
        } else {
          logger.info('Status da conexão atualizado para "syncing"', { connectionId });
        }
      } catch (statusUpdateError: any) {
        logger.error('Exceção ao atualizar status da conexão para "syncing"', {
          connectionId,
          error: statusUpdateError.message
        });
      }

      // Busca dados da conexão
      const { data: connection } = await supabase
        .from('data_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (!connection) throw new Error('Conexão não encontrada');

      // Armazena workspace_id e client_id da conexão para uso nos métodos de salvamento
      this.workspaceId = connection.workspace_id || null;
      this.clientId = connection.client_id || null;

      logger.info('Workspace e cliente identificados para sincronização', {
        connectionId,
        workspaceId: this.workspaceId,
        clientId: this.clientId
      });

      // Se não tiver workspace_id, tenta buscar do usuário
      if (!this.workspaceId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (workspace) {
            this.workspaceId = workspace.id;
            logger.info('Workspace obtido do usuário', { workspaceId: this.workspaceId });

            // Atualiza a conexão com o workspace_id
            await supabase
              .from('data_connections')
              .update({ workspace_id: this.workspaceId })
              .eq('id', connectionId);
          }
        }
      }

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
            await this.saveCampaign(connectionId, campaign, accountId);
            processedCampaigns++;

            this.updateProgress(
              'campaigns',
              processedCampaigns,
              totalCampaigns,
              `Campanha "${campaign.name}" salva (${processedCampaigns}/${totalCampaigns})`
            );

            // Calcula datas do período (últimos 90 dias) para buscar métricas em todos os níveis
            const now = new Date();
            const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 90);
            const dateEnd = endDate.toISOString().split('T')[0];
            const dateStart = startDate.toISOString().split('T')[0];

            logger.info('Período de métricas definido', {
              campaignId: campaign.id,
              campaignName: campaign.name,
              dateStart,
              dateEnd,
              totalDays: 90
            });

            // 3. Busca ad sets de cada campanha
            this.updateProgress('adsets', 0, 1, `Buscando ad sets da campanha "${campaign.name}"...`);
            const adSets = await this.fetchAdSets(campaign.id);
            logger.info('Ad Sets encontrados', { campaignId: campaign.id, count: adSets.length });

            // 4. Salva ad sets e suas métricas
            for (let j = 0; j < adSets.length; j++) {
              const adSet = adSets[j];
              await this.saveAdSet(connectionId, campaign.id, adSet);

              this.updateProgress(
                'adsets',
                j + 1,
                adSets.length,
                `Ad Set "${adSet.name}" salvo (${j + 1}/${adSets.length})`
              );

              // 4.1 Busca e salva métricas do ad set
              logger.info('Buscando métricas do Ad Set', { adSetId: adSet.id, adSetName: adSet.name });
              const adSetInsights = await this.fetchAdSetInsights(adSet.id, dateStart, dateEnd);

              if (adSetInsights.length > 0) {
                logger.info(`✅ ${adSetInsights.length} métricas encontradas para Ad Set "${adSet.name}"`);
                for (const insight of adSetInsights) {
                  try {
                    await this.saveMetrics(connectionId, campaign.id, insight, adSet.id);
                  } catch (err: any) {
                    logger.error('Erro ao salvar métrica de Ad Set', {
                      adSetId: adSet.id,
                      date: insight.date_start,
                      error: err.message
                    });
                  }
                }
              } else {
                logger.warn(`⚠️ Nenhuma métrica retornada para Ad Set "${adSet.name}"`);
              }

              // 5. Busca anúncios de cada ad set
              this.updateProgress('ads', 0, 1, `Buscando anúncios do ad set "${adSet.name}"...`);
              const ads = await this.fetchAds(adSet.id);
              logger.info('Anúncios encontrados', { adSetId: adSet.id, count: ads.length });

              // 6. Salva anúncios e suas métricas
              for (let k = 0; k < ads.length; k++) {
                const ad = ads[k];
                await this.saveAd(connectionId, campaign.id, adSet.id, ad);

                this.updateProgress(
                  'ads',
                  k + 1,
                  ads.length,
                  `Anúncio "${ad.name}" salvo (${k + 1}/${ads.length})`
                );

                // 6.1 Busca e salva métricas do anúncio
                logger.info('Buscando métricas do Anúncio', { adId: ad.id, adName: ad.name });
                const adInsights = await this.fetchAdInsights(ad.id, dateStart, dateEnd);

                if (adInsights.length > 0) {
                  logger.info(`✅ ${adInsights.length} métricas encontradas para Anúncio "${ad.name}"`);
                  for (const insight of adInsights) {
                    try {
                      await this.saveMetrics(connectionId, campaign.id, insight, adSet.id, ad.id);
                    } catch (err: any) {
                      logger.error('Erro ao salvar métrica de Anúncio', {
                        adId: ad.id,
                        date: insight.date_start,
                        error: err.message
                      });
                    }
                  }
                } else {
                  logger.warn(`⚠️ Nenhuma métrica retornada para Anúncio "${ad.name}"`);
                }
              }
            }

            // 7. Busca métricas da campanha (usa mesmo período já definido)
            this.updateProgress('metrics', 0, 1, `Buscando métricas da campanha "${campaign.name}"...`);

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

              // Log mais visível no console para debug
              console.error('⚠️ AVISO: Nenhuma métrica retornada pela API Meta!', {
                campanha: campaign.name,
                id: campaign.id,
                periodo: `${dateStart} até ${dateEnd}`,
                mensagem: 'Possíveis causas: campanha sem gastos, token sem permissão ads_read, ou período incorreto'
              });
            } else {
              // Log de sucesso para confirmar que métricas foram encontradas
              console.log('✅ Métricas encontradas:', {
                campanha: campaign.name,
                quantidade: insights.length,
                primeiraData: insights[0]?.date_start,
                ultimaData: insights[insights.length - 1]?.date_start
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

                // Log mais visível no console
                console.error('❌ ERRO ao salvar métrica:', {
                  campanha: campaign.name,
                  data: insight.date_start,
                  erro: metricError.message,
                  detalhes: metricError
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

            // Log mais visível no console
            if (metricsSaved > 0) {
              console.log(`💾 ${metricsSaved} métricas salvas com sucesso para "${campaign.name}"`);
            }
            if (metricsErrors > 0) {
              console.error(`⚠️ ${metricsErrors} erros ao salvar métricas de "${campaign.name}"`);
            }

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

      // Log visual no console
      console.log('📊 RESUMO DA SINCRONIZAÇÃO:', {
        campanhas: processedCampaigns,
        metricasNoBanco: totalMetrics,
        status: totalMetrics > 0 ? '✅ Sucesso' : '⚠️ Nenhuma métrica foi salva'
      });

      // Se nenhuma métrica foi salva, alerta o usuário
      if (totalMetrics === 0) {
        console.error('⚠️ ALERTA: Nenhuma métrica foi salva no banco!');
        console.error('Possíveis causas:');
        console.error('1. API Meta não retornou dados (campanhas sem gastos)');
        console.error('2. Token sem permissão "ads_read"');
        console.error('3. Erro de permissão RLS no banco');
        console.error('4. Período de datas incorreto');
      }

      // Atualiza status para conectado com retry logic
      // Tentativa 1: Atualização direta
      console.log('🔄 Atualizando status da conexão para "connected"...', { connectionId });

      let statusUpdated = false;
      let lastError: any = null;

      // Tenta atualizar até 3 vezes com intervalos
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔄 Tentativa ${attempt} de 3 para atualizar status...`);

          const { data: updateData, error: updateError } = await supabase
            .from('data_connections')
            .update({
              status: 'connected',
              last_sync: new Date().toISOString()
            })
            .eq('id', connectionId)
            .select();

          if (updateError) {
            lastError = updateError;
            console.error(`❌ Tentativa ${attempt} falhou:`, {
              connectionId,
              error: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint
            });

            logger.error(`Erro ao atualizar status da conexão (tentativa ${attempt})`, {
              connectionId,
              error: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint
            });

            // Se for erro de RLS, não adianta tentar novamente
            if (updateError.code === '42501' || updateError.code === 'PGRST301') {
              console.error('❌ Erro de permissão RLS detectado. Não tentando novamente.');
              break;
            }

            // Espera 1 segundo antes de tentar novamente
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            statusUpdated = true;
            console.log('✅ Status atualizado com sucesso!', {
              connectionId,
              updateData,
              attempt
            });

            logger.info('Status da conexão atualizado para "connected" com sucesso', {
              connectionId,
              attempt
            });
            break;
          }
        } catch (statusUpdateError: any) {
          lastError = statusUpdateError;
          console.error(`❌ Exceção na tentativa ${attempt}:`, {
            connectionId,
            error: statusUpdateError.message,
            stack: statusUpdateError.stack
          });

          logger.error(`Exceção ao atualizar status da conexão (tentativa ${attempt})`, {
            connectionId,
            error: statusUpdateError.message,
            stack: statusUpdateError.stack
          });

          // Espera 1 segundo antes de tentar novamente
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!statusUpdated) {
        console.error('❌ FALHA: Não foi possível atualizar o status após 3 tentativas');
        console.error('Último erro:', lastError);
        console.warn('⚠️ A sincronização foi bem-sucedida, mas o status não foi atualizado no banco.');
        console.warn('O frontend tentará atualizar o status localmente.');
      }

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
      try {
        const { error: updateError } = await supabase
          .from('data_connections')
          .update({ status: 'error' })
          .eq('id', connectionId);

        if (updateError) {
          logger.error('Erro ao atualizar status da conexão para "error"', {
            connectionId,
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint
          });
        } else {
          logger.info('Status da conexão atualizado para "error"', { connectionId });
        }
      } catch (statusUpdateError: any) {
        logger.error('Exceção ao atualizar status da conexão para "error"', {
          connectionId,
          error: statusUpdateError.message,
          stack: statusUpdateError.stack
        });
      }

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
   * Busca métricas/insights de um Ad Set
   * Retorna dados no mesmo formato de fetchInsights para reutilizar saveMetrics
   */
  private async fetchAdSetInsights(adSetId: string, dateStart: string, dateEnd: string): Promise<any[]> {
    try {
      // Valida e ajusta datas
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];
      let adjustedDateEnd = dateEnd;

      if (new Date(dateEnd) > now) {
        adjustedDateEnd = currentDateStr;
      }

      // Campos de métricas - mesmos usados para campanhas
      const fields = [
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        'ctr', 'cpc', 'cpm', 'cpp',
        'inline_link_clicks', 'cost_per_inline_link_click', 'outbound_clicks',
        'actions', 'action_values',
        'video_views', 'video_avg_time_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p100_watched_actions'
      ].join(',');

      const timeRange = encodeURIComponent(JSON.stringify({ since: dateStart, until: adjustedDateEnd }));
      const url = `${this.baseUrl}/${adSetId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${this.accessToken}`;

      logger.info('Buscando insights do Ad Set', { adSetId, dateStart, dateEnd: adjustedDateEnd });

      const data = await this.fetchWithRetry(url);
      const insights = data.data || [];

      logger.info('Insights do Ad Set recebidos', {
        adSetId,
        count: insights.length,
        hasData: insights.length > 0
      });

      return insights;
    } catch (error: any) {
      logger.error('Erro ao buscar insights do Ad Set', {
        adSetId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Busca métricas/insights de um Anúncio
   * Retorna dados no mesmo formato de fetchInsights para reutilizar saveMetrics
   */
  private async fetchAdInsights(adId: string, dateStart: string, dateEnd: string): Promise<any[]> {
    try {
      // Valida e ajusta datas
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];
      let adjustedDateEnd = dateEnd;

      if (new Date(dateEnd) > now) {
        adjustedDateEnd = currentDateStr;
      }

      // Campos de métricas - mesmos usados para campanhas
      const fields = [
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        'ctr', 'cpc', 'cpm', 'cpp',
        'inline_link_clicks', 'cost_per_inline_link_click', 'outbound_clicks',
        'actions', 'action_values',
        'video_views', 'video_avg_time_watched_actions',
        'video_p25_watched_actions', 'video_p50_watched_actions',
        'video_p75_watched_actions', 'video_p100_watched_actions'
      ].join(',');

      const timeRange = encodeURIComponent(JSON.stringify({ since: dateStart, until: adjustedDateEnd }));
      const url = `${this.baseUrl}/${adId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${this.accessToken}`;

      logger.info('Buscando insights do Anúncio', { adId, dateStart, dateEnd: adjustedDateEnd });

      const data = await this.fetchWithRetry(url);
      const insights = data.data || [];

      logger.info('Insights do Anúncio recebidos', {
        adId,
        count: insights.length,
        hasData: insights.length > 0
      });

      return insights;
    } catch (error: any) {
      logger.error('Erro ao buscar insights do Anúncio', {
        adId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Busca métricas/insights de uma campanha
   * Solicita TODOS os campos disponíveis na Meta Ads API para garantir alinhamento total com o Gerenciador de Anúncios
   */
  private async fetchInsights(campaignId: string, dateStart: string, dateEnd: string): Promise<any[]> {
    try {
      // Valida datas antes de fazer requisição
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];
      const startDateObj = new Date(dateStart);
      const endDateObj = new Date(dateEnd);

      // Ajusta dateEnd se estiver no futuro
      if (endDateObj > now) {
        dateEnd = currentDateStr;
        logger.warn('Data final ajustada para hoje (estava no futuro)', {
          originalDateEnd: dateEnd,
          adjustedDateEnd: currentDateStr
        });
      }

      // Valida se dateStart não é posterior a dateEnd
      if (startDateObj > endDateObj) {
        logger.error('Data inicial posterior à data final', {
          dateStart,
          dateEnd
        });
        return [];
      }

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

      const timeRange = encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }));
      const url = `${this.baseUrl}/${campaignId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${this.accessToken}`;

      logger.info('Requisitando insights da API Meta', {
        campaignId,
        dateStart,
        dateEnd,
        currentDate: currentDateStr,
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
  private async saveCampaign(connectionId: string, campaign: any, accountId?: string): Promise<void> {
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
      // Salva o account_id da conta Meta para associar criativos
      account_id: accountId || null,
    };

    if (existing) {
      const { error } = await supabase
        .from('campaigns')
        .update({
          ...campaignData,
          workspace_id: this.workspaceId,
          client_id: this.clientId,
        })
        .eq('id', campaign.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          id: campaign.id,
          connection_id: connectionId,
          user_id: user.id,
          workspace_id: this.workspaceId,
          client_id: this.clientId,
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
      const { error } = await supabase
        .from('ad_sets')
        .update({
          ...adSetData,
          workspace_id: this.workspaceId,
          client_id: this.clientId,
        })
        .eq('id', adSet.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('ad_sets')
        .insert({
          id: adSet.id,
          campaign_id: campaignId,
          connection_id: connectionId,
          user_id: user.id,
          workspace_id: this.workspaceId,
          client_id: this.clientId,
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
      const { error } = await supabase
        .from('ads')
        .update({
          ...adData,
          workspace_id: this.workspaceId,
          client_id: this.clientId,
        })
        .eq('id', ad.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('ads')
        .insert({
          id: ad.id,
          ad_set_id: adSetId,
          campaign_id: campaignId,
          connection_id: connectionId,
          user_id: user.id,
          workspace_id: this.workspaceId,
          client_id: this.clientId,
          ...adData,
        });
      if (error) throw error;
    }
  }

  /**
   * Salva métricas no banco de dados
   * Extrai e armazena TODOS os campos retornados pela API Meta, incluindo JSONs brutos para auditoria
   *
   * @param connectionId - ID da conexão
   * @param campaignId - ID da campanha
   * @param insight - Dados de insight da API Meta
   * @param adSetId - ID do ad set (opcional - se não informado, salva como nível de campanha)
   * @param adId - ID do anúncio (opcional - se não informado, salva como nível de ad set ou campanha)
   */
  private async saveMetrics(
    connectionId: string,
    campaignId: string,
    insight: any,
    adSetId?: string,
    adId?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Validação básica dos dados de entrada
    if (!insight.date_start) {
      throw new Error('Métrica sem data - campo date_start ausente');
    }

    // Determina o nível da métrica para logs
    const level = adId ? 'ad' : adSetId ? 'adset' : 'campaign';

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
      level,
      campaignId,
      adSetId: adSetId || null,
      adId: adId || null,
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
    // A query varia dependendo do nível (campanha, ad set ou anúncio)
    let existingQuery = supabase
      .from('ad_metrics')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('date', insight.date_start);

    // Adiciona filtros para ad_set_id e ad_id conforme o nível
    if (adId) {
      existingQuery = existingQuery.eq('ad_set_id', adSetId).eq('ad_id', adId);
    } else if (adSetId) {
      existingQuery = existingQuery.eq('ad_set_id', adSetId).is('ad_id', null);
    } else {
      existingQuery = existingQuery.is('ad_set_id', null).is('ad_id', null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

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
        level,
        campaignId,
        adSetId: adSetId || null,
        adId: adId || null,
        date: insight.date_start,
        userId: user.id,
        connectionId
      });

      // Prepara objeto para inserção com os IDs corretos
      const insertData: Record<string, any> = {
        connection_id: connectionId,
        user_id: user.id,
        workspace_id: this.workspaceId,
        client_id: this.clientId,
        campaign_id: campaignId,
        date: insight.date_start,
        ...metricsData,
      };

      // Adiciona ad_set_id e ad_id se fornecidos
      if (adSetId) {
        insertData.ad_set_id = adSetId;
      }
      if (adId) {
        insertData.ad_id = adId;
      }

      const { data: insertedData, error } = await supabase
        .from('ad_metrics')
        .insert(insertData)
        .select();

      if (error) {
        logger.error('Erro ao inserir métrica', {
          level,
          campaignId,
          adSetId: adSetId || null,
          adId: adId || null,
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
          level,
          campaignId,
          adSetId: adSetId || null,
          adId: adId || null,
          date: insight.date_start
        });
        throw new Error('Falha ao confirmar inserção da métrica no banco');
      }

      logger.info('Métrica inserida com sucesso', {
        metricId: insertedData[0].id,
        level,
        campaignId,
        adSetId: adSetId || null,
        adId: adId || null,
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
