import { supabase } from '../supabase';
import { logger } from '../utils/logger';
import { MetaAdsService } from '../connectors/meta/MetaAdsService';
import { GoogleAdsService } from '../connectors/google/GoogleAdsService';
import { Campaign, AdSet, Ad, AdMetrics, SyncJob, SyncResult } from '../connectors/shared/types';
import { extractMetricsFromInsight, validateExtractedMetrics, MetaInsightsRaw } from '../utils/metaMetricsExtractor';

export class DataSyncService {
  private metaService: MetaAdsService;
  private googleService: GoogleAdsService;

  constructor() {
    this.metaService = new MetaAdsService();
    this.googleService = new GoogleAdsService();
  }

  async syncConnection(
    connectionId: string,
    platform: 'meta' | 'google',
    accountId: string,
    syncType: 'full' | 'incremental' | 'manual' = 'manual'
  ): Promise<SyncResult> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const jobId = await this.createSyncJob(connectionId, userData.user.id, platform, syncType);
    const startTime = Date.now();

    try {
      logger.syncStart(platform, connectionId, syncType);

      await this.updateSyncJobStatus(jobId, 'running', new Date().toISOString());

      let recordsSynced = {
        campaigns: 0,
        adSets: 0,
        ads: 0,
        metrics: 0,
      };

      if (platform === 'meta') {
        recordsSynced = await this.syncMetaData(connectionId, accountId);
      } else if (platform === 'google') {
        recordsSynced = await this.syncGoogleData(connectionId, accountId);
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      await this.updateSyncJobStatus(
        jobId,
        'completed',
        undefined,
        new Date().toISOString(),
        recordsSynced,
        duration
      );

      await this.updateConnectionStatus(connectionId, 'connected', new Date().toISOString());

      logger.syncComplete(platform, connectionId, recordsSynced, duration);

      return {
        success: true,
        recordsSynced,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncJobStatus(
        jobId,
        'failed',
        undefined,
        new Date().toISOString(),
        undefined,
        undefined,
        [{ message: errorMessage, timestamp: new Date().toISOString() }]
      );

      await this.updateConnectionStatus(connectionId, 'error', undefined, errorMessage);

      logger.syncError(platform, connectionId, error as Error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async syncMetaData(connectionId: string, accountId: string): Promise<{
    campaigns: number;
    adSets: number;
    ads: number;
    metrics: number;
  }> {
    let campaignCount = 0;
    let adSetCount = 0;
    let adCount = 0;
    let metricsCount = 0;

    const campaigns = await this.metaService.getCampaigns(connectionId, accountId);
    campaignCount = campaigns.length;

    for (const campaign of campaigns) {
      await supabase.from('campaigns').upsert(campaign, { onConflict: 'id' });

      const adSets = await this.metaService.getAdSets(connectionId, campaign.id);
      adSetCount += adSets.length;

      for (const adSet of adSets) {
        await supabase.from('ad_sets').upsert(adSet, { onConflict: 'id' });

        const ads = await this.metaService.getAds(connectionId, adSet.id);
        adCount += ads.length;

        for (const ad of ads) {
          await supabase.from('ads').upsert(ad, { onConflict: 'id' });
        }

        // Busca insights brutos da API Meta
        const adSetInsights = await this.fetchMetaInsightsRaw(
          connectionId,
          adSet.id,
          'adset',
          this.getDateRange(30).start,
          this.getDateRange(30).end
        );
        metricsCount += adSetInsights.length;

        // Extrai e salva métricas usando helper compartilhado
        for (const insight of adSetInsights) {
          const extractedMetrics = extractMetricsFromInsight(insight);

          // Valida métricas antes de salvar
          const warnings = validateExtractedMetrics(extractedMetrics);
          if (warnings.length > 0) {
            logger.warn('Avisos ao validar métricas do ad set', { adSetId: adSet.id, warnings });
          }

          await supabase.from('ad_metrics').upsert(
            {
              connection_id: connectionId,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              campaign_id: campaign.id,
              ad_set_id: adSet.id,
              ad_id: null,
              date: insight.date_start,
              ...extractedMetrics,
            },
            { onConflict: 'campaign_id,ad_set_id,ad_id,date' }
          );
        }
      }

      // Busca insights brutos da campanha
      const campaignInsights = await this.fetchMetaInsightsRaw(
        connectionId,
        campaign.id,
        'campaign',
        this.getDateRange(30).start,
        this.getDateRange(30).end
      );
      metricsCount += campaignInsights.length;

      // Extrai e salva métricas usando helper compartilhado
      for (const insight of campaignInsights) {
        const extractedMetrics = extractMetricsFromInsight(insight);

        // Valida métricas antes de salvar
        const warnings = validateExtractedMetrics(extractedMetrics);
        if (warnings.length > 0) {
          logger.warn('Avisos ao validar métricas da campanha', { campaignId: campaign.id, warnings });
        }

        await supabase.from('ad_metrics').upsert(
          {
            connection_id: connectionId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            campaign_id: campaign.id,
            ad_set_id: null,
            ad_id: null,
            date: insight.date_start,
            ...extractedMetrics,
          },
          { onConflict: 'campaign_id,ad_set_id,ad_id,date' }
        );
      }
    }

    return {
      campaigns: campaignCount,
      adSets: adSetCount,
      ads: adCount,
      metrics: metricsCount,
    };
  }

  private async syncGoogleData(connectionId: string, customerId: string): Promise<{
    campaigns: number;
    adSets: number;
    ads: number;
    metrics: number;
  }> {
    let campaignCount = 0;
    let adGroupCount = 0;
    let adCount = 0;
    let metricsCount = 0;

    const campaigns = await this.googleService.getCampaigns(connectionId, customerId);
    campaignCount = campaigns.length;

    for (const campaign of campaigns) {
      await supabase.from('campaigns').upsert(campaign, { onConflict: 'id' });

      const adGroups = await this.googleService.getAdGroups(connectionId, customerId, campaign.id);
      adGroupCount += adGroups.length;

      for (const adGroup of adGroups) {
        await supabase.from('ad_sets').upsert(adGroup, { onConflict: 'id' });

        const ads = await this.googleService.getAds(connectionId, customerId, adGroup.id);
        adCount += ads.length;

        for (const ad of ads) {
          await supabase.from('ads').upsert(ad, { onConflict: 'id' });
        }

        const adGroupMetrics = await this.googleService.getMetrics(
          connectionId,
          customerId,
          adGroup.id,
          'ad_group',
          this.getDateRange(30).start,
          this.getDateRange(30).end
        );
        metricsCount += adGroupMetrics.length;

        for (const metric of adGroupMetrics) {
          await supabase.from('ad_metrics').upsert(
            {
              ...metric,
              ad_set_id: adGroup.id,
              campaign_id: campaign.id,
            },
            { onConflict: 'campaign_id,ad_set_id,ad_id,date' }
          );
        }
      }

      const campaignMetrics = await this.googleService.getMetrics(
        connectionId,
        customerId,
        campaign.id,
        'campaign',
        this.getDateRange(30).start,
        this.getDateRange(30).end
      );
      metricsCount += campaignMetrics.length;

      for (const metric of campaignMetrics) {
        await supabase.from('ad_metrics').upsert(
          {
            ...metric,
            campaign_id: campaign.id,
          },
          { onConflict: 'campaign_id,ad_set_id,ad_id,date' }
        );
      }
    }

    return {
      campaigns: campaignCount,
      adSets: adGroupCount,
      ads: adCount,
      metrics: metricsCount,
    };
  }

  private async createSyncJob(
    connectionId: string,
    userId: string,
    platform: string,
    syncType: 'full' | 'incremental' | 'manual'
  ): Promise<string> {
    const { data, error } = await supabase
      .from('sync_jobs')
      .insert({
        connection_id: connectionId,
        user_id: userId,
        platform,
        sync_type: syncType,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async updateSyncJobStatus(
    jobId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
    startedAt?: string,
    completedAt?: string,
    recordsSynced?: { campaigns: number; adSets: number; ads: number; metrics: number },
    durationSeconds?: number,
    errors?: Array<{ message: string; timestamp: string }>
  ): Promise<void> {
    const updateData: any = { status };

    if (startedAt) updateData.started_at = startedAt;
    if (completedAt) updateData.completed_at = completedAt;
    if (recordsSynced) {
      updateData.records_synced = {
        campaigns: recordsSynced.campaigns,
        ad_sets: recordsSynced.adSets,
        ads: recordsSynced.ads,
        metrics: recordsSynced.metrics,
      };
    }
    if (durationSeconds !== undefined) updateData.duration_seconds = durationSeconds;
    if (errors) updateData.errors = errors;

    await supabase.from('sync_jobs').update(updateData).eq('id', jobId);
  }

  private async updateConnectionStatus(
    connectionId: string,
    status: 'connected' | 'disconnected' | 'error' | 'syncing',
    lastSync?: string,
    error?: string
  ): Promise<void> {
    const updateData: any = { status };
    if (lastSync) updateData.last_sync = lastSync;
    if (error) updateData.error = error;
    else updateData.error = null;

    await supabase.from('data_connections').update(updateData).eq('id', connectionId);
  }

  /**
   * Busca insights brutos da API Meta (sem processamento)
   * Retorna dados no formato original da API para processamento pelo helper
   *
   * @param connectionId - ID da conexão
   * @param objectId - ID do objeto (campanha, ad set ou anúncio)
   * @param objectType - Tipo do objeto
   * @param dateStart - Data inicial
   * @param dateEnd - Data final
   * @returns Array de insights brutos da API Meta
   */
  private async fetchMetaInsightsRaw(
    connectionId: string,
    objectId: string,
    objectType: 'campaign' | 'adset' | 'ad',
    dateStart: string,
    dateEnd: string
  ): Promise<MetaInsightsRaw[]> {
    try {
      // Busca token de acesso
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('connection_id', connectionId)
        .maybeSingle();

      if (!tokenData?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      const accessToken = tokenData.access_token;

      // Lista completa de campos - ALINHADA com MetaSyncService
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

      // Monta URL da API Meta com time_range corretamente codificado
      const baseUrl = 'https://graph.facebook.com/v19.0';
      const timeRange = encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }));
      const url = `${baseUrl}/${objectId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&level=${objectType}&access_token=${accessToken}`;

      logger.info('Buscando insights da API Meta', { objectId, objectType, dateStart, dateEnd });

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(`Meta API Error: ${data.error.message} (Code: ${data.error.code})`);
      }

      logger.info('Insights recebidos da API Meta', {
        objectId,
        objectType,
        count: data.data?.length || 0,
      });

      return data.data || [];
    } catch (error: any) {
      logger.error('Erro ao buscar insights da API Meta', error, { connectionId, objectId });
      throw error;
    }
  }

  private getDateRange(days: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  async getSyncHistory(connectionId: string, limit: number = 10): Promise<SyncJob[]> {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((job) => ({
      id: job.id,
      connectionId: job.connection_id,
      userId: job.user_id,
      platform: job.platform,
      syncType: job.sync_type,
      status: job.status,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      recordsSynced: job.records_synced,
      errors: job.errors || [],
      durationSeconds: job.duration_seconds,
    }));
  }
}
