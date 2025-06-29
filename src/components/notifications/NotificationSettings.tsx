import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Mail, 
  Monitor, 
  Clock, 
  Shield, 
  TrendingDown,
  DollarSign,
  Zap,
  Database,
  Save,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NotificationSettings } from '../../types/notifications';
import { NotificationService } from '../../lib/notificationService';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await notificationService.getSettings();
      
      if (userSettings) {
        setSettings(userSettings);
      } else {
        // Default settings
        setSettings({
          id: '',
          user_id: '',
          email_notifications: true,
          push_notifications: true,
          desktop_notifications: true,
          notification_frequency: 'immediate',
          categories: {
            system: true,
            campaign: true,
            budget: true,
            performance: true,
            sync: true,
            security: true
          },
          thresholds: {
            budget_alert_percentage: 80,
            performance_drop_percentage: 20,
            spend_increase_percentage: 50,
            ctr_drop_percentage: 25,
            roas_drop_percentage: 30
          },
          quiet_hours: {
            enabled: false,
            start_time: '22:00',
            end_time: '08:00'
          },
          created_at: '',
          updated_at: ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await notificationService.updateSettings(settings);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateCategories = (category: keyof NotificationSettings['categories'], enabled: boolean) => {
    setSettings(prev => prev ? {
      ...prev,
      categories: { ...prev.categories, [category]: enabled }
    } : null);
  };

  const updateThresholds = (threshold: keyof NotificationSettings['thresholds'], value: number) => {
    setSettings(prev => prev ? {
      ...prev,
      thresholds: { ...prev.thresholds, [threshold]: value }
    } : null);
  };

  const updateQuietHours = (updates: Partial<NotificationSettings['quiet_hours']>) => {
    setSettings(prev => prev ? {
      ...prev,
      quiet_hours: { ...prev.quiet_hours, ...updates }
    } : null);
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Configurações de Notificações</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Delivery Methods */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Entrega</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-500">Receber notificações por email</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email_notifications}
                      onChange={(e) => updateSettings({ email_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Monitor className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Desktop</p>
                      <p className="text-sm text-gray-500">Notificações do navegador</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.desktop_notifications}
                      onChange={(e) => updateSettings({ desktop_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Push</p>
                      <p className="text-sm text-gray-500">Notificações push no dispositivo</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.push_notifications}
                      onChange={(e) => updateSettings({ push_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            {/* Frequency */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequência</h3>
              <div className="space-y-3">
                {[
                  { value: 'immediate', label: 'Imediato', description: 'Receber notificações instantaneamente' },
                  { value: 'hourly', label: 'A cada hora', description: 'Resumo das notificações a cada hora' },
                  { value: 'daily', label: 'Diário', description: 'Resumo diário das notificações' },
                  { value: 'weekly', label: 'Semanal', description: 'Resumo semanal das notificações' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value={option.value}
                      checked={settings.notification_frequency === option.value}
                      onChange={(e) => updateSettings({ notification_frequency: e.target.value as any })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* Categories */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorias</h3>
              <div className="space-y-4">
                {[
                  { key: 'system', icon: Shield, label: 'Sistema', description: 'Atualizações e manutenções' },
                  { key: 'campaign', icon: Zap, label: 'Campanhas', description: 'Status e alterações de campanhas' },
                  { key: 'budget', icon: DollarSign, label: 'Orçamento', description: 'Alertas de orçamento e gastos' },
                  { key: 'performance', icon: TrendingDown, label: 'Performance', description: 'Mudanças na performance' },
                  { key: 'sync', icon: Database, label: 'Sincronização', description: 'Status de sincronização de dados' },
                  { key: 'security', icon: Shield, label: 'Segurança', description: 'Alertas de segurança' }
                ].map((category) => (
                  <div key={category.key} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <category.icon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">{category.label}</p>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.categories[category.key as keyof typeof settings.categories]}
                        onChange={(e) => updateCategories(category.key as any, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            {/* Thresholds */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Limites de Alerta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alerta de Orçamento (% utilizado)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.thresholds.budget_alert_percentage}
                    onChange={(e) => updateThresholds('budget_alert_percentage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Queda de Performance (% de redução)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.thresholds.performance_drop_percentage}
                    onChange={(e) => updateThresholds('performance_drop_percentage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Queda de CTR (% de redução)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.thresholds.ctr_drop_percentage}
                    onChange={(e) => updateThresholds('ctr_drop_percentage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Queda de ROAS (% de redução)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.thresholds.roas_drop_percentage}
                    onChange={(e) => updateThresholds('roas_drop_percentage', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </Card>

            {/* Quiet Hours */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Horário Silencioso</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Ativar horário silencioso</p>
                      <p className="text-sm text-gray-500">Pausar notificações durante horários específicos</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.quiet_hours.enabled}
                      onChange={(e) => updateQuietHours({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.quiet_hours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Início
                      </label>
                      <input
                        type="time"
                        value={settings.quiet_hours.start_time}
                        onChange={(e) => updateQuietHours({ start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fim
                      </label>
                      <input
                        type="time"
                        value={settings.quiet_hours.end_time}
                        onChange={(e) => updateQuietHours({ end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} icon={Save}>
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
};