import React, { useState } from 'react';
import { Download, FileText, Database, Settings, Calendar, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ExportOptions {
  profile: boolean;
  campaigns: boolean;
  metrics: boolean;
  connections: boolean;
  settings: boolean;
  notifications: boolean;
}

export const DataExporter: React.FC = () => {
  const { user } = useAuth();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    profile: true,
    campaigns: true,
    metrics: true,
    connections: true,
    settings: true,
    notifications: false
  });
  const [loading, setLoading] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const exportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const exportData: any = {
        export_info: {
          user_id: user.id,
          exported_at: new Date().toISOString(),
          export_version: '1.0',
          options: exportOptions
        }
      };

      // Export profile data
      if (exportOptions.profile) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        exportData.profile = profileData;
      }

      // Export campaigns
      if (exportOptions.campaigns) {
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id);
        
        exportData.campaigns = campaignsData || [];
      }

      // Export metrics
      if (exportOptions.metrics) {
        const { data: metricsData } = await supabase
          .from('ad_metrics')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1000); // Limit to last 1000 records
        
        exportData.metrics = metricsData || [];
      }

      // Export data connections
      if (exportOptions.connections) {
        const { data: connectionsData } = await supabase
          .from('data_connections')
          .select('id, name, platform, type, status, created_at, updated_at')
          .eq('user_id', user.id);
        
        exportData.connections = connectionsData || [];
      }

      // Export settings
      if (exportOptions.settings) {
        const savedSettings = localStorage.getItem('systemSettings');
        exportData.settings = savedSettings ? JSON.parse(savedSettings) : {};
        
        const { data: notificationSettings } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        exportData.notification_settings = notificationSettings;
      }

      // Export notifications
      if (exportOptions.notifications) {
        const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500); // Limit to last 500 notifications
        
        exportData.notifications = notificationsData || [];
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adsops-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastExport(new Date().toISOString());
      
      // Show success message
      alert('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (option: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const selectAll = () => {
    setExportOptions({
      profile: true,
      campaigns: true,
      metrics: true,
      connections: true,
      settings: true,
      notifications: true
    });
  };

  const selectNone = () => {
    setExportOptions({
      profile: false,
      campaigns: false,
      metrics: false,
      connections: false,
      settings: false,
      notifications: false
    });
  };

  const exportItems = [
    {
      key: 'profile' as keyof ExportOptions,
      label: 'Perfil do Usuário',
      description: 'Informações pessoais e configurações do perfil',
      icon: Shield,
      size: '< 1KB'
    },
    {
      key: 'campaigns' as keyof ExportOptions,
      label: 'Campanhas',
      description: 'Todas as campanhas criadas e configurações',
      icon: Database,
      size: '~ 10KB'
    },
    {
      key: 'metrics' as keyof ExportOptions,
      label: 'Métricas e Performance',
      description: 'Dados de performance das últimas 1000 entradas',
      icon: FileText,
      size: '~ 100KB'
    },
    {
      key: 'connections' as keyof ExportOptions,
      label: 'Conexões de Dados',
      description: 'Configurações das fontes de dados (sem credenciais)',
      icon: Database,
      size: '< 5KB'
    },
    {
      key: 'settings' as keyof ExportOptions,
      label: 'Configurações do Sistema',
      description: 'Preferências e configurações da aplicação',
      icon: Settings,
      size: '< 1KB'
    },
    {
      key: 'notifications' as keyof ExportOptions,
      label: 'Histórico de Notificações',
      description: 'Últimas 500 notificações recebidas',
      icon: Calendar,
      size: '~ 20KB'
    }
  ];

  const selectedCount = Object.values(exportOptions).filter(Boolean).length;
  const hasSelection = selectedCount > 0;

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Exportar Dados</h3>
        <p className="text-gray-600">
          Baixe uma cópia dos seus dados em formato JSON. Selecione quais informações deseja incluir.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-3 mb-6">
        <Button variant="outline" size="sm" onClick={selectAll}>
          Selecionar Tudo
        </Button>
        <Button variant="outline" size="sm" onClick={selectNone}>
          Desmarcar Tudo
        </Button>
      </div>

      {/* Export Options */}
      <div className="space-y-3 mb-6">
        {exportItems.map((item) => (
          <div
            key={item.key}
            className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              exportOptions[item.key]
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleOption(item.key)}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions[item.key]}
                onChange={() => toggleOption(item.key)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <item.icon className="w-5 h-5 text-gray-500" />
              <div>
                <h4 className="font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">{item.size}</div>
          </div>
        ))}
      </div>

      {/* Export Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">Informações do Export</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Formato: JSON estruturado</li>
          <li>• Dados sensíveis: Credenciais e tokens são excluídos</li>
          <li>• Compatibilidade: Pode ser importado em outras ferramentas</li>
          <li>• Itens selecionados: {selectedCount} de {exportItems.length}</li>
        </ul>
      </div>

      {/* Last Export Info */}
      {lastExport && (
        <div className="text-sm text-gray-500 mb-4">
          Último export: {new Date(lastExport).toLocaleString('pt-BR')}
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={exportData}
          loading={loading}
          disabled={!hasSelection}
          icon={Download}
        >
          {loading ? 'Exportando...' : `Exportar Dados${hasSelection ? ` (${selectedCount} itens)` : ''}`}
        </Button>
      </div>
    </Card>
  );
};