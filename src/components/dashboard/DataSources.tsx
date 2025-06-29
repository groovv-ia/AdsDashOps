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
  logo: string;
  description: string;
  metrics?: string[];
}

const availableConnectors = [
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    platform: 'Meta',
    type: 'advertising' as const,
    logo: '/icons/meta-logo.png',
    description: 'Conecte suas campanhas do Facebook e Instagram Ads',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'ROAS']
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    platform: 'Google',
    type: 'advertising' as const,
    logo: '/icons/google-ads-logo.png',
    description: 'Importe dados de campanhas do Google Ads',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'Quality Score']
  },
  {
    id: 'tiktok-ads',
    name: 'TikTok Ads',
    platform: 'TikTok',
    type: 'advertising' as const,
    logo: '/icons/tiktok-logo.png',
    description: 'Conecte suas campanhas do TikTok for Business',
    metrics: ['Impressões', 'Cliques', 'Conversões', 'CTR', 'CPC', 'Video Views']
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    platform: 'Google',
    type: 'analytics' as const,
    logo: '/icons/google-ads-logo.png',
    description: 'Dados de tráfego e comportamento do usuário',
    metrics: ['Sessões', 'Usuários', 'Taxa de Rejeição', 'Duração da Sessão']
  },
  {
    id: 'facebook-insights',
    name: 'Facebook Insights',
    platform: 'Meta',
    type: 'analytics' as const,
    logo: '/icons/meta-logo.png',
    description: 'Métricas de páginas e posts do Facebook',
    metrics: ['Alcance', 'Engajamento', 'Curtidas', 'Compartilhamentos']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    platform: 'Shopify',
    type: 'crm' as const,
    logo: 'https://cdn.worldvectorlogo.com/logos/shopify.svg',
    description: 'Dados de vendas e produtos do Shopify',
    metrics: ['Vendas', 'Pedidos', 'Produtos', 'Clientes']
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    platform: 'HubSpot',
    type: 'crm' as const,
    logo: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
    description: 'CRM e automação de marketing',
    metrics: ['Leads', 'Deals', 'Contacts', 'Email Performance']
  },
  {
    id: 'csv-upload',
    name: 'Upload CSV',
    platform: 'File',
    type: 'file' as const,
    logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEzIDJINkEyIDIgMCAwIDAgNCA0VjIwQTIgMiAwIDAgMCA2IDIySDE4QTIgMiAwIDAgMCAyMCAyMFY5TDEzIDJaIiBzdHJva2U9IiM0Yjc2ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMyAyVjlIMjAiIHN0cm9rZT0iIzRiNzY4OCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+',
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
    logo: '/icons/meta-logo.png',
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
    logo: '/icons/google-ads-logo.png',
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
    logo: '/icons/tiktok-logo.png',
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
                  <img 
                    src={source.logo} 
                    alt={source.name}
                    className="w-10 h-10 object-contain"
                  />
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
                        <img 
                          src={connector.logo} 
                          alt={connector.name}
                          className="w-8 h-8 object-contain"
                        />
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
                <img 
                  src={selectedConnector.logo} 
                  alt={selectedConnector.name}
                  className="w-8 h-8 object-contain"
                />
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