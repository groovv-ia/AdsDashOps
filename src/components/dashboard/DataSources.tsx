import React, { useState } from 'react';
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
  Globe
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DataSource {
  id: string;
  name: string;
  platform: string;
  type: 'advertising' | 'analytics' | 'crm' | 'database' | 'file';
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  accountId?: string;
  logo: React.ReactNode;
  description: string;
  metrics?: string[];
}

const MetaIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#1877F2"/>
    <path d="M15.5 8.5c-1.5 0-2.5 1-2.5 2.5v1h-1v2h1v5h2v-5h1.5l.5-2h-2v-1c0-.5.5-1 1-1h1V8.5h-1.5z" fill="white"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43V7.56a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.01z" fill="#000"/>
  </svg>
);

const ShopifyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M15.8 2.1c-.2-.1-.5-.1-.7 0-.2.1-4.4.6-4.4.6s-2.9-2.9-3.2-3.2c-.3-.3-.9-.2-1.1-.1 0 0-.2.1-.5.2-.5-1.6-1.3-3.1-2.8-3.1h-.1c-.8 0-1.6.3-2.2.9-.9.9-1.5 2.3-1.6 3.8 0 .1 0 .3-.1.4L2.5 8.8c-.8.2-1.4.4-1.4 1.2v.1L2.2 22h18.5l1.1-11.9c.1-.8-.5-1.5-1.3-1.6l-4.7-.4z" fill="#95BF47"/>
    <path d="M15.1 2.8c-.1 0-.2 0-.3.1l-3.3.4v3.4l3.6-.4V2.8z" fill="#5E8E3E"/>
    <path d="M11.5 3.3l-2.9.3v3.1l2.9-.3V3.3z" fill="#95BF47"/>
  </svg>
);

const HubSpotIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#FF7A59"/>
    <path d="M8 8h8v8H8z" fill="white"/>
    <circle cx="12" cy="12" r="2" fill="#FF7A59"/>
  </svg>
);

const CSVIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z" stroke="#4b7688" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#f8f9fa"/>
    <path d="M13 2v7h7" stroke="#4b7688" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="12" y="16" textAnchor="middle" fontSize="6" fill="#4b7688" fontWeight="bold">CSV</text>
  </svg>
);

const availableConnectors = [
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    platform: 'Meta',
    type: 'advertising' as const,
    logo: <MetaIcon />,
    description: 'Conecte suas campanhas do Facebook e Instagram Ads',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'ROAS']
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    platform: 'Google',
    type: 'advertising' as const,
    logo: <GoogleIcon />,
    description: 'Importe dados de campanhas do Google Ads',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'Quality Score']
  },
  {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    platform: 'TikTok',
    type: 'advertising' as const,
    logo: <TikTokIcon />,
    description: 'Conecte suas campanhas do TikTok for Business',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'Video Views']
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    platform: 'Google',
    type: 'analytics' as const,
    logo: <GoogleIcon />,
    description: 'Dados de tráfego e comportamento do usuário',
    metrics: ['Sessões', 'Usuários', 'Taxa de Rejeição', 'Duração da Sessão']
  },
  {
    id: 'facebook-insights',
    name: 'Facebook Insights',
    platform: 'Meta',
    type: 'analytics' as const,
    logo: <MetaIcon />,
    description: 'Métricas de páginas e posts do Facebook',
    metrics: ['Alcance', 'Engajamento', 'Curtidas', 'Compartilhamentos']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    platform: 'Shopify',
    type: 'crm' as const,
    logo: <ShopifyIcon />,
    description: 'Dados de vendas e produtos do Shopify',
    metrics: ['Vendas', 'Pedidos', 'Produtos', 'Clientes']
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    platform: 'HubSpot',
    type: 'crm' as const,
    logo: <HubSpotIcon />,
    description: 'CRM e automação de marketing',
    metrics: ['Leads', 'Deals', 'Contacts', 'Email Performance']
  },
  {
    id: 'csv-upload',
    name: 'Upload CSV',
    platform: 'File',
    type: 'file' as const,
    logo: <CSVIcon />,
    description: 'Faça upload de arquivos CSV com seus dados',
    metrics: ['Dados Personalizados']
  }
];

const mockDataSources: DataSource[] = [
  {
    id: '1',
    name: 'Meta Ads - Conta Principal',
    platform: 'Meta',
    type: 'advertising',
    status: 'connected',
    lastSync: '2024-01-15T10:30:00Z',
    accountId: 'act_123456789',
    logo: <MetaIcon />,
    description: 'Campanhas do Facebook e Instagram',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'ROAS']
  },
  {
    id: '2',
    name: 'Google Ads - E-commerce',
    platform: 'Google',
    type: 'advertising',
    status: 'syncing',
    lastSync: '2024-01-15T09:15:00Z',
    accountId: '123-456-7890',
    logo: <GoogleIcon />,
    description: 'Campanhas de busca e display',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC']
  },
  {
    id: '3',
    name: 'TikTok Ads - Marca',
    platform: 'TikTok',
    type: 'advertising',
    status: 'error',
    lastSync: '2024-01-14T16:45:00Z',
    accountId: 'tiktok_987654321',
    logo: <TikTokIcon />,
    description: 'Campanhas de vídeo e awareness',
    metrics: ['Impressões', 'Cliques', 'Video Views']
  }
];

export const DataSources: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>(mockDataSources);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<typeof availableConnectors[0] | null>(null);
  const [configData, setConfigData] = useState({
    accountId: '',
    accessToken: '',
    clientId: '',
    clientSecret: '',
    refreshToken: ''
  });
  const [showTokens, setShowTokens] = useState(false);

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
    setShowConfigModal(true);
  };

  const handleSaveConnection = () => {
    if (selectedConnector) {
      const newSource: DataSource = {
        id: Date.now().toString(),
        name: `${selectedConnector.name} - Nova Conexão`,
        platform: selectedConnector.platform,
        type: selectedConnector.type,
        status: 'connected',
        lastSync: new Date().toISOString(),
        accountId: configData.accountId,
        logo: selectedConnector.logo,
        description: selectedConnector.description,
        metrics: selectedConnector.metrics
      };
      
      setDataSources([...dataSources, newSource]);
      setShowConfigModal(false);
      setConfigData({
        accountId: '',
        accessToken: '',
        clientId: '',
        clientSecret: '',
        refreshToken: ''
      });
    }
  };

  const handleSync = (sourceId: string) => {
    setDataSources(sources => 
      sources.map(source => 
        source.id === sourceId 
          ? { ...source, status: 'syncing' as const }
          : source
      )
    );
    
    // Simulate sync completion
    setTimeout(() => {
      setDataSources(sources => 
        sources.map(source => 
          source.id === sourceId 
            ? { ...source, status: 'connected' as const, lastSync: new Date().toISOString() }
            : source
        )
      );
    }, 3000);
  };

  const handleDelete = (sourceId: string) => {
    setDataSources(sources => sources.filter(source => source.id !== sourceId));
  };

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
            return (
              <div key={source.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 flex items-center justify-center">
                    {source.logo}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{source.name}</h3>
                    <p className="text-sm text-gray-500">{source.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(source.status)}`}>
                        {source.status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {source.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {source.status === 'syncing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                        {getStatusText(source.status)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(source.type)}`}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {source.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        Última sync: {new Date(source.lastSync).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSync(source.id)}
                    disabled={source.status === 'syncing'}
                    title="Sincronizar"
                  >
                    <RefreshCw className={`w-4 h-4 ${source.status === 'syncing' ? 'animate-spin' : ''}`} />
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
                        <div className="w-8 h-8 flex items-center justify-center">
                          {connector.logo}
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

      {/* Configuration Modal */}
      {showConfigModal && selectedConnector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {selectedConnector.logo}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Configurar {selectedConnector.name}</h2>
                  <p className="text-gray-600">Insira suas credenciais de API</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <div className="relative">
                  <input
                    type={showTokens ? "text" : "password"}
                    value={configData.accessToken}
                    onChange={(e) => setConfigData({...configData, accessToken: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite seu access token"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokens(!showTokens)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={configData.clientId}
                    onChange={(e) => setConfigData({...configData, clientId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Client ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Secret
                  </label>
                  <input
                    type={showTokens ? "text" : "password"}
                    value={configData.clientSecret}
                    onChange={(e) => setConfigData({...configData, clientSecret: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Client Secret"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Como obter suas credenciais</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Acesse o painel de desenvolvedor do {selectedConnector.name} para gerar suas credenciais de API.
                    </p>
                    <a 
                      href="#" 
                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                    >
                      Ver documentação →
                    </a>
                  </div>
                </div>
              </div>
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
                disabled={!configData.accountId || !configData.accessToken}
              >
                Conectar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};