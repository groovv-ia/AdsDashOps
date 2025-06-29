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
    logo: '/google-ads-icon.svg',
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
    logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMyAySDE2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjlsLTctN3oiIHN0cm9rZT0iIzRiNzY4OCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGZpbGw9IiNmOGY5ZmEiLz4KPHA+YXRoIGQ9Ik0xMyAydjdoNyIgc3Ryb2tlPSIjNGI3Njg4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8dGV4dCB4PSIxMiIgeT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNiIgZmlsbD0iIzRiNzY4OCIgZm9udC13ZWlnaHQ9ImJvbGQiPkNTVjwvdGV4dD4KPC9zdmc+',
    description: 'Faça upload de arquivos CSV com seus dados',
    metrics: ['Dados Personalizados'],
    requiresOAuth: false
  }
];

export const DataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<typeof availableConnectors[0] | null>(null);
  const [configData, setConfigData] = useState<ConnectionConfig>({
    accountId: '',
    accessToken: '',
    clientId: '',
    clientSecret: '',
    refreshToken: ''
  });
  const [showTokens, setShowTokens] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const syncService = new DataSyncService();

  useEffect(() => {
    loadDataSources();
    
    // Listen for OAuth callback messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'oauth-callback') {
        handleOAuthCallback(event.data.code, event.data.platform);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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

  const handleConnectSource = (connector: typeof availableConnectors[0]) => {
    setSelectedConnector(connector);
    setShowAddModal(false);
    
    if (connector.requiresOAuth) {
      setShowOAuthModal(true);
    } else {
      setShowConfigModal(true);
    }
  };

  const handleOAuthStart = () => {
    if (!selectedConnector) return;

    const redirectUri = `${window.location.origin}/oauth-callback`;
    const clientId = configData.clientId;

    if (!clientId) {
      alert('Por favor, insira o Client ID primeiro');
      return;
    }

    switch (selectedConnector.platform.toLowerCase()) {
      case 'meta':
        initiateOAuth.meta(clientId, redirectUri);
        break;
      case 'google':
        initiateOAuth.google(clientId, redirectUri);
        break;
      case 'tiktok':
        initiateOAuth.tiktok(clientId, redirectUri);
        break;
    }
  };

  const handleOAuthCallback = async (code: string, platform: string) => {
    if (!selectedConnector) return;

    try {
      const redirectUri = `${window.location.origin}/oauth-callback`;
      let tokenData;

      switch (platform.toLowerCase()) {
        case 'meta':
          tokenData = await exchangeCodeForToken.meta(
            code, 
            configData.clientId, 
            configData.clientSecret, 
            redirectUri
          );
          break;
        case 'google':
          tokenData = await exchangeCodeForToken.google(
            code, 
            configData.clientId, 
            configData.clientSecret, 
            redirectUri
          );
          break;
        case 'tiktok':
          tokenData = await exchangeCodeForToken.tiktok(
            code, 
            configData.clientId, 
            configData.clientSecret, 
            redirectUri
          );
          break;
      }

      if (tokenData.access_token) {
        setConfigData(prev => ({
          ...prev,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in ? 
            new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : 
            undefined
        }));
        
        setShowOAuthModal(false);
        setShowConfigModal(true);
      } else {
        throw new Error('Falha na autenticação OAuth');
      }
    } catch (error) {
      console.error('Erro no OAuth callback:', error);
      alert('Erro na autenticação. Tente novamente.');
    }
  };

  const handleSaveConnection = async () => {
    if (!selectedConnector) return;

    try {
      const connectionData = {
        name: `${selectedConnector.name} - ${configData.accountId}`,
        platform: selectedConnector.platform,
        type: selectedConnector.type,
        status: 'disconnected',
        config: configData,
        logo: selectedConnector.logo,
        description: selectedConnector.description,
        metrics: selectedConnector.metrics
      };

      const { data, error } = await supabase
        .from('data_connections')
        .insert(connectionData)
        .select()
        .single();

      if (error) throw error;

      // Test connection and sync data
      await handleSync(data.id);
      
      setShowConfigModal(false);
      setConfigData({
        accountId: '',
        accessToken: '',
        clientId: '',
        clientSecret: '',
        refreshToken: ''
      });
      
      await loadDataSources();
    } catch (error) {
      console.error('Erro ao salvar conexão:', error);
      alert('Erro ao salvar conexão. Verifique os dados e tente novamente.');
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
        config: source as any // This would come from the database
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    // Process CSV file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv = e.target?.result as string;
      // Here you would parse the CSV and store it in your database
      console.log('CSV content:', csv);
      
      // Create a file-based data source
      const connectionData = {
        name: `CSV Upload - ${file.name}`,
        platform: 'File',
        type: 'file',
        status: 'connected',
        config: { accountId: file.name, accessToken: 'file-upload' },
        logo: availableConnectors.find(c => c.id === 'csv-upload')?.logo,
        description: `Dados importados de ${file.name}`,
        metrics: ['Dados Personalizados']
      };

      try {
        const { error } = await supabase
          .from('data_connections')
          .insert(connectionData);

        if (error) throw error;
        
        await loadDataSources();
        setShowConfigModal(false);
      } catch (error) {
        console.error('Erro ao salvar arquivo CSV:', error);
      }
    };
    
    reader.readAsText(file);
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fontes de Dados</h1>
          <p className="text-gray-600">Conecte e gerencie suas fontes de dados de publicidade</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          icon={Plus}
          className="mt-4 sm:mt-0"
        >
          Adicionar Fonte
        </Button>
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
              <div key={source.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img 
                      src={source.logo} 
                      alt={source.name}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{source.name}</h3>
                    <p className="text-sm text-gray-500">{source.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(source.status)}`}>
                        {source.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {source.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {(source.status === 'syncing' || isCurrentlySyncing) && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        {getStatusText(isCurrentlySyncing ? 'syncing' : source.status)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(source.type)}`}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableConnectors.map((connector) => {
                  const TypeIcon = getTypeIcon(connector.type);
                  return (
                    <button
                      key={connector.id}
                      onClick={() => handleConnectSource(connector)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                          <img 
                            src={connector.logo} 
                            alt={connector.name}
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{connector.name}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(connector.type)}`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {connector.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{connector.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {connector.metrics?.slice(0, 3).map((metric) => (
                          <span key={metric} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            {metric}
                          </span>
                        ))}
                        {connector.metrics && connector.metrics.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            +{connector.metrics.length - 3}
                          </span>
                        )}
                      </div>
                      {connector.requiresOAuth && (
                        <div className="mt-2 flex items-center text-xs text-blue-600">
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

      {/* OAuth Modal */}
      {showOAuthModal && selectedConnector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img 
                    src={selectedConnector.logo} 
                    alt={selectedConnector.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Autenticação OAuth - {selectedConnector.name}</h2>
                  <p className="text-gray-600">Configure suas credenciais de API</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Configuração OAuth</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Primeiro, configure suas credenciais de API no painel de desenvolvedor do {selectedConnector.name}.
                    </p>
                    <a 
                      href={selectedConnector.oauthUrl} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-flex items-center"
                    >
                      Acessar documentação <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    value={configData.clientId}
                    onChange={(e) => setConfigData({...configData, clientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite seu Client ID"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Secret *
                  </label>
                  <input
                    type="password"
                    value={configData.clientSecret}
                    onChange={(e) => setConfigData({...configData, clientSecret: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite seu Client Secret"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID da Conta
                </label>
                <input
                  type="text"
                  value={configData.accountId}
                  onChange={(e) => setConfigData({...configData, accountId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o ID da sua conta de anúncios"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowOAuthModal(false)}
              >
                Cancelar
              </Button>
              <div className="space-x-3">
                <Button 
                  variant="outline"
                  onClick={handleOAuthStart}
                  disabled={!configData.clientId || !configData.clientSecret}
                  icon={Link}
                >
                  Iniciar OAuth
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && selectedConnector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img 
                    src={selectedConnector.logo} 
                    alt={selectedConnector.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Configurar {selectedConnector.name}</h2>
                  <p className="text-gray-600">
                    {selectedConnector.type === 'file' ? 'Faça upload do seu arquivo' : 'Finalize a configuração'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {selectedConnector.type === 'file' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo CSV
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Clique para selecionar ou arraste seu arquivo CSV</p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Selecionar Arquivo
                    </label>
                    {csvFile && (
                      <p className="text-sm text-green-600 mt-2">
                        Arquivo selecionado: {csvFile.name}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID da Conta
                    </label>
                    <input
                      type="text"
                      value={configData.accountId}
                      onChange={(e) => setConfigData({...configData, accountId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o ID da sua conta"
                    />
                  </div>

                  {configData.accessToken && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Access Token
                      </label>
                      <div className="relative">
                        <input
                          type={showTokens ? "text" : "password"}
                          value={configData.accessToken}
                          readOnly
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTokens(!showTokens)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-green-600 mt-1">✓ Token obtido via OAuth</p>
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">Autenticação Concluída</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Suas credenciais foram validadas com sucesso. Clique em "Conectar" para finalizar.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowConfigModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveConnection}
                disabled={!configData.accountId || (!configData.accessToken && selectedConnector.type !== 'file')}
              >
                {selectedConnector.type === 'file' ? 'Upload' : 'Conectar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};