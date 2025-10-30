import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Zap,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Settings,
  Key,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CampaignSelector } from './CampaignSelector';
import { AIInsightsService, AIInsight, CampaignAnalysis } from '../../lib/aiInsights';
import { Campaign, AdMetrics } from '../../types/advertising';
import { useDashboardData } from '../../hooks/useDashboardData';

interface AIInsightsPanelProps {
  campaigns: Campaign[];
  metrics: AdMetrics[];
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  campaigns: propCampaigns,
  metrics: propMetrics
}) => {
  // Busca dados reais do Supabase quando disponíveis
  const {
    campaigns: realCampaigns,
    metrics: realMetrics,
    isUsingRealData: hasRealData,
    loading: dataLoading
  } = useDashboardData();

  // Usa dados reais se disponíveis, senão usa os passados por props (compatibilidade)
  const campaigns = hasRealData ? realCampaigns : propCampaigns;
  const metrics = hasRealData ? realMetrics : propMetrics;
  const [loading, setLoading] = useState(false);
  const [campaignAnalyses, setCampaignAnalyses] = useState<CampaignAnalysis[]>([]);
  const [optimizationInsights, setOptimizationInsights] = useState<AIInsight[]>([]);
  const [anomalies, setAnomalies] = useState<AIInsight[]>([]);
  const [marketInsights, setMarketInsights] = useState<AIInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'optimization' | 'anomalies' | 'market'>('overview');
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  
  // Selection state
  const [selection, setSelection] = useState({
    platform: '',
    campaigns: [] as string[],
    adSets: [] as string[],
    ads: [] as string[]
  });
  
  // OpenAI API configuration
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiConfigured, setIsApiConfigured] = useState(false);

  const aiService = AIInsightsService.getInstance();

  useEffect(() => {
    // Check if OpenAI API key is configured
    const configuredKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
    setIsApiConfigured(!!configuredKey);
    if (configuredKey) {
      setApiKey(configuredKey);
    }
  }, []);

  const handleSelectionChange = (newSelection: typeof selection) => {
    setSelection(newSelection);
  };

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setIsApiConfigured(true);
      setShowApiConfig(false);
      
      // Update the environment variable for the current session
      (window as any).__OPENAI_API_KEY__ = apiKey.trim();
    }
  };

  const generateInsights = async () => {
    if (!isApiConfigured) {
      setShowApiConfig(true);
      return;
    }

    setLoading(true);
    try {
      let targetCampaigns = campaigns;
      let targetMetrics = metrics;

      // Filter by selection
      if (selection.platform) {
        targetCampaigns = targetCampaigns.filter(c => c.platform.toLowerCase() === selection.platform);
        targetMetrics = targetMetrics.filter(m => {
          const campaign = campaigns.find(c => c.id === m.campaign_id);
          return campaign && campaign.platform.toLowerCase() === selection.platform;
        });
      }

      if (selection.campaigns.length > 0) {
        targetCampaigns = targetCampaigns.filter(c => selection.campaigns.includes(c.id));
        targetMetrics = targetMetrics.filter(m => selection.campaigns.includes(m.campaign_id));
      }

      if (selection.adSets.length > 0) {
        targetMetrics = targetMetrics.filter(m => 
          m.ad_set_id && selection.adSets.includes(m.ad_set_id)
        );
      }

      if (selection.ads.length > 0) {
        targetMetrics = targetMetrics.filter(m => 
          m.ad_id && selection.ads.includes(m.ad_id)
        );
      }

      if (targetCampaigns.length === 0 || targetMetrics.length === 0) {
        alert('Nenhuma campanha ou métrica encontrada para análise com a seleção atual.');
        return;
      }

      // Analyze individual campaigns
      const campaignPromises = targetCampaigns.slice(0, 3).map(async (campaign) => {
        const campaignMetrics = targetMetrics.filter(m => m.campaign_id === campaign.id);
        if (campaignMetrics.length > 0) {
          return await aiService.analyzeCampaignPerformance(campaign, campaignMetrics);
        }
        return null;
      });

      const analyses = await Promise.all(campaignPromises);
      setCampaignAnalyses(analyses.filter(Boolean) as CampaignAnalysis[]);

      // Generate optimization recommendations
      const optimizations = await aiService.generateOptimizationRecommendations(targetCampaigns, targetMetrics);
      setOptimizationInsights(optimizations);

      // Detect anomalies
      const detectedAnomalies = await aiService.detectAnomalies(targetMetrics);
      setAnomalies(detectedAnomalies);

      // Generate market insights
      const marketTrends = await aiService.generateMarketInsights(targetCampaigns, targetMetrics, 'month');
      setMarketInsights(marketTrends);

      setLastAnalysis(new Date().toISOString());
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
      alert('Erro ao gerar insights. Verifique sua chave da API OpenAI e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return BarChart3;
      case 'optimization': return Target;
      case 'trend': return TrendingUp;
      case 'recommendation': return Lightbulb;
      case 'alert': return AlertTriangle;
      default: return Sparkles;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return BarChart3;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderInsightCard = (insight: AIInsight) => {
    const IconComponent = getInsightIcon(insight.type);
    const colorClass = getInsightColor(insight.impact);

    return (
      <Card key={insight.id} className="hover:shadow-lg transition-shadow">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-lg ${colorClass}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
                  {insight.impact.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {insight.confidence}% confiança
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
            
            {insight.recommendations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-900">Recomendações:</h5>
                <ul className="space-y-1">
                  {insight.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                      <ArrowRight className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderOverview = () => {
    const totalInsights = campaignAnalyses.reduce((sum, analysis) => sum + analysis.insights.length, 0) +
                         optimizationInsights.length + anomalies.length + marketInsights.length;
    
    const avgScore = campaignAnalyses.length > 0 
      ? campaignAnalyses.reduce((sum, analysis) => sum + analysis.overall_score, 0) / campaignAnalyses.length
      : 0;

    const highImpactInsights = [
      ...campaignAnalyses.flatMap(a => a.insights),
      ...optimizationInsights,
      ...anomalies,
      ...marketInsights
    ].filter(insight => insight.impact === 'high');

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{totalInsights}</h3>
            <p className="text-sm text-gray-600">Insights Gerados</p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore.toFixed(0)}
            </h3>
            <p className="text-sm text-gray-600">Score Médio</p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-red-600">{highImpactInsights.length}</h3>
            <p className="text-sm text-gray-600">Alto Impacto</p>
          </Card>

          <Card className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-purple-600">{optimizationInsights.length}</h3>
            <p className="text-sm text-gray-600">Otimizações</p>
          </Card>
        </div>

        {/* High Impact Insights */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights de Alto Impacto</h3>
          <div className="space-y-4">
            {highImpactInsights.slice(0, 3).map(renderInsightCard)}
          </div>
        </div>

        {/* Campaign Performance Summary */}
        {campaignAnalyses.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance das Campanhas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignAnalyses.map((analysis) => {
                const TrendIcon = getTrendIcon(analysis.performance_trend);
                const trendColor = getTrendColor(analysis.performance_trend);
                
                return (
                  <Card key={analysis.campaign_id} className="hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 truncate">{analysis.campaign_name}</h4>
                      <span className={`text-2xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                        {analysis.overall_score}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                      <span className={`text-sm font-medium ${trendColor}`}>
                        {analysis.performance_trend === 'improving' ? 'Melhorando' :
                         analysis.performance_trend === 'declining' ? 'Piorando' : 'Estável'}
                      </span>
                      <span className="text-xs text-gray-500">• {analysis.platform}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{analysis.summary}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {analysis.insights.length} insights
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('campaigns')}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'campaigns', label: 'Campanhas', icon: Target },
    { id: 'optimization', label: 'Otimizações', icon: Zap },
    { id: 'anomalies', label: 'Anomalias', icon: AlertTriangle },
    { id: 'market', label: 'Mercado', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Análise com IA</h2>
            <p className="text-gray-600">Análises inteligentes e recomendações estratégicas</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {/* Indicador de fonte de dados */}
          {hasRealData && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Analisando Dados Reais
            </span>
          )}

          {lastAnalysis && (
            <div className="text-sm text-gray-500 text-center sm:text-right">
              Última análise: {new Date(lastAnalysis).toLocaleString('pt-BR')}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiConfig(true)}
            icon={isApiConfigured ? Settings : Key}
          >
            {isApiConfigured ? 'Configurar' : 'Conectar API'}
          </Button>
        </div>
      </div>

      {/* Campaign Selector */}
      <CampaignSelector 
        onSelectionChange={handleSelectionChange} 
        onGenerateAnalysis={generateInsights}
        loading={loading}
      />

      {/* API Configuration Modal */}
      {showApiConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Key className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Configuração da API OpenAI</h2>
                  <p className="text-gray-600">Configure sua chave da API para habilitar análises avançadas</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Como obter sua chave da API</h4>
                    <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                      <li>Acesse <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/api-keys</a></li>
                      <li>Faça login em sua conta OpenAI</li>
                      <li>Clique em "Create new secret key"</li>
                      <li>Copie a chave gerada e cole abaixo</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave da API OpenAI
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sua chave será armazenada localmente no navegador e não será enviada para nossos servidores
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Importante</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      O uso da API OpenAI pode gerar custos. Consulte os preços em{' '}
                      <a href="https://openai.com/pricing" target="_blank" rel="noopener noreferrer" className="underline">
                        openai.com/pricing
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowApiConfig(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleApiKeySubmit}
                disabled={!apiKey.trim()}
                icon={Key}
              >
                Salvar Configuração
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Warning */}
      {!isApiConfigured && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Configuração Necessária</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Configure sua chave da API OpenAI para habilitar análises avançadas com IA.
                <button 
                  onClick={() => setShowApiConfig(true)}
                  className="ml-2 text-yellow-800 underline hover:text-yellow-900"
                >
                  Configurar agora
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Results Section - Only show if we have results */}
      {(campaignAnalyses.length > 0 || optimizationInsights.length > 0 || anomalies.length > 0 || marketInsights.length > 0) && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div>
            {activeTab === 'overview' && renderOverview()}
            
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                {campaignAnalyses.map((analysis) => (
                  <Card key={analysis.campaign_id}>
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{analysis.campaign_name}</h3>
                        <div className="flex items-center space-x-4">
                          <span className={`text-2xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                            {analysis.overall_score}/100
                          </span>
                          <span className="text-sm text-gray-500">{analysis.platform}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 mt-2">{analysis.summary}</p>
                    </div>
                    
                    <div className="space-y-4">
                      {analysis.insights.map(renderInsightCard)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {activeTab === 'optimization' && (
              <div className="space-y-4">
                {optimizationInsights.map(renderInsightCard)}
              </div>
            )}
            
            {activeTab === 'anomalies' && (
              <div className="space-y-4">
                {anomalies.length > 0 ? (
                  anomalies.map(renderInsightCard)
                ) : (
                  <Card className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Anomalia Detectada</h3>
                    <p className="text-gray-600">Suas campanhas estão performando dentro dos padrões esperados.</p>
                  </Card>
                )}
              </div>
            )}
            
            {activeTab === 'market' && (
              <div className="space-y-4">
                {marketInsights.map(renderInsightCard)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};