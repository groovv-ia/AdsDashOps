/**
 * GoogleSyncService
 *
 * Servico responsavel pela sincronizacao de dados do Google Ads.
 * Busca campanhas, grupos de anuncios, anuncios e metricas diarias
 * da API do Google Ads e salva no banco de dados Supabase.
 */

import { supabase } from '../supabase';
import type {
  GoogleAdAccount,
  GoogleSyncJob,
  GoogleInsightsDaily,
  SyncProgressCallback,
  GoogleSyncResult,
} from '../connectors/google/types';

// ============================================
// Constantes
// ============================================

// Limite de requisicoes por dia (Google Ads API)
const DAILY_REQUEST_LIMIT = 15000;

// Delay entre requisicoes (ms) para evitar rate limiting
const REQUEST_DELAY_MS = 200;

// Numero de tentativas em caso de erro
const MAX_RETRIES = 3;

// Delay entre tentativas (ms)
const RETRY_DELAY_MS = 1000;

// ============================================
// Classe Principal
// ============================================

export class GoogleSyncService {
  private workspaceId: string;
  private developerToken: string;
  private loginCustomerId?: string;
  private requestCount: number = 0;

  constructor(
    workspaceId: string,
    developerToken: string,
    loginCustomerId?: string
  ) {
    this.workspaceId = workspaceId;
    this.developerToken = developerToken;
    this.loginCustomerId = loginCustomerId;
  }

  // ============================================
  // Metodo Principal de Sincronizacao
  // ============================================

  /**
   * Executa sincronizacao completa de uma ou mais contas
   * @param accounts - Lista de contas para sincronizar
   * @param dateFrom - Data inicial do periodo
   * @param dateTo - Data final do periodo
   * @param onProgress - Callback de progresso
   */
  async syncAccounts(
    accounts: GoogleAdAccount[],
    dateFrom: string,
    dateTo: string,
    onProgress?: SyncProgressCallback
  ): Promise<GoogleSyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalCampaigns = 0;
    let totalAdGroups = 0;
    let totalAds = 0;
    let totalMetrics = 0;
    let accountsSynced = 0;

    // Filtra apenas contas selecionadas
    const selectedAccounts = accounts.filter((acc) => acc.is_selected);

    if (selectedAccounts.length === 0) {
      return {
        success: false,
        accounts_synced: 0,
        campaigns_synced: 0,
        ad_groups_synced: 0,
        ads_synced: 0,
        metrics_synced: 0,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        errors: ['Nenhuma conta selecionada para sincronizacao'],
        duration_ms: Date.now() - startTime,
      };
    }

    // Cria job de sincronizacao
    const jobId = await this.createSyncJob(dateFrom, dateTo, selectedAccounts.length);

    try {
      // Processa cada conta
      for (let i = 0; i < selectedAccounts.length; i++) {
        const account = selectedAccounts[i];
        const accountProgress = Math.round(((i + 1) / selectedAccounts.length) * 100);

        onProgress?.({
          phase: `Sincronizando conta ${i + 1} de ${selectedAccounts.length}`,
          percentage: accountProgress,
          itemsProcessed: i,
          itemsTotal: selectedAccounts.length,
          message: `Processando: ${account.name}`,
        });

        try {
          // Sincroniza a conta individual
          const result = await this.syncSingleAccount(
            account,
            dateFrom,
            dateTo,
            jobId,
            (subProgress) => {
              onProgress?.({
                phase: subProgress.phase,
                percentage: Math.round(
                  (i / selectedAccounts.length) * 100 +
                    (subProgress.percentage / selectedAccounts.length)
                ),
                itemsProcessed: subProgress.itemsProcessed,
                itemsTotal: subProgress.itemsTotal,
                message: `${account.name}: ${subProgress.message}`,
              });
            }
          );

          totalCampaigns += result.campaigns;
          totalAdGroups += result.adGroups;
          totalAds += result.ads;
          totalMetrics += result.metrics;
          accountsSynced++;

          // Atualiza last_sync_at da conta
          await supabase
            .from('google_ad_accounts')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', account.id);
        } catch (accountError) {
          const errorMsg =
            accountError instanceof Error ? accountError.message : 'Erro desconhecido';
          errors.push(`${account.name}: ${errorMsg}`);
          console.error(`Erro ao sincronizar conta ${account.name}:`, accountError);
        }

        // Delay entre contas
        await this.delay(REQUEST_DELAY_MS);
      }

      // Atualiza job como concluido
      await this.updateSyncJob(jobId, {
        status: errors.length > 0 ? 'completed' : 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        campaigns_synced: totalCampaigns,
        ad_groups_synced: totalAdGroups,
        ads_synced: totalAds,
        metrics_synced: totalMetrics,
        error_message: errors.length > 0 ? errors.join('; ') : null,
      });

      onProgress?.({
        phase: 'Sincronizacao concluida',
        percentage: 100,
        itemsProcessed: selectedAccounts.length,
        itemsTotal: selectedAccounts.length,
        message: `${accountsSynced} conta(s) sincronizada(s)`,
      });

      return {
        success: errors.length === 0,
        accounts_synced: accountsSynced,
        campaigns_synced: totalCampaigns,
        ad_groups_synced: totalAdGroups,
        ads_synced: totalAds,
        metrics_synced: totalMetrics,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        errors,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

      // Atualiza job como falho
      await this.updateSyncJob(jobId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMsg,
      });

      return {
        success: false,
        accounts_synced: accountsSynced,
        campaigns_synced: totalCampaigns,
        ad_groups_synced: totalAdGroups,
        ads_synced: totalAds,
        metrics_synced: totalMetrics,
        date_range_start: dateFrom,
        date_range_end: dateTo,
        errors: [...errors, errorMsg],
        duration_ms: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // Sincronizacao de Conta Individual
  // ============================================

  /**
   * Sincroniza uma unica conta
   */
  private async syncSingleAccount(
    account: GoogleAdAccount,
    dateFrom: string,
    dateTo: string,
    jobId: string,
    onProgress?: SyncProgressCallback
  ): Promise<{
    campaigns: number;
    adGroups: number;
    ads: number;
    metrics: number;
  }> {
    let campaigns = 0;
    let adGroups = 0;
    let ads = 0;
    let metrics = 0;

    // Fase 1: Buscar campanhas
    onProgress?.({
      phase: 'Buscando campanhas',
      percentage: 10,
      itemsProcessed: 0,
      itemsTotal: 0,
      message: 'Carregando campanhas...',
    });

    const campaignsData = await this.fetchCampaigns(account.customer_id);
    campaigns = campaignsData.length;

    // Fase 2: Buscar grupos de anuncios
    onProgress?.({
      phase: 'Buscando grupos de anuncios',
      percentage: 30,
      itemsProcessed: campaigns,
      itemsTotal: campaigns,
      message: `${campaigns} campanhas encontradas`,
    });

    const adGroupsData = await this.fetchAdGroups(account.customer_id);
    adGroups = adGroupsData.length;

    // Fase 3: Buscar anuncios
    onProgress?.({
      phase: 'Buscando anuncios',
      percentage: 50,
      itemsProcessed: adGroups,
      itemsTotal: adGroups,
      message: `${adGroups} grupos encontrados`,
    });

    const adsData = await this.fetchAds(account.customer_id);
    ads = adsData.length;

    // Fase 4: Buscar metricas
    onProgress?.({
      phase: 'Buscando metricas',
      percentage: 70,
      itemsProcessed: ads,
      itemsTotal: ads,
      message: `${ads} anuncios encontrados`,
    });

    const metricsData = await this.fetchInsights(
      account.customer_id,
      dateFrom,
      dateTo,
      campaignsData,
      adGroupsData
    );
    metrics = metricsData.length;

    // Fase 5: Salvar metricas no banco
    onProgress?.({
      phase: 'Salvando metricas',
      percentage: 90,
      itemsProcessed: metrics,
      itemsTotal: metrics,
      message: `Salvando ${metrics} registros...`,
    });

    await this.saveInsights(account, metricsData);

    // Atualiza job com progresso
    await this.updateSyncJob(jobId, {
      items_processed:
        (
          await supabase
            .from('google_sync_jobs')
            .select('items_processed')
            .eq('id', jobId)
            .single()
        ).data?.items_processed || 0 + 1,
    });

    onProgress?.({
      phase: 'Conta sincronizada',
      percentage: 100,
      itemsProcessed: metrics,
      itemsTotal: metrics,
      message: 'Concluido',
    });

    return { campaigns, adGroups, ads, metrics };
  }

  // ============================================
  // Metodos de Busca de Dados
  // ============================================

  /**
   * Busca campanhas da conta
   * TODO: Implementar chamada real a API do Google Ads
   */
  private async fetchCampaigns(
    customerId: string
  ): Promise<Array<{ id: string; name: string; status: string }>> {
    await this.checkRateLimit();

    // Simula dados de campanhas para desenvolvimento
    // Em producao, fazer chamada real a API usando GAQL:
    // SELECT campaign.id, campaign.name, campaign.status
    // FROM campaign WHERE campaign.status != 'REMOVED'

    console.log(`[GoogleSync] Buscando campanhas para customer: ${customerId}`);

    // Retorna dados simulados
    return [
      { id: '123456789', name: 'Campanha Principal', status: 'ENABLED' },
      { id: '987654321', name: 'Campanha Remarketing', status: 'ENABLED' },
    ];
  }

  /**
   * Busca grupos de anuncios da conta
   * TODO: Implementar chamada real a API do Google Ads
   */
  private async fetchAdGroups(
    customerId: string
  ): Promise<Array<{ id: string; campaignId: string; name: string; status: string }>> {
    await this.checkRateLimit();

    console.log(`[GoogleSync] Buscando ad groups para customer: ${customerId}`);

    // Retorna dados simulados
    return [
      {
        id: 'ag_001',
        campaignId: '123456789',
        name: 'Grupo Principal',
        status: 'ENABLED',
      },
      {
        id: 'ag_002',
        campaignId: '987654321',
        name: 'Grupo Remarketing',
        status: 'ENABLED',
      },
    ];
  }

  /**
   * Busca anuncios da conta
   * TODO: Implementar chamada real a API do Google Ads
   */
  private async fetchAds(
    customerId: string
  ): Promise<Array<{ id: string; adGroupId: string; campaignId: string; status: string }>> {
    await this.checkRateLimit();

    console.log(`[GoogleSync] Buscando ads para customer: ${customerId}`);

    // Retorna dados simulados
    return [
      { id: 'ad_001', adGroupId: 'ag_001', campaignId: '123456789', status: 'ENABLED' },
      { id: 'ad_002', adGroupId: 'ag_002', campaignId: '987654321', status: 'ENABLED' },
    ];
  }

  /**
   * Busca metricas de performance do periodo
   * TODO: Implementar chamada real a API do Google Ads
   */
  private async fetchInsights(
    customerId: string,
    dateFrom: string,
    dateTo: string,
    campaigns: Array<{ id: string; name: string }>,
    adGroups: Array<{ id: string; campaignId: string; name: string }>
  ): Promise<
    Array<{
      date: string;
      campaignId: string;
      campaignName: string;
      adGroupId?: string;
      adGroupName?: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionValue: number;
    }>
  > {
    await this.checkRateLimit();

    console.log(
      `[GoogleSync] Buscando insights para customer: ${customerId}, periodo: ${dateFrom} a ${dateTo}`
    );

    // Gera dados simulados para cada dia do periodo
    const insights: Array<{
      date: string;
      campaignId: string;
      campaignName: string;
      adGroupId?: string;
      adGroupName?: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionValue: number;
    }> = [];

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Gera metricas para cada campanha
      for (const campaign of campaigns) {
        // Metricas agregadas no nivel de campanha
        const impressions = Math.floor(Math.random() * 10000) + 1000;
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
        const cost = clicks * (Math.random() * 2 + 0.5);
        const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.01));
        const conversionValue = conversions * (Math.random() * 100 + 50);

        insights.push({
          date: dateStr,
          campaignId: campaign.id,
          campaignName: campaign.name,
          impressions,
          clicks,
          cost,
          conversions,
          conversionValue,
        });

        // Metricas no nivel de ad group
        const campaignAdGroups = adGroups.filter((ag) => ag.campaignId === campaign.id);
        for (const adGroup of campaignAdGroups) {
          const agImpressions = Math.floor(impressions * (Math.random() * 0.5 + 0.1));
          const agClicks = Math.floor(agImpressions * (Math.random() * 0.05 + 0.01));
          const agCost = agClicks * (Math.random() * 2 + 0.5);
          const agConversions = Math.floor(agClicks * (Math.random() * 0.1 + 0.01));
          const agConversionValue = agConversions * (Math.random() * 100 + 50);

          insights.push({
            date: dateStr,
            campaignId: campaign.id,
            campaignName: campaign.name,
            adGroupId: adGroup.id,
            adGroupName: adGroup.name,
            impressions: agImpressions,
            clicks: agClicks,
            cost: agCost,
            conversions: agConversions,
            conversionValue: agConversionValue,
          });
        }
      }
    }

    return insights;
  }

  // ============================================
  // Metodos de Persistencia
  // ============================================

  /**
   * Salva insights no banco de dados
   */
  private async saveInsights(
    account: GoogleAdAccount,
    insights: Array<{
      date: string;
      campaignId: string;
      campaignName: string;
      adGroupId?: string;
      adGroupName?: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionValue: number;
    }>
  ): Promise<void> {
    // Processa em lotes para evitar timeout
    const batchSize = 100;

    for (let i = 0; i < insights.length; i += batchSize) {
      const batch = insights.slice(i, i + batchSize);

      const records: Partial<GoogleInsightsDaily>[] = batch.map((insight) => {
        // Calcula metricas derivadas
        const ctr =
          insight.impressions > 0 ? (insight.clicks / insight.impressions) * 100 : 0;
        const cpc = insight.clicks > 0 ? insight.cost / insight.clicks : 0;
        const cpm = insight.impressions > 0 ? (insight.cost / insight.impressions) * 1000 : 0;
        const roas = insight.cost > 0 ? insight.conversionValue / insight.cost : 0;

        return {
          workspace_id: this.workspaceId,
          account_id: account.id,
          customer_id: account.customer_id,
          campaign_id: insight.campaignId,
          campaign_name: insight.campaignName,
          ad_group_id: insight.adGroupId || null,
          ad_group_name: insight.adGroupName || null,
          date: insight.date,
          impressions: insight.impressions,
          clicks: insight.clicks,
          cost: insight.cost,
          conversions: insight.conversions,
          conversion_value: insight.conversionValue,
          ctr,
          cpc,
          cpm,
          roas,
        };
      });

      // Upsert para evitar duplicatas
      const { error } = await supabase.from('google_insights_daily').upsert(records, {
        onConflict: 'workspace_id,customer_id,campaign_id,ad_group_id,date',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error('[GoogleSync] Erro ao salvar insights:', error);
        throw new Error(`Erro ao salvar metricas: ${error.message}`);
      }

      // Delay entre batches
      if (i + batchSize < insights.length) {
        await this.delay(100);
      }
    }
  }

  /**
   * Cria um novo job de sincronizacao
   */
  private async createSyncJob(
    dateFrom: string,
    dateTo: string,
    accountsCount: number
  ): Promise<string> {
    const { data, error } = await supabase
      .from('google_sync_jobs')
      .insert({
        workspace_id: this.workspaceId,
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 0,
        current_phase: 'Iniciando sincronizacao',
        items_processed: 0,
        items_total: accountsCount,
        sync_type: 'full',
        date_range_start: dateFrom,
        date_range_end: dateTo,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Erro ao criar job de sincronizacao: ${error?.message}`);
    }

    return data.id;
  }

  /**
   * Atualiza job de sincronizacao
   */
  private async updateSyncJob(
    jobId: string,
    updates: Partial<GoogleSyncJob>
  ): Promise<void> {
    const { error } = await supabase
      .from('google_sync_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error('[GoogleSync] Erro ao atualizar job:', error);
    }
  }

  // ============================================
  // Metodos Auxiliares
  // ============================================

  /**
   * Verifica rate limit antes de fazer requisicao
   */
  private async checkRateLimit(): Promise<void> {
    this.requestCount++;

    if (this.requestCount >= DAILY_REQUEST_LIMIT) {
      throw new Error('Limite diario de requisicoes atingido (15.000)');
    }

    // Adiciona delay entre requisicoes
    await this.delay(REQUEST_DELAY_MS);
  }

  /**
   * Delay assinciono
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executa funcao com retry automatico
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido');
        console.warn(
          `[GoogleSync] ${operation} falhou (tentativa ${attempt}/${MAX_RETRIES}):`,
          lastError.message
        );

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError || new Error(`${operation} falhou apos ${MAX_RETRIES} tentativas`);
  }
}

// ============================================
// Funcoes Auxiliares Exportadas
// ============================================

/**
 * Cria instancia do servico de sincronizacao
 */
export async function createGoogleSyncService(): Promise<GoogleSyncService | null> {
  try {
    // Obtem conexao do workspace atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Busca workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!workspace) {
      // Tenta como membro
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) return null;

      const workspaceId = membership.workspace_id;

      // Busca conexao
      const { data: connection } = await supabase
        .from('google_connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!connection) return null;

      return new GoogleSyncService(
        workspaceId,
        connection.developer_token,
        connection.login_customer_id
      );
    }

    // Busca conexao
    const { data: connection } = await supabase
      .from('google_connections')
      .select('*')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (!connection) return null;

    return new GoogleSyncService(
      workspace.id,
      connection.developer_token,
      connection.login_customer_id
    );
  } catch (error) {
    console.error('[GoogleSync] Erro ao criar servico:', error);
    return null;
  }
}

/**
 * Executa sincronizacao rapida (ultimos 7 dias)
 */
export async function runQuickSync(
  accountIds?: string[],
  onProgress?: SyncProgressCallback
): Promise<GoogleSyncResult> {
  const service = await createGoogleSyncService();
  if (!service) {
    return {
      success: false,
      accounts_synced: 0,
      campaigns_synced: 0,
      ad_groups_synced: 0,
      ads_synced: 0,
      metrics_synced: 0,
      date_range_start: '',
      date_range_end: '',
      errors: ['Servico de sincronizacao nao disponivel'],
      duration_ms: 0,
    };
  }

  // Busca contas
  const { data: accounts } = await supabase
    .from('google_ad_accounts')
    .select('*')
    .eq('is_selected', true);

  if (!accounts || accounts.length === 0) {
    return {
      success: false,
      accounts_synced: 0,
      campaigns_synced: 0,
      ad_groups_synced: 0,
      ads_synced: 0,
      metrics_synced: 0,
      date_range_start: '',
      date_range_end: '',
      errors: ['Nenhuma conta selecionada'],
      duration_ms: 0,
    };
  }

  // Filtra por IDs se especificado
  const targetAccounts = accountIds
    ? accounts.filter((acc) => accountIds.includes(acc.id))
    : accounts;

  // Define periodo (ultimos 7 dias)
  const dateTo = new Date().toISOString().split('T')[0];
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return service.syncAccounts(targetAccounts, dateFrom, dateTo, onProgress);
}
