import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  Key, 
  Link, 
  Settings, 
  Upload, 
  Download,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Globe,
  FileText,
  Database
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DataSourceSetupProps {
  connector: {
    id: string;
    name: string;
    platform: string;
    type: 'advertising' | 'analytics' | 'crm' | 'file';
    logo: string;
    description: string;
    metrics?: string[];
    requiresOAuth: boolean;
    oauthUrl?: string;
  };
  onClose: () => void;
  onComplete: (connectionData: any) => void;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isOptional?: boolean;
}

export const DataSourceSetup: React.FC<DataSourceSetupProps> = ({
  connector,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define steps based on connector type
  const getSteps = (): SetupStep[] => {
    const baseSteps: SetupStep[] = [
      {
        id: 'overview',
        title: 'Visão Geral',
        description: 'Entenda o que será configurado',
        component: OverviewStep
      }
    ];

    if (connector.requiresOAuth) {
      baseSteps.push(
        {
          id: 'credentials',
          title: 'Credenciais da API',
          description: 'Configure suas credenciais de desenvolvedor',
          component: CredentialsStep
        },
        {
          id: 'oauth',
          title: 'Autorização OAuth',
          description: 'Autorize o acesso à sua conta',
          component: OAuthStep
        }
      );
    }

    if (connector.type === 'file') {
      baseSteps.push({
        id: 'upload',
        title: 'Upload de Arquivo',
        description: 'Faça upload do seu arquivo de dados',
        component: FileUploadStep
      });
    } else {
      baseSteps.push({
        id: 'account',
        title: 'Seleção de Conta',
        description: 'Escolha a conta para sincronizar',
        component: AccountSelectionStep
      });
    }

    baseSteps.push(
      {
        id: 'configuration',
        title: 'Configuração',
        description: 'Configure as opções de sincronização',
        component: ConfigurationStep
      },
      {
        id: 'test',
        title: 'Teste de Conexão',
        description: 'Verifique se tudo está funcionando',
        component: TestConnectionStep
      },
      {
        id: 'complete',
        title: 'Concluído',
        description: 'Sua fonte de dados está pronta',
        component: CompletionStep
      }
    );

    return baseSteps;
  };

  const steps = getSteps();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepData = (stepId: string, data: any) => {
    setSetupData(prev => ({
      ...prev,
      [stepId]: data
    }));
  };

  const handleComplete = () => {
    onComplete({
      connector,
      setupData,
      connectionName: `${connector.name} - ${setupData.account?.name || 'Conexão'}`,
      status: 'connected'
    });
  };

  const getCurrentStepComponent = () => {
    const StepComponent = steps[currentStep].component;
    return (
      <StepComponent
        connector={connector}
        setupData={setupData}
        onDataChange={(data: any) => handleStepData(steps[currentStep].id, data)}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onError={setError}
        loading={loading}
        setLoading={setLoading}
      />
    );
  };

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return CheckCircle;
    if (stepIndex === currentStep) return Loader;
    return Database;
  };

  const getStepColor = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'text-green-600 bg-green-100';
    if (stepIndex === currentStep) return 'text-blue-600 bg-blue-100';
    return 'text-gray-400 bg-gray-100';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center">
                {connector.logo === 'csv' ? (
                  <FileText className="w-8 h-8 text-orange-600" />
                ) : connector.logo === 'google-analytics' ? (
                  <Globe className="w-8 h-8 text-blue-600" />
                ) : (
                  <img
                    src={connector.logo}
                    alt={connector.name}
                    className="w-8 h-8 object-contain"
                  />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Configurar {connector.name}
                </h2>
                <p className="text-gray-600">
                  Passo {currentStep + 1} de {steps.length}: {steps[currentStep].title}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = getStepIcon(index);
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center space-x-2 ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`p-2 rounded-full ${getStepColor(index)}`}>
                      <StepIcon className={`w-4 h-4 ${
                        isActive && index === currentStep ? 'animate-spin' : ''
                      }`} />
                    </div>
                    <div className="hidden sm:block">
                      <div className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {getCurrentStepComponent()}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-gray-200 flex justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            icon={ArrowLeft}
          >
            Anterior
          </Button>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleComplete} icon={Check}>
                Finalizar Configuração
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                icon={ArrowRight}
                iconPosition="right"
                disabled={loading}
              >
                Próximo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const OverviewStep: React.FC<any> = ({ connector, onNext }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'advertising': return Zap;
      case 'analytics': return Globe;
      case 'crm': return Database;
      case 'file': return FileText;
      default: return Database;
    }
  };

  const TypeIcon = getTypeIcon(connector.type);

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          {connector.logo === 'csv' ? (
            <FileText className="w-10 h-10 text-orange-600" />
          ) : connector.logo === 'google-analytics' ? (
            <Globe className="w-10 h-10 text-blue-600" />
          ) : (
            <img
              src={connector.logo}
              alt={connector.name}
              className="w-10 h-10 object-contain"
            />
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{connector.name}</h3>
        <p className="text-gray-600 mb-4">{connector.description}</p>
        
        <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          <TypeIcon className="w-4 h-4 mr-2" />
          {connector.type}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h4 className="font-semibold text-gray-900 mb-3">Métricas Disponíveis</h4>
          <div className="space-y-2">
            {connector.metrics?.map((metric, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">{metric}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 className="font-semibold text-gray-900 mb-3">Processo de Configuração</h4>
          <div className="space-y-2">
            {connector.requiresOAuth ? (
              <>
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">Configurar credenciais da API</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Link className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">Autorização OAuth</span>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700">Upload de arquivo</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">Configuração de sincronização</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-700">Teste de conexão</span>
            </div>
          </div>
        </Card>
      </div>

      {connector.requiresOAuth && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Requisitos</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Você precisará de uma conta de desenvolvedor no {connector.platform} e 
                credenciais de API válidas para continuar.
              </p>
              <a 
                href={connector.oauthUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-800 underline hover:text-yellow-900 mt-2 inline-flex items-center"
              >
                Acessar documentação <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <Button onClick={onNext} size="lg" icon={ArrowRight} iconPosition="right">
          Começar Configuração
        </Button>
      </div>
    </div>
  );
};

const CredentialsStep: React.FC<any> = ({ connector, setupData, onDataChange, onNext, onError }) => {
  const [credentials, setCredentials] = useState({
    clientId: setupData.credentials?.clientId || '',
    clientSecret: setupData.credentials?.clientSecret || '',
    developerToken: setupData.credentials?.developerToken || ''
  });
  const [showSecrets, setShowSecrets] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    const newCredentials = { ...credentials, [field]: value };
    setCredentials(newCredentials);
    onDataChange(newCredentials);
  };

  const handleContinue = () => {
    if (!credentials.clientId || !credentials.clientSecret) {
      onError('Por favor, preencha todas as credenciais obrigatórias.');
      return;
    }
    onNext();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Credenciais da API {connector.platform}
        </h3>
        <p className="text-gray-600">
          Configure suas credenciais de desenvolvedor para acessar a API
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Key className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Como obter suas credenciais</h4>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Acesse o painel de desenvolvedor do {connector.platform}</li>
              <li>Crie um novo aplicativo ou projeto</li>
              <li>Configure as URLs de redirecionamento</li>
              <li>Copie o Client ID e Client Secret</li>
            </ol>
            <a 
              href={connector.oauthUrl} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-800 underline hover:text-blue-900 mt-2 inline-flex items-center"
            >
              Acessar painel de desenvolvedor <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client ID *
          </label>
          <div className="relative">
            <input
              type="text"
              value={credentials.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite seu Client ID"
              required
            />
            <button
              type="button"
              onClick={() => copyToClipboard(credentials.clientId)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              disabled={!credentials.clientId}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Secret *
          </label>
          <div className="relative">
            <input
              type={showSecrets ? "text" : "password"}
              value={credentials.clientSecret}
              onChange={(e) => handleInputChange('clientSecret', e.target.value)}
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite seu Client Secret"
              required
            />
            <div className="absolute right-3 top-2.5 flex space-x-1">
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(credentials.clientSecret)}
                className="text-gray-400 hover:text-gray-600"
                disabled={!credentials.clientSecret}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {connector.platform === 'Google' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Developer Token
            </label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"}
                value={credentials.developerToken}
                onChange={(e) => handleInputChange('developerToken', e.target.value)}
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Token de desenvolvedor (opcional)"
              />
              <div className="absolute right-3 top-2.5 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(credentials.developerToken)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={!credentials.developerToken}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Necessário apenas para Google Ads API
            </p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">URLs de Redirecionamento OAuth</h4>
        <p className="text-sm text-gray-600 mb-3">
          Configure estas URLs no painel de desenvolvedor do {connector.platform}:
        </p>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 bg-white border rounded-lg p-2">
            <code className="flex-1 text-sm text-gray-800">
              {window.location.origin}/oauth-callback
            </code>
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/oauth-callback`)}
              className="text-blue-600 hover:text-blue-700"
              title="Copiar URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2 bg-white border rounded-lg p-2">
            <code className="flex-1 text-sm text-gray-800">
              {window.location.origin}/
            </code>
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/`)}
              className="text-blue-600 hover:text-blue-700"
              title="Copiar URL"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Adicione ambas as URLs no campo "Valid OAuth Redirect URIs" ou equivalente
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Importante: Domínios do App</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Para {connector.platform}, você também precisa adicionar o domínio <strong>{window.location.hostname}</strong> na seção "Domínios do App" nas configurações.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          onClick={handleContinue}
          disabled={!credentials.clientId || !credentials.clientSecret}
          size="lg"
          icon={ArrowRight}
          iconPosition="right"
        >
          Continuar para OAuth
        </Button>
      </div>
    </div>
  );
};

const OAuthStep: React.FC<any> = ({ connector, setupData, onDataChange, onNext, onError, loading, setLoading }) => {
  const [oauthStatus, setOauthStatus] = useState<'pending' | 'authorizing' | 'success' | 'error'>('pending');
  const [accessToken, setAccessToken] = useState('');

  const initiateOAuth = () => {
    setLoading(true);
    setOauthStatus('authorizing');

    const { clientId } = setupData.credentials;
    // Usa a URL do ambiente ou a URL atual do navegador
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/oauth-callback`;

    console.log('Iniciando OAuth com redirect_uri:', redirectUri);

    let authUrl = '';

    switch (connector.platform.toLowerCase()) {
      case 'meta':
        const scope = 'ads_read,ads_management,business_management';
        authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${Date.now()}`;
        break;
      case 'google':
        const googleScope = 'https://www.googleapis.com/auth/adwords';
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${googleScope}&response_type=code&access_type=offline&prompt=consent`;
        break;
      case 'tiktok':
        const tiktokScope = 'user_info:read,advertiser_management:read,campaign_management:read,reporting:read';
        authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${tiktokScope}&response_type=code`;
        break;
    }
    
    // Open OAuth window
    const oauthWindow = window.open(authUrl, 'oauth', 'width=600,height=600');
    
    // Listen for OAuth callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'oauth-callback') {
        if (event.data.error) {
          setOauthStatus('error');
          onError(`Erro OAuth: ${event.data.error}`);
        } else if (event.data.code) {
          // Exchange code for token (simulated)
          setTimeout(() => {
            const mockToken = `mock_token_${Date.now()}`;
            setAccessToken(mockToken);
            setOauthStatus('success');
            onDataChange({ accessToken: mockToken, code: event.data.code });
            setLoading(false);
          }, 2000);
        }
        
        if (oauthWindow) {
          oauthWindow.close();
        }
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Check if window was closed manually
    const checkClosed = setInterval(() => {
      if (oauthWindow?.closed) {
        clearInterval(checkClosed);
        setLoading(false);
        setOauthStatus('pending');
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };

  const handleContinue = () => {
    if (oauthStatus === 'success') {
      onNext();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Autorização OAuth
        </h3>
        <p className="text-gray-600">
          Autorize o acesso à sua conta {connector.platform}
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {oauthStatus === 'pending' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Link className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Pronto para Autorizar</h4>
            <p className="text-sm text-gray-600 mb-4">
              Clique no botão abaixo para abrir a janela de autorização do {connector.platform}
            </p>
            <Button onClick={initiateOAuth} icon={ExternalLink}>
              Autorizar Acesso
            </Button>
          </Card>
        )}

        {oauthStatus === 'authorizing' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <Loader className="w-8 h-8 text-yellow-600 animate-spin" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Aguardando Autorização</h4>
            <p className="text-sm text-gray-600">
              Complete a autorização na janela que foi aberta
            </p>
          </Card>
        )}

        {oauthStatus === 'success' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Autorização Concluída!</h4>
            <p className="text-sm text-gray-600 mb-4">
              Acesso autorizado com sucesso. Token de acesso obtido.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <code className="text-xs text-gray-600">
                Token: {accessToken.substring(0, 20)}...
              </code>
            </div>
            <Button onClick={handleContinue} icon={ArrowRight} iconPosition="right">
              Continuar
            </Button>
          </Card>
        )}

        {oauthStatus === 'error' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Erro na Autorização</h4>
            <p className="text-sm text-gray-600 mb-4">
              Ocorreu um erro durante a autorização. Tente novamente.
            </p>
            <Button onClick={() => setOauthStatus('pending')} variant="outline">
              Tentar Novamente
            </Button>
          </Card>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Dicas para Autorização</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Certifique-se de estar logado na conta correta do {connector.platform}</li>
              <li>• Permita pop-ups no seu navegador</li>
              <li>• Aceite todas as permissões solicitadas</li>
              <li>• Não feche a janela de autorização manualmente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const FileUploadStep: React.FC<any> = ({ connector, setupData, onDataChange, onNext, onError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('csv')) {
      onError('Por favor, selecione um arquivo CSV válido.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      onError('O arquivo deve ter no máximo 10MB.');
      return;
    }

    setFile(selectedFile);
    
    // Preview CSV content
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').slice(0, 6); // First 5 rows + header
      const rows = lines.map(line => line.split(','));
      setPreview(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      onDataChange({
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        preview: preview
      });
      setUploading(false);
      onNext();
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Upload de Arquivo CSV
        </h3>
        <p className="text-gray-600">
          Faça upload do seu arquivo de dados para análise
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 mb-2">Selecione seu arquivo CSV</h4>
            <p className="text-sm text-gray-600 mb-4">
              Arraste e solte ou clique para selecionar
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Selecionar Arquivo
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Máximo 10MB • Formato CSV
            </p>
          </div>
        ) : (
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900">{file.name}</h4>
                <p className="text-sm text-gray-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            {preview.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Prévia dos Dados</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {preview[0]?.map((header, index) => (
                          <th key={index} className="px-2 py-1 text-left font-medium text-gray-700">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-2 py-1 text-gray-600">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                }}
                className="flex-1"
              >
                Trocar Arquivo
              </Button>
              <Button
                onClick={handleUpload}
                loading={uploading}
                className="flex-1"
                icon={Upload}
              >
                {uploading ? 'Enviando...' : 'Fazer Upload'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Formato do Arquivo</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Certifique-se de que seu arquivo CSV contém colunas como: Data, Impressões, 
              Cliques, Gasto, Conversões, etc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountSelectionStep: React.FC<any> = ({ connector, setupData, onDataChange, onNext }) => {
  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Conta Principal', type: 'Business', status: 'Active' },
    { id: '2', name: 'Conta Secundária', type: 'Personal', status: 'Active' },
    { id: '3', name: 'Teste', type: 'Business', status: 'Limited' }
  ]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    const account = accounts.find(acc => acc.id === accountId);
    onDataChange(account);
  };

  const handleContinue = () => {
    if (selectedAccount) {
      onNext();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Selecionar Conta
        </h3>
        <p className="text-gray-600">
          Escolha a conta {connector.platform} que deseja conectar
        </p>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => handleAccountSelect(account.id)}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              selectedAccount === account.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{account.name}</h4>
                <p className="text-sm text-gray-600">
                  {account.type} • {account.status}
                </p>
              </div>
              {selectedAccount === account.id && (
                <CheckCircle className="w-5 h-5 text-blue-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={handleContinue}
          disabled={!selectedAccount}
          size="lg"
          icon={ArrowRight}
          iconPosition="right"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

const ConfigurationStep: React.FC<any> = ({ connector, setupData, onDataChange, onNext }) => {
  const [config, setConfig] = useState({
    syncFrequency: 'daily',
    includeHistorical: true,
    historicalDays: 30,
    autoSync: true,
    notifications: true
  });

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onDataChange(newConfig);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Configuração de Sincronização
        </h3>
        <p className="text-gray-600">
          Configure como os dados serão sincronizados
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Frequência de Sincronização
          </label>
          <div className="space-y-2">
            {[
              { value: 'hourly', label: 'A cada hora', description: 'Dados sempre atualizados' },
              { value: 'daily', label: 'Diariamente', description: 'Recomendado para a maioria dos casos' },
              { value: 'weekly', label: 'Semanalmente', description: 'Para análises menos frequentes' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleConfigChange('syncFrequency', option.value)}
                className={`w-full p-3 border rounded-lg text-left transition-all ${
                  config.syncFrequency === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                  {config.syncFrequency === option.value && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Incluir Dados Históricos</h4>
              <p className="text-sm text-gray-600">Importar dados dos últimos dias</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeHistorical}
                onChange={(e) => handleConfigChange('includeHistorical', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {config.includeHistorical && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias de Histórico
              </label>
              <select
                value={config.historicalDays}
                onChange={(e) => handleConfigChange('historicalDays', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={365}>1 ano</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Sincronização Automática</h4>
              <p className="text-sm text-gray-600">Manter dados sempre atualizados</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoSync}
                onChange={(e) => handleConfigChange('autoSync', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Notificações</h4>
              <p className="text-sm text-gray-600">Receber alertas sobre sincronização</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.notifications}
                onChange={(e) => handleConfigChange('notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button onClick={onNext} size="lg" icon={ArrowRight} iconPosition="right">
          Continuar
        </Button>
      </div>
    </div>
  );
};

const TestConnectionStep: React.FC<any> = ({ connector, setupData, onDataChange, onNext, setLoading, loading }) => {
  const [testStatus, setTestStatus] = useState<'pending' | 'testing' | 'success' | 'error'>('pending');
  const [testResults, setTestResults] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setTestStatus('testing');

    // Simulate connection test
    setTimeout(() => {
      const mockResults = {
        connection: true,
        authentication: true,
        dataAccess: true,
        accountsFound: 3,
        campaignsFound: 12,
        lastDataPoint: new Date().toISOString()
      };

      setTestResults(mockResults);
      setTestStatus('success');
      onDataChange(mockResults);
      setLoading(false);
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Teste de Conexão
        </h3>
        <p className="text-gray-600">
          Vamos verificar se tudo está funcionando corretamente
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {testStatus === 'pending' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Pronto para Testar</h4>
            <p className="text-sm text-gray-600 mb-4">
              Clique no botão abaixo para testar a conexão com {connector.name}
            </p>
            <Button onClick={runTest} icon={Zap}>
              Executar Teste
            </Button>
          </Card>
        )}

        {testStatus === 'testing' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <Loader className="w-8 h-8 text-yellow-600 animate-spin" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Testando Conexão</h4>
            <p className="text-sm text-gray-600">
              Verificando autenticação e acesso aos dados...
            </p>
          </Card>
        )}

        {testStatus === 'success' && testResults && (
          <Card>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Teste Concluído!</h4>
              <p className="text-sm text-gray-600">
                Conexão estabelecida com sucesso
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Conexão</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Autenticação</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Acesso aos Dados</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Contas Encontradas</span>
                <span className="text-sm font-medium text-gray-900">{testResults.accountsFound}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Campanhas Encontradas</span>
                <span className="text-sm font-medium text-gray-900">{testResults.campaignsFound}</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Button onClick={onNext} icon={ArrowRight} iconPosition="right">
                Finalizar Configuração
              </Button>
            </div>
          </Card>
        )}

        {testStatus === 'error' && (
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Erro no Teste</h4>
            <p className="text-sm text-gray-600 mb-4">
              Não foi possível estabelecer a conexão. Verifique suas configurações.
            </p>
            <Button onClick={runTest} variant="outline">
              Tentar Novamente
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

const CompletionStep: React.FC<any> = ({ connector, setupData }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Configuração Concluída!
        </h3>
        <p className="text-gray-600 mb-6">
          Sua fonte de dados {connector.name} foi configurada com sucesso
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <Card>
          <h4 className="font-semibold text-gray-900 mb-4">Resumo da Configuração</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fonte de Dados</span>
              <span className="text-sm font-medium text-gray-900">{connector.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tipo</span>
              <span className="text-sm font-medium text-gray-900">{connector.type}</span>
            </div>
            {setupData.account && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Conta</span>
                <span className="text-sm font-medium text-gray-900">{setupData.account.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sincronização</span>
              <span className="text-sm font-medium text-gray-900">
                {setupData.configuration?.syncFrequency || 'Diária'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                <CheckCircle className="w-3 h-3 mr-1" />
                Conectado
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Próximos Passos</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• A primeira sincronização será iniciada automaticamente</li>
              <li>• Os dados aparecerão no dashboard em alguns minutos</li>
              <li>• Você pode configurar alertas e relatórios personalizados</li>
              <li>• Acesse "Fontes de Dados" para gerenciar esta conexão</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};