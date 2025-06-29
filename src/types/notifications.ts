export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'campaign' | 'budget' | 'performance';
  category: 'system' | 'campaign' | 'budget' | 'performance' | 'sync' | 'security';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  action_url?: string;
  action_label?: string;
  metadata?: {
    campaign_id?: string;
    platform?: string;
    metric_value?: number;
    threshold?: number;
    [key: string]: any;
  };
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  desktop_notifications: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  categories: {
    system: boolean;
    campaign: boolean;
    budget: boolean;
    performance: boolean;
    sync: boolean;
    security: boolean;
  };
  thresholds: {
    budget_alert_percentage: number;
    performance_drop_percentage: number;
    spend_increase_percentage: number;
    ctr_drop_percentage: number;
    roas_drop_percentage: number;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
  created_at: string;
  updated_at: string;
}

export interface NotificationRule {
  id: string;
  user_id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_type: 'budget' | 'performance' | 'schedule' | 'anomaly';
  conditions: {
    metric: string;
    operator: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
    value: number;
    timeframe?: string;
  }[];
  actions: {
    type: 'notification' | 'email' | 'webhook';
    config: any;
  }[];
  platforms?: string[];
  campaigns?: string[];
  created_at: string;
  updated_at: string;
}