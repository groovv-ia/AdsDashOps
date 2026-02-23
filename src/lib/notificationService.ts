import { supabase } from './supabase';
import { Notification as AppNotification, NotificationSettings, NotificationRule } from '../types/notifications';

export class NotificationService {
  private static instance: NotificationService;
  private eventSource: EventSource | null = null;
  private listeners: ((notification: AppNotification) => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Real-time notifications setup
  async initializeRealTime() {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        console.warn('Supabase não configurado - notificações em tempo real desabilitadas');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const notification = payload.new as AppNotification;
            this.handleNewNotification(notification);
          }
        )
        .subscribe();

      // Request desktop notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      return channel;
    } catch (error) {
      console.error('Erro ao inicializar notificações em tempo real:', error);
    }
  }

  // Handle new notification
  private async handleNewNotification(notification: AppNotification) {
    // Notify all listeners
    this.listeners.forEach(listener => listener(notification));

    // Show desktop notification if enabled
    const settings = await this.getSettings();
    if (settings?.desktop_notifications && this.shouldShowNotification(notification, settings)) {
      this.showDesktopNotification(notification);
    }

    // Play notification sound
    this.playNotificationSound(notification.priority);
  }

  // Add notification listener
  addListener(callback: (notification: AppNotification) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Get user notifications
  async getNotifications(limit = 50, offset = 0): Promise<AppNotification[]> {
    try {
      // Check if Supabase is configured
      if (!supabase) {
        console.warn('Supabase não configurado - retornando notificações vazias');
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      // Check if Supabase is configured
      if (!supabase) {
        console.warn('Supabase não configurado - retornando contagem 0');
        return 0;
      }

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar contagem de não lidas:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        console.warn('Supabase não configurado - operação não disponível');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }

  // Create notification
  async createNotification(notification: Omit<AppNotification, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        console.warn('Supabase não configurado - operação não disponível');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: user.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  }

  // Get notification settings
  async getSettings(): Promise<NotificationSettings | null> {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        console.warn('Supabase não configurado - operação não disponível');
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Return the first settings record if it exists, otherwise null
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return null;
    }
  }

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      // Verificar se o Supabase está configurado
      if (!supabase) {
        console.warn('Supabase não configurado - operação não disponível');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          ...settings,
          user_id: user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  }

  // Show desktop notification
  private showDesktopNotification(notification: AppNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/fav-icon.fw.png',
        badge: '/fav-icon.fw.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: notification.priority === 'low'
      });

      desktopNotification.onclick = () => {
        window.focus();
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
        desktopNotification.close();
      };

      // Auto close after 5 seconds for non-urgent notifications
      if (notification.priority !== 'urgent') {
        setTimeout(() => desktopNotification.close(), 5000);
      }
    }
  }

  // Play notification sound
  private playNotificationSound(priority: string) {
    try {
      const audio = new Audio();
      switch (priority) {
        case 'urgent':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
          break;
        case 'high':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
          break;
        default:
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      }
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      // Ignore audio errors
    }
  }

  // Check if notification should be shown based on settings
  private shouldShowNotification(notification: AppNotification, settings: NotificationSettings): boolean {
    // Check if category is enabled
    if (!settings.categories[notification.category]) {
      return false;
    }

    // Check quiet hours
    if (settings.quiet_hours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = this.parseTime(settings.quiet_hours.start_time);
      const endTime = this.parseTime(settings.quiet_hours.end_time);

      if (startTime <= endTime) {
        // Same day quiet hours
        if (currentTime >= startTime && currentTime <= endTime) {
          return notification.priority === 'urgent';
        }
      } else {
        // Overnight quiet hours
        if (currentTime >= startTime || currentTime <= endTime) {
          return notification.priority === 'urgent';
        }
      }
    }

    return true;
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

// Notification monitoring service
export class NotificationMonitoringService {
  private static instance: NotificationMonitoringService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private notificationService = NotificationService.getInstance();

  static getInstance(): NotificationMonitoringService {
    if (!NotificationMonitoringService.instance) {
      NotificationMonitoringService.instance = new NotificationMonitoringService();
    }
    return NotificationMonitoringService.instance;
  }

  // Start monitoring
  startMonitoring() {
    if (this.monitoringInterval) return;

    // Verifica expiracao de tokens a cada 6 horas
    const TOKEN_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
    setInterval(() => {
      this.checkTokenExpiry();
    }, TOKEN_CHECK_INTERVAL);

    // Check every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.checkCampaignPerformance();
      this.checkBudgetAlerts();
      this.checkSyncStatus();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkCampaignPerformance();
    this.checkBudgetAlerts();
    this.checkSyncStatus();
    // Verifica tokens na inicializacao
    this.checkTokenExpiry();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Check campaign performance
  private async checkCampaignPerformance() {
    try {
      const settings = await this.notificationService.getSettings();
      if (!settings) return;

      // Get recent metrics
      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select(`
          *,
          campaigns!inner(name, platform)
        `)
        .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!metrics) return;

      // Group by campaign and check for performance drops
      const campaignMetrics = this.groupMetricsByCampaign(metrics);

      for (const [campaignId, campaignData] of Object.entries(campaignMetrics)) {
        await this.checkPerformanceDrops(campaignId, campaignData, settings);
      }
    } catch (error) {
      console.error('Erro ao verificar performance das campanhas:', error);
    }
  }

  // Check budget alerts
  private async checkBudgetAlerts() {
    try {
      const settings = await this.notificationService.getSettings();
      if (!settings) return;

      // Get campaigns with budget data
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select(`
          *,
          ad_sets!inner(daily_budget, lifetime_budget),
          ad_metrics!inner(spend, date)
        `)
        .gte('ad_metrics.date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (!campaigns) return;

      for (const campaign of campaigns) {
        await this.checkBudgetThresholds(campaign, settings);
      }
    } catch (error) {
      console.error('Erro ao verificar alertas de orçamento:', error);
    }
  }

  // Check sync status
  private async checkSyncStatus() {
    try {
      const { data: connections } = await supabase
        .from('data_connections')
        .select('*')
        .eq('status', 'error');

      if (!connections) return;

      for (const connection of connections) {
        await this.notificationService.createNotification({
          title: 'Erro de Sincronização',
          message: `Falha na sincronização da fonte ${connection.name}. Verifique as configurações.`,
          type: 'error',
          category: 'sync',
          priority: 'high',
          read: false,
          action_url: '/data-sources',
          action_label: 'Verificar Fonte',
          metadata: {
            connection_id: connection.id,
            platform: connection.platform
          }
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status de sincronização:', error);
    }
  }

  private groupMetricsByCampaign(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.campaign_id]) {
        acc[metric.campaign_id] = [];
      }
      acc[metric.campaign_id].push(metric);
      return acc;
    }, {});
  }

  private async checkPerformanceDrops(campaignId: string, metrics: any[], settings: NotificationSettings) {
    if (metrics.length < 2) return;

    const latest = metrics[0];
    const previous = metrics[1];

    // Check CTR drop
    if (previous.ctr > 0) {
      const ctrDrop = ((previous.ctr - latest.ctr) / previous.ctr) * 100;
      if (ctrDrop >= settings.thresholds.ctr_drop_percentage) {
        await this.notificationService.createNotification({
          title: 'Queda no CTR Detectada',
          message: `CTR da campanha ${latest.campaigns.name} caiu ${ctrDrop.toFixed(1)}% nas últimas 24h`,
          type: 'warning',
          category: 'performance',
          priority: 'medium',
          read: false,
          metadata: {
            campaign_id: campaignId,
            platform: latest.campaigns.platform,
            metric_value: latest.ctr,
            previous_value: previous.ctr,
            drop_percentage: ctrDrop
          }
        });
      }
    }

    // Check ROAS drop
    if (previous.roas > 0) {
      const roasDrop = ((previous.roas - latest.roas) / previous.roas) * 100;
      if (roasDrop >= settings.thresholds.roas_drop_percentage) {
        await this.notificationService.createNotification({
          title: 'Queda no ROAS Detectada',
          message: `ROAS da campanha ${latest.campaigns.name} caiu ${roasDrop.toFixed(1)}% nas últimas 24h`,
          type: 'warning',
          category: 'performance',
          priority: 'high',
          read: false,
          metadata: {
            campaign_id: campaignId,
            platform: latest.campaigns.platform,
            metric_value: latest.roas,
            previous_value: previous.roas,
            drop_percentage: roasDrop
          }
        });
      }
    }
  }

  private async checkBudgetThresholds(campaign: any, settings: NotificationSettings) {
    const totalSpend = campaign.ad_metrics.reduce((sum: number, metric: any) => sum + metric.spend, 0);
    const totalBudget = campaign.ad_sets.reduce((sum: number, adSet: any) =>
      sum + (adSet.daily_budget || adSet.lifetime_budget || 0), 0
    );

    if (totalBudget > 0) {
      const spendPercentage = (totalSpend / totalBudget) * 100;

      if (spendPercentage >= settings.thresholds.budget_alert_percentage) {
        await this.notificationService.createNotification({
          title: 'Alerta de Orçamento',
          message: `Campanha ${campaign.name} utilizou ${spendPercentage.toFixed(1)}% do orçamento`,
          type: spendPercentage >= 90 ? 'error' : 'warning',
          category: 'budget',
          priority: spendPercentage >= 90 ? 'urgent' : 'high',
          read: false,
          metadata: {
            campaign_id: campaign.id,
            platform: campaign.platform,
            spend_percentage: spendPercentage,
            total_spend: totalSpend,
            total_budget: totalBudget
          }
        });
      }
    }
  }

  // Verifica expiracao de tokens das conexoes Meta e Google
  async checkTokenExpiry() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca conexoes Meta do workspace do usuario
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!workspace) return;

      const { data: metaConnections } = await supabase
        .from('meta_connections')
        .select('id, token_expires_at, updated_at, status')
        .eq('workspace_id', workspace.id);

      if (!metaConnections || metaConnections.length === 0) return;

      for (const connection of metaConnections) {
        // Pula conexoes ja marcadas como expiradas permanentemente
        if (connection.status === 'token_expired') {
          await this.notificationService.createNotification({
            title: 'Reconexao Meta Ads Necessaria',
            message: 'Seu acesso ao Meta Ads expirou e precisa ser renovado manualmente. Acesse Configuracoes > Conexoes para reconectar.',
            type: 'error',
            category: 'sync',
            priority: 'urgent',
            read: false,
            action_url: '/meta-admin',
            action_label: 'Reconectar Meta Ads',
            metadata: { connection_id: connection.id, platform: 'meta', reason: 'token_permanently_expired' }
          });
          continue;
        }

        // Calcula dias restantes usando token_expires_at ou estimativa por updated_at
        const expiresAtStr = connection.token_expires_at ||
          (connection.updated_at
            ? new Date(new Date(connection.updated_at).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
            : null);

        if (!expiresAtStr) continue;

        const expiresAt = new Date(expiresAtStr);
        const now = new Date();
        const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Token ja expirado
        if (daysRemaining <= 0) {
          await this.notificationService.createNotification({
            title: 'Token Meta Ads Expirado',
            message: 'Seu token de acesso ao Meta Ads expirou. A sincronizacao sera realizada automaticamente ao proximo ciclo, ou voce pode tentar manualmente.',
            type: 'error',
            category: 'sync',
            priority: 'high',
            read: false,
            action_url: '/meta-admin',
            action_label: 'Verificar Sincronizacao',
            metadata: { connection_id: connection.id, platform: 'meta', days_remaining: daysRemaining }
          });
        } else if (daysRemaining <= 7) {
          // Token expirando em breve
          await this.notificationService.createNotification({
            title: 'Token Meta Ads Expirando em Breve',
            message: `Seu token de acesso ao Meta Ads expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}. A renovacao automatica sera tentada na proxima sincronizacao.`,
            type: 'warning',
            category: 'sync',
            priority: 'medium',
            read: false,
            action_url: '/meta-admin',
            action_label: 'Ir para Sincronizacao',
            metadata: { connection_id: connection.id, platform: 'meta', days_remaining: daysRemaining }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar expiracao de tokens:', error);
    }
  }
}