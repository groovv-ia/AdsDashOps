import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Cloud,
  FileText,
  Globe,
  Key,
  Link,
  Upload,
  Download
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataSourceSetup } from './DataSourceSetup';
import { SimpleMetaConnectV2 } from './SimpleMetaConnectV2';
import { supabase } from '../../lib/supabase';
import { 
  DataSyncService, 
  MetaAdsConnector, 
  GoogleAdsConnector, 
  TikTokAdsConnector,
  initiateOAuth,
  exchangeCodeForToken,
  type DataSourceConnection,
  type ConnectionConfig
} from '../../lib/dataConnectors';

interface DataSource {
  id: string;
  name: string;
  platform: string;
  type: 'advertising' | 'analytics' | 'crm' | 'database' | 'file';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  accountId?: string;
  logo: string;
  description: string;
  metrics?: string[];
  error?: string;
}

// CSV Icon Component
const CSVIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 421 512" 
    fill="currentColor"
    className="w-8 h-8"
  >
    <path fill="#E44B4D" d="M95.705.014h199.094L421 136.548v317.555c0 31.54-25.961 57.502-57.502 57.502H95.705c-31.55 0-57.502-25.873-57.502-57.502V57.515C38.203 25.886 64.076.014 95.705.014z"/>
    <path fill="#CD4445" d="M341.028 133.408h-.019L421 188.771v-52.066h-54.357c-9.458-.15-17.998-1.274-25.615-3.297z"/>
    <path fill="#FBCFD0" d="M294.8 0L421 136.533v.172h-54.357c-45.068-.718-69.33-23.397-71.843-61.384V0z"/>
    <path fill="#CD4445" fillRule="nonzero" d="M0 431.901V253.404l.028-1.261c.668-16.446 14.333-29.706 30.936-29.706h7.238v50.589h342.975c12.862 0 23.373 10.51 23.373 23.371v135.504c0 12.83-10.543 23.373-23.373 23.373H23.373C10.541 455.274 0 444.75 0 431.901z"/>
    <path fill="#fff" fillRule="nonzero" d="M11.329 276.171v154.728c0 7.793 6.38 14.178 14.179 14.178H380.175c7.799 0 14.178-6.379 14.178-14.178V297.405c0-7.798-6.388-14.178-14.178-14.178H37.892c-12.618-.096-19.586-1.638-26.563-7.056z"/>
    <path fill="#1A1A1A" fillRule="nonzero" d="M150.496 378.118l1.965 22.014c-5.504 2.271-12.404 3.406-20.704 3.406-8.297 0-14.957-.874-19.982-2.621-5.022-1.747-8.974-4.497-11.858-8.255-2.881-3.757-4.891-8.167-6.026-13.234-1.137-5.065-1.704-11.312-1.704-18.736 0-7.427.567-13.693 1.704-18.803 1.135-5.11 3.145-9.543 6.026-13.301 5.592-7.248 15.855-10.875 30.793-10.875 3.319 0 7.228.328 11.728.983 4.497.655 7.839 1.464 10.023 2.425l-3.931 20.047c-5.679-1.223-10.875-1.835-15.593-1.835-4.716 0-7.992.437-9.826 1.31-1.835.874-2.753 2.62-2.753 5.241v34.33a51.32 51.32 0 0010.352 1.048c7.425 0 14.021-1.048 19.786-3.144zm9.826 22.014l3.669-21.62c8.037 2.008 15.264 3.012 21.686 3.012 6.421 0 11.595-.262 15.525-.786v-6.551l-11.791-1.049c-10.657-.961-17.974-3.515-21.947-7.664-3.976-4.149-5.963-10.286-5.963-18.411 0-11.181 2.424-18.866 7.273-23.06 4.849-4.194 13.08-6.29 24.698-6.29s22.101 1.092 31.448 3.276l-3.275 20.964c-8.124-1.31-14.632-1.965-19.524-1.965-4.892 0-9.041.219-12.449.655v6.42l9.435.919c11.442 1.134 19.348 3.864 23.715 8.188 4.37 4.325 6.554 10.33 6.554 18.017 0 5.504-.743 10.154-2.229 13.954-1.484 3.8-3.254 6.684-5.307 8.649-2.053 1.965-4.956 3.472-8.713 4.521-3.755 1.047-7.054 1.681-9.893 1.899-2.839.219-6.617.328-11.333.328-11.357 0-21.883-1.135-31.579-3.406zm125.527-80.454h27.647l-20.31 81.894h-38.26l-20.31-81.894h27.646l11.139 52.019h1.179l11.269-52.019z"/>
  </svg>
);

// Google Analytics Icon Component
const GoogleAnalyticsIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 301112 333331" 
    className="w-8 h-8"
  >
    <path d="M301110 291619c124 22886-18333 41521-41206 41644-1700 14-3415-82-5101-288-21227-3140-36776-21611-36256-43057V43342c-507-21474 15084-39944 36324-43057 22721-2660 43304 13602 45964 36324 192 1673 288 3346 274 5032v249977z" fill="#f9ab00"/>
    <path d="M41288 250756c22804 0 41288 18484 41288 41288s-18484 41288-41288 41288S0 314848 0 292044s18484-41288 41288-41288zm108630-125126c-22913 1261-40685 20472-40150 43413v110892c0 30099 13246 48364 32649 52258 22393 4539 44209-9928 48748-32320 562-2743 836-5526 822-8323V167124c41-22886-18470-41467-41356-41507-233 0-480 0-713 14z" fill="#e37400"/>
  </svg>
);

const availableConnectors = [
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    platform: 'Meta',
    type: 'advertising' as const,
    logo: '/meta-icon.svg',
    description: 'Conecte suas campanhas do Facebook e Instagram Ads',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'ROAS'],
    requiresOAuth: true,
    oauthUrl: 'https://developers.facebook.com/docs/marketing-api/overview'
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    platform: 'Google',
    type: 'advertising' as const,
    logo: '/google-ads-icon.svg',
    description: 'Importe dados de campanhas do Google Ads',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'Quality Score'],
    requiresOAuth: true,
    oauthUrl: 'https://developers.google.com/google-ads/api/docs/oauth/overview'
  },
  {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    platform: 'TikTok',
    type: 'advertising' as const,
    logo: '/tiktok-icon.svg',
    description: 'Conecte suas campanhas do TikTok for Business',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'Video Views'],
    requiresOAuth: true,
    oauthUrl: 'https://ads.tiktok.com/marketing_api/docs?id=1738373164380162'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    platform: 'Google',
    type: 'analytics' as const,
    logo: 'google-analytics',
    description: 'Dados de tráfego e comportamento do usuário',
    metrics: ['Sessões', 'Usuários', 'Taxa de Rejeição', 'Duração da Sessão'],
    requiresOAuth: true,
    oauthUrl: 'https://developers.google.com/analytics/devguides/reporting/core/v4'
  },
  {
    id: 'csv-upload',
    name: 'Upload CSV',
    platform: 'File',
    type: 'file' as const,
    logo: 'csv',
    description: 'Faça upload de arquivos CSV com seus dados',
    metrics: ['Dados Personalizados'],
    requiresOAuth: false
  }
];

export const DataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<typeof availableConnectors[0] | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const syncService = new DataSyncService();

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDataSources(data || []);
    } catch (error) {
      console.error('Erro ao carregar fontes de dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'disconnected': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'syncing': return 'Sincronizando';
      case 'error': return 'Erro';
      case 'disconnected': return 'Desconectado';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'advertising': return Zap;
      case 'analytics': return Globe;
      case 'crm': return Database;
      case 'file': return FileText;
      default: return Cloud;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'advertising': return 'text-purple-600 bg-purple-100';
      case 'analytics': return 'text-blue-600 bg-blue-100';
      case 'crm': return 'text-green-600 bg-green-100';
      case 'file': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderConnectorLogo = (connector: typeof availableConnectors[0]) => {
    if (connector.logo === 'csv') {
      return <CSVIcon />;
    } else if (connector.logo === 'google-analytics') {
      return <GoogleAnalyticsIcon />;
    } else {
      return (
        <img 
          src={connector.logo} 
          alt={connector.name}
          className="w-8 h-8 object-contain"
        />
      );
    }
  };

  const handleConnectSource = (connector: typeof availableConnectors[0]) => {
    setSelectedConnector(connector);
    setShowAddModal(false);
    setShowSetupModal(true);
  };

  const handleSetupComplete = async (connectionData: any) => {
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('data_connections')
        .insert({
          user_id: user.id, // Add the user_id field
          name: connectionData.connectionName,
          platform: connectionData.connector.platform,
          type: connectionData.connector.type,
          status: connectionData.status,
          config: connectionData.setupData,
          logo: connectionData.connector.logo,
          description: connectionData.connector.description,
          metrics: connectionData.connector.metrics,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setShowSetupModal(false);
      setSelectedConnector(null);
      await loadDataSources();
    } catch (error) {
      console.error('Erro ao salvar conexão:', error);
    }
  };

  const handleSync = async (sourceId: string) => {
    setSyncingIds(prev => new Set(prev).add(sourceId));
    
    try {
      const source = dataSources.find(s => s.id === sourceId);
      if (!source) return;

      const connection: DataSourceConnection = {
        id: source.id,
        name: source.name,
        platform: source.platform,
        type: source.type,
        status: source.status,
        config: source as any
      };

      const result = await syncService.syncDataSource(connection);
      
      if (!result.success) {
        console.error('Erro na sincronização:', result.error);
      }
      
      await loadDataSources();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Tem certeza que deseja remover esta fonte de dados?')) return;

    try {
      const { error } = await supabase
        .from('data_connections')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;
      
      await loadDataSources();
    } catch (error) {
      console.error('Erro ao deletar fonte:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fontes de Dados</h1>
            <p className="text-gray-600">Conecte suas contas de anúncios de forma simples e rápida</p>
          </div>
        </div>
      </div>

      {/* Conexão Simplificada Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleMetaConnectV2 />

        {/* Placeholder para Google Ads - Em breve */}
        <Card className="opacity-70 cursor-not-allowed relative bg-gray-50/80 hover:opacity-70 transition-opacity">
          {/* Badge "Em breve" no topo do card */}
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
              Em breve
            </span>
          </div>

          <div className="pointer-events-none">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <img src="/google-ads-icon.svg" alt="Google Ads" className="w-12 h-12 grayscale opacity-50" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Google Ads</h3>
                  <p className="text-sm text-gray-600">2 campanhas</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Conexão com Google Ads será disponibilizada em breve.
            </p>
          </div>
        </Card>
      </div>

      {/* Connected Sources */}
      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Fontes Conectadas</h2>
          <p className="text-sm text-gray-600">Gerencie suas conexões ativas</p>
        </div>

        <div className="space-y-4">
          {dataSources.map((source) => {
            const TypeIcon = getTypeIcon(source.type);
            const isCurrentlySyncing = syncingIds.has(source.id);
            
            return (
              <div key={source.id} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 hover:shadow-lg hover:border-gray-300/50 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                      {source.logo === 'csv' ? (
                        <CSVIcon />
                      ) : source.logo === 'google-analytics' ? (
                        <GoogleAnalyticsIcon />
                      ) : (
                        <img 
                          src={source.logo} 
                          alt={source.name}
                          className="w-8 h-8 object-contain"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{source.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{source.description}</p>
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(source.status)}`}>
                          {source.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {source.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {(source.status === 'syncing' || isCurrentlySyncing) && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                          {getStatusText(isCurrentlySyncing ? 'syncing' : source.status)}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(source.type)}`}>
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {source.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          Última sync: {new Date(source.lastSync).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {source.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          {source.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(source.id)}
                      disabled={isCurrentlySyncing}
                      title="Sincronizar"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCurrentlySyncing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Configurações"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(source.id)}
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {dataSources.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma fonte conectada</h3>
            <p className="text-gray-500 mb-4">Conecte suas primeiras fontes de dados para começar</p>
            <Button onClick={() => setShowAddModal(true)} icon={Plus}>
              Adicionar Primeira Fonte
            </Button>
          </div>
        )}
      </Card>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Adicionar Fonte de Dados</h2>
              <p className="text-gray-600">Escolha uma plataforma para conectar</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableConnectors.map((connector) => {
                  const TypeIcon = getTypeIcon(connector.type);
                  return (
                    <button
                      key={connector.id}
                      onClick={() => handleConnectSource(connector)}
                      className="bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 rounded-xl p-6 hover:border-blue-500/50 hover:bg-blue-50/50 hover:shadow-lg transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                          {renderConnectorLogo(connector)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{connector.name}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(connector.type)}`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {connector.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{connector.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {connector.metrics?.slice(0, 3).map((metric) => (
                          <span key={metric} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-md">
                            {metric}
                          </span>
                        ))}
                        {connector.metrics && connector.metrics.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-md">
                            +{connector.metrics.length - 3}
                          </span>
                        )}
                      </div>
                      {connector.requiresOAuth && (
                        <div className="flex items-center text-xs text-blue-600">
                          <Key className="w-3 h-3 mr-1" />
                          Requer OAuth
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      {showSetupModal && selectedConnector && (
        <DataSourceSetup
          connector={selectedConnector}
          onClose={() => {
            setShowSetupModal(false);
            setSelectedConnector(null);
          }}
          onComplete={handleSetupComplete}
        />
      )}
    </div>
  );
};