import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Upload,
  Eye,
  EyeOff,
  Loader,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DataSourceSetupProps {
  connector: {
    id: string;
    name: string;
    platform: string;
    type: string;
    logo: string;
    description: string;
    metrics: string[];
    requiresOAuth: boolean;
    oauthUrl?: string;
  };
  onClose: () => void;
  onComplete: (data: any) => void;
}

export const DataSourceSetup: React.FC<DataSourceSetupProps> = ({
  connector,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [setupData, setSetupData] = useState({
    connectionName: `${connector.name} - ${new Date().toLocaleDateString()}`,
    clientId: '',
    clientSecret: '',
    accessToken: '',
    refreshToken: '',
    accountId: '',
    csvFile: null as File | null
  });

  const steps = [
    { id: 1, title: 'Visão Geral', icon: '👁️' },
    { id: 2, title: 'Credenciais', icon: '🔑' },
    { id: 3, title: 'Configuração', icon: '⚙️' },
    { id: 4, title: 'Teste de Conexão', icon: '✅' }
  ];

  const handleInputChange = (field: string, value: string | File | null) => {
    setSetupData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOAuthStart = () => {
    if (!setupData.clientId || !setupData.clientSecret) {
      alert('Por favor, insira o Client ID e Client Secret primeiro');
      return;
    }

    const redirectUri = `${window.location.origin}/oauth-callback`;
    let authUrl = '';

    switch (connector.platform.toLowerCase()) {
      case 'meta':
        const scope = 'ads_read,ads_management,business_management';
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${setupData.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
        break;
      case 'google':
        const googleScope = 'https://www.googleapis.com/auth/adwords';
        authUrl = `https://accounts.google.com/oauth/authorize?client_id=${setupData.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${googleScope}&response_type=code&access_type=offline`;
        break;
      case 'tiktok':
        const tiktokScope = 'user_info:read,advertiser_management:read,campaign_management:read,reporting:read';
        authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${setupData.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${tiktokScope}&response_type=code`;
        break;
    }

    if (authUrl) {
      window.open(authUrl, 'oauth-window', 'width=600,height=600');
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Complete setup
      const connectionData = {
        connector,
        connectionName: setupData.connectionName,
        setupData,
        status: 'connected'
      };
      
      onComplete(connectionData);
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      alert('Erro ao testar conexão. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleInputChange('csvFile', file);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        if (connector.type === 'file') {
          return setupData.csvFile !== null;
        }
        return setupData.clientId && setupData.clientSecret;
      case 3:
        if (connector.type === 'file') {
          return setupData.connectionName;
        }
        return setupData.accountId && setupData.accessToken;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                {connector.logo === 'csv' ? (
                  <div className="text-2xl">📄</div>
                ) : (
                  <img 
                    src={connector.logo} 
                    alt={connector.name}
                    className="w-12 h-12 object-contain"
                  />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{connector.name}</h3>
              <p className="text-gray-600 mb-4">{connector.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Métricas Disponíveis</h4>
                <div className="space-y-2">
                  {connector.metrics?.slice(0, 6).map((metric, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">{metric}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Processo de Configuração</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">1</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {connector.requiresOAuth ? 'Configurar credenciais da API' : 'Upload de arquivo'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">2</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {connector.requiresOAuth ? 'Autorização OAuth' : 'Configuração de sincronização'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">3</span>
                    </div>
                    <span className="text-sm text-gray-600">Configuração de sincronização</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">4</span>
                    </div>
                    <span className="text-sm text-gray-600">Teste de conexão</span>
                  </div>
                </div>
              </div>
            </div>

            {connector.requiresOAuth && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Requisitos</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Você precisará criar uma aplicação no painel de desenvolvedor do {connector.name} para obter as credenciais necessárias.
                    </p>
                    {connector.oauthUrl && (
                      <a 
                        href={connector.oauthUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-flex items-center"
                      >
                        Acessar documentação <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        if (connector.type === 'file') {
          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload de Arquivo</h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Selecione seu arquivo CSV</h4>
                  <p className="text-gray-600 mb-4">Clique para selecionar ou arraste seu arquivo aqui</p>
                  
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
                  
                  {setupData.csvFile && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">{setupData.csvFile.name}</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Arquivo selecionado ({(setupData.csvFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Credenciais da API</h3>
              <p className="text-gray-600 mb-6">
                Configure suas credenciais de API do {connector.name}. Você pode obter essas informações no painel de desenvolvedor.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client ID *
                </label>
                <input
                  type="text"
                  value={setupData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu Client ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Secret *
                </label>
                <div className="relative">
                  <input
                    type={showTokens ? "text" : "password"}
                    value={setupData.clientSecret}
                    onChange={(e) => handleInputChange('clientSecret', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite seu Client Secret"
                    required
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

              {setupData.clientId && setupData.clientSecret && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Credenciais configuradas</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Você pode prosseguir para a próxima etapa para autorizar o acesso.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuração da Conexão</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Conexão
                </label>
                <input
                  type="text"
                  value={setupData.connectionName}
                  onChange={(e) => handleInputChange('connectionName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome para identificar esta conexão"
                />
              </div>

              {connector.type !== 'file' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID da Conta de Anúncios
                    </label>
                    <input
                      type="text"
                      value={setupData.accountId}
                      onChange={(e) => handleInputChange('accountId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite o ID da sua conta de anúncios"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Autorização OAuth</h4>
                        <p className="text-sm text-blue-700 mt-1 mb-3">
                          Clique no botão abaixo para autorizar o acesso às suas contas de anúncios.
                        </p>
                        <Button
                          onClick={handleOAuthStart}
                          disabled={!setupData.clientId || !setupData.clientSecret}
                          icon={ExternalLink}
                          size="sm"
                        >
                          Iniciar Autorização OAuth
                        </Button>
                      </div>
                    </div>
                  </div>

                  {setupData.accessToken && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">Autorização concluída</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Token de acesso obtido com sucesso. Você pode prosseguir para o teste de conexão.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Teste de Conexão</h3>
              <p className="text-gray-600">
                Vamos testar a conexão com {connector.name} para garantir que tudo está funcionando corretamente.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Resumo da Configuração</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plataforma:</span>
                  <span className="font-medium">{connector.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nome da Conexão:</span>
                  <span className="font-medium">{setupData.connectionName}</span>
                </div>
                {connector.type !== 'file' && setupData.accountId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID da Conta:</span>
                    <span className="font-medium">{setupData.accountId}</span>
                  </div>
                )}
                {connector.type === 'file' && setupData.csvFile && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arquivo:</span>
                    <span className="font-medium">{setupData.csvFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleTestConnection}
                loading={loading}
                icon={loading ? undefined : CheckCircle}
                size="lg"
                className="px-8"
              >
                {loading ? 'Testando Conexão...' : 'Testar e Finalizar'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                {connector.logo === 'csv' ? (
                  <div className="text-2xl">📄</div>
                ) : (
                  <img 
                    src={connector.logo} 
                    alt={connector.name}
                    className="w-8 h-8 object-contain"
                  />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Configurar {connector.name}</h2>
                <p className="text-gray-600">Passo {currentStep} de {steps.length}: {steps[currentStep - 1]?.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-4
                    ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
            icon={currentStep > 1 ? ArrowLeft : undefined}
          >
            {currentStep > 1 ? 'Anterior' : 'Cancelar'}
          </Button>
          
          <div className="space-x-3">
            {currentStep < steps.length ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNext()}
                icon={ArrowRight}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleTestConnection}
                loading={loading}
                disabled={!canProceedToNext()}
                icon={loading ? undefined : CheckCircle}
              >
                {loading ? 'Finalizando...' : 'Finalizar'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};