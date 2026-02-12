/**
 * DataExtractorPage - Pagina principal de extracao de dados
 *
 * Interface completa para conexao e extracao de dados do Meta Ads:
 * 1. Conexao de conta Meta (OAuth)
 * 2. Gerenciamento de fontes conectadas
 * 3. Selecao de campos e breakdowns
 * 4. Periodo de datas
 * 5. Execucao e preview dos resultados
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  Play,
  Loader,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  Save,
  FileSpreadsheet,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  Link,
  Trash2,
  Zap,
  LayoutDashboard,
  Eye,
  X,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FieldSelector } from './FieldSelector';
import { BreakdownPicker } from './BreakdownPicker';
import { SimpleMetaConnect } from '../dashboard/SimpleMetaConnect';
import { DynamicDashboard } from '../dynamic-dashboard';
import { supabase } from '../../lib/supabase';
import { ConfigurableExtractService } from '../../lib/services/ConfigurableExtractService';
import { dataSetService } from '../../lib/services/DataSetService';
import { autoDashboardService } from '../../lib/services/AutoDashboardService';
import { DATE_PRESETS, DEFAULT_TEMPLATES } from '../../constants/fieldCatalog';
import type {
  ReportLevel,
  DatePreset,
  ExtractionConfig,
  ExtractionResult,
  ExtractionProgress,
  ReportTemplate,
} from '../../types/extraction';

// ============================================
// Tipos para fontes de dados
// ============================================

interface DataSource {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync: string;
  config?: any;
  logo: string;
  description: string;
  error?: string;
}

// ============================================
// Componente Principal
// ============================================

export const DataExtractorPage: React.FC = () => {
  // Estados de conexao e fontes
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [showConnectSection, setShowConnectSection] = useState(true);

  // Estados de configuracao
  const [level, setLevel] = useState<ReportLevel>('campaign');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'campaign_name',
    'impressions',
    'reach',
    'clicks',
    'spend',
  ]);
  const [selectedBreakdowns, setSelectedBreakdowns] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [includeToday, setIncludeToday] = useState(true);

  // Estados de template
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Estados de extracao
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de UI
  const [expandedSections, setExpandedSections] = useState({
    connection: true,
    sources: true,
    config: true,
    fields: true,
    breakdowns: false,
    dateRange: true,
    templates: false,
  });

  // Estados para salvar e gerar dashboard
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDashboardPreview, setShowDashboardPreview] = useState(false);
  const [dataSetName, setDataSetName] = useState('');
  const [dataSetDescription, setDataSetDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDashboardId, setSavedDashboardId] = useState<string | null>(null);
  const [generatedWidgets, setGeneratedWidgets] = useState<any[]>([]);

  // Carregar conexoes ao montar
  useEffect(() => {
    loadConnections();
    loadDataSources();
    loadTemplates();
  }, []);

  // Carregar fontes de dados (data_connections)
  const loadDataSources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear para o formato DataSource
      const sources: DataSource[] = (data || []).map(conn => ({
        id: conn.id,
        name: conn.name,
        platform: conn.platform,
        type: conn.type,
        status: conn.status,
        lastSync: conn.last_sync,
        config: conn.config,
        logo: conn.logo,
        description: conn.description,
        error: conn.error,
      }));

      setDataSources(sources);

      // Se tem conexoes, esconde a secao de conectar
      if (sources.length > 0) {
        setShowConnectSection(false);
      }
    } catch (err: any) {
      console.error('Erro ao carregar fontes:', err);
    }
  };

  // Carregar conexoes Meta ativas
  const loadConnections = async () => {
    try {
      setLoadingConnections(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'Meta')
        .eq('status', 'connected');

      if (error) throw error;

      setConnections(data || []);

      // Selecionar primeira conexao automaticamente
      if (data && data.length > 0) {
        setSelectedConnection(data[0].id);
        setAccountId(data[0].config?.accountId || '');
      }
    } catch (err: any) {
      console.error('Erro ao carregar conexoes:', err);
      setError('Erro ao carregar conexoes');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Carregar templates salvos
  const loadTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'meta')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    }
  };

  // Sincronizar fonte de dados
  const handleSync = async (sourceId: string) => {
    setSyncingIds(prev => new Set(prev).add(sourceId));

    try {
      // Buscar token de acesso
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('connection_id', sourceId)
        .maybeSingle();

      if (!tokenData?.access_token) {
        throw new Error('Token nao encontrado');
      }

      // Atualizar status para sincronizando
      await supabase
        .from('data_connections')
        .update({ status: 'syncing' })
        .eq('id', sourceId);

      // Simular sincronizacao (aqui voce pode chamar o servico real)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Atualizar status e data de sincronizacao
      await supabase
        .from('data_connections')
        .update({
          status: 'connected',
          last_sync: new Date().toISOString(),
        })
        .eq('id', sourceId);

      await loadDataSources();
    } catch (err: any) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar: ' + err.message);
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  // Remover fonte de dados
  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Tem certeza que deseja remover esta fonte de dados?')) return;

    try {
      // Remover token OAuth
      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('connection_id', sourceId);

      // Remover conexao
      await supabase
        .from('data_connections')
        .delete()
        .eq('id', sourceId);

      await loadDataSources();
      await loadConnections();

      // Se nao tem mais conexoes, mostra a secao de conectar
      if (dataSources.length <= 1) {
        setShowConnectSection(true);
      }
    } catch (err: any) {
      console.error('Erro ao remover fonte:', err);
      setError('Erro ao remover fonte');
    }
  };

  // Aplicar template selecionado
  const applyTemplate = (templateId: string) => {
    // Verificar se e um template padrao
    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.name === templateId);
    if (defaultTemplate) {
      setLevel(defaultTemplate.level);
      setSelectedFields(defaultTemplate.fields);
      setSelectedBreakdowns(defaultTemplate.breakdowns);
      setSelectedTemplate(templateId);
      return;
    }

    // Ou um template salvo
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setLevel(template.level);
      setSelectedFields(template.selectedFields);
      setSelectedBreakdowns(template.breakdowns);
      if (template.datePreset) {
        setDatePreset(template.datePreset);
      }
      setSelectedTemplate(templateId);
    }
  };

  // Salvar novo template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Informe um nome para o template');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { error } = await supabase.from('report_templates').insert({
        user_id: user.id,
        name: templateName,
        level,
        platform: 'meta',
        selected_fields: selectedFields,
        breakdowns: selectedBreakdowns,
        date_preset: datePreset,
      });

      if (error) throw error;

      setShowSaveTemplate(false);
      setTemplateName('');
      loadTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Callback de progresso
  const handleProgress = useCallback((progress: ExtractionProgress) => {
    setExtractionProgress(progress);
  }, []);

  // Executar extracao
  const handleExtract = async () => {
    if (!selectedConnection || !accountId) {
      setError('Selecione uma conta de anuncios');
      return;
    }

    if (selectedFields.length === 0) {
      setError('Selecione pelo menos um campo');
      return;
    }

    setIsExtracting(true);
    setExtractionResult(null);
    setError(null);
    setExtractionProgress(null);

    try {
      // Buscar token de acesso
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('access_token')
        .eq('connection_id', selectedConnection)
        .maybeSingle();

      const accessToken = tokenData?.access_token;

      if (!accessToken) {
        throw new Error('Token de acesso nao encontrado. Reconecte sua conta Meta.');
      }

      // Criar configuracao de extracao
      const config: ExtractionConfig = {
        connectionId: selectedConnection,
        accountId,
        level,
        selectedFields,
        breakdowns: selectedBreakdowns,
        conversions: [],
        dateRange: {
          preset: datePreset,
          startDate: datePreset === 'custom' ? customStartDate : undefined,
          endDate: datePreset === 'custom' ? customEndDate : undefined,
          includeToday,
        },
        templateId: selectedTemplate || undefined,
      };

      // Executar extracao
      const service = new ConfigurableExtractService(accessToken, handleProgress);
      const result = await service.extract(config);

      setExtractionResult(result);

      if (!result.success) {
        setError(result.error || 'Erro desconhecido na extracao');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  // Exportar para CSV
  const exportToCSV = () => {
    if (!extractionResult || extractionResult.data.length === 0) return;

    const headers = extractionResult.columns.map(c => c.displayName);
    const rows = extractionResult.data.map(row =>
      extractionResult.columns.map(c => row[c.field] ?? '')
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meta_ads_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Toggle de secao
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helpers de status
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

  // Verifica se tem conexao Meta ativa
  const hasMetaConnection = connections.length > 0;

  // Gerar preview do dashboard (sem salvar)
  const handlePreviewDashboard = () => {
    if (!extractionResult || !extractionResult.success) return;

    // Analisa dados e gera widgets para preview
    const mockDataSet = {
      id: 'preview',
      user_id: '',
      client_id: null,
      connection_id: null,
      name: 'Preview',
      description: null,
      platform: 'meta',
      extraction_config: {} as ExtractionConfig,
      data: extractionResult.data,
      columns_meta: extractionResult.columns,
      date_range_start: extractionResult.dateRange.start,
      date_range_end: extractionResult.dateRange.end,
      record_count: extractionResult.data.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Gerar widgets usando o mesmo algoritmo do serviço
    const metrics = extractionResult.columns
      .filter(c => ['number', 'currency', 'percentage'].includes(c.dataType))
      .map(c => c.field);

    const widgets = [
      // KPIs para primeiras 4 métricas
      ...metrics.slice(0, 4).map((metric, idx) => ({
        id: `kpi-${idx}`,
        type: 'kpi' as const,
        title: extractionResult.columns.find(c => c.field === metric)?.displayName || metric,
        size: 'small' as const,
        position: { row: 0, col: idx },
        config: {
          metric,
          aggregation: 'sum',
          format: metric.includes('spend') || metric.includes('cost') ? 'currency' : 'number',
          chartColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'][idx],
          showTrend: true,
        },
      })),
      // Tabela de dados
      {
        id: 'table-1',
        type: 'data_table' as const,
        title: 'Dados Extraídos',
        size: 'full' as const,
        position: { row: 1, col: 0 },
        config: {
          metrics: extractionResult.columns.map(c => c.field).slice(0, 10),
          sortOrder: 'desc',
          limit: 20,
        },
      },
    ];

    setGeneratedWidgets(widgets);
    setShowDashboardPreview(true);
  };

  // Salvar dados e gerar dashboard
  const handleSaveAndGenerateDashboard = async () => {
    if (!extractionResult || !extractionResult.success) return;
    if (!dataSetName.trim()) {
      setError('Informe um nome para o conjunto de dados');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Criar configuração de extração para salvar
      const extractionConfig: ExtractionConfig = {
        connectionId: selectedConnection,
        accountId,
        level,
        selectedFields,
        breakdowns: selectedBreakdowns,
        conversions: [],
        dateRange: {
          preset: datePreset,
          startDate: datePreset === 'custom' ? customStartDate : undefined,
          endDate: datePreset === 'custom' ? customEndDate : undefined,
          includeToday,
        },
      };

      // 2. Salvar data set
      const saveResult = await dataSetService.createFromExtraction(
        dataSetName,
        dataSetDescription || undefined,
        extractionResult,
        extractionConfig
      );

      if (!saveResult.success || !saveResult.dataSet) {
        throw new Error(saveResult.error || 'Erro ao salvar dados');
      }

      // 3. Gerar dashboard automaticamente
      const dashboardResult = await autoDashboardService.generateFromDataSet(
        saveResult.dataSet,
        `Dashboard - ${dataSetName}`
      );

      if (!dashboardResult.success) {
        throw new Error(dashboardResult.error || 'Erro ao gerar dashboard');
      }

      // 4. Salvar ID do dashboard e fechar modal
      setSavedDashboardId(dashboardResult.dashboard?.id || null);
      setShowSaveModal(false);
      setDataSetName('');
      setDataSetDescription('');

      // 5. Disparar evento para navegação (opcional)
      window.dispatchEvent(new CustomEvent('dashboardCreated', {
        detail: {
          dashboardId: dashboardResult.dashboard?.id,
          dataSetId: saveResult.dataSet.id,
        }
      }));

      // Mostrar sucesso
      alert(`Dashboard "${dataSetName}" criado com sucesso! Você pode acessá-lo em "Meus Dashboards".`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Extrair Dados</h1>
            <p className="text-gray-600">Conecte e extraia dados do Meta Ads</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {extractionResult && extractionResult.success && (
            <Button onClick={exportToCSV} icon={Download} variant="outline">
              Exportar CSV
            </Button>
          )}
          <Button
            onClick={handleExtract}
            icon={isExtracting ? Loader : Play}
            loading={isExtracting}
            disabled={isExtracting || !selectedConnection || selectedFields.length === 0}
          >
            {isExtracting ? 'Extraindo...' : 'Extrair Dados'}
          </Button>
        </div>
      </div>

      {/* Banner de alerta quando nao ha conexao */}
      {!hasMetaConnection && !loadingConnections && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Nenhuma conta conectada</p>
            <p className="text-sm text-amber-700 mt-1">
              Conecte sua conta Meta Ads abaixo para extrair dados das suas campanhas.
            </p>
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 underline mt-1"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isExtracting && extractionProgress && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-medium text-gray-900">Extraindo dados...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${extractionProgress.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{extractionProgress.message}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna de configuracao */}
        <div className="lg:col-span-2 space-y-4">
          {/* Secao: Conectar Conta */}
          <Card>
            <button
              type="button"
              onClick={() => toggleSection('connection')}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Link className="w-5 h-5" />
                Conectar Conta
              </h3>
              {expandedSections.connection ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.connection && (
              <div className="mt-4">
                {/* Grid com Meta e Google Ads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SimpleMetaConnect integrado */}
                  <SimpleMetaConnect />

                  {/* Placeholder Google Ads - Em breve */}
                  <Card className="opacity-70 cursor-not-allowed relative bg-gray-50/80 hover:opacity-70 transition-opacity">
                    {/* Badge "Em breve" */}
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
                            <p className="text-sm text-gray-600">Search, Display, YouTube</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Conexao com Google Ads sera disponibilizada em breve.
                      </p>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Card>

          {/* Secao: Fontes Conectadas */}
          {dataSources.length > 0 && (
            <Card>
              <button
                type="button"
                onClick={() => toggleSection('sources')}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Contas Conectadas
                  <span className="text-sm font-normal text-gray-500">
                    ({dataSources.length})
                  </span>
                </h3>
                {expandedSections.sources ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {expandedSections.sources && (
                <div className="mt-4 space-y-3">
                  {dataSources.map((source) => {
                    const isCurrentlySyncing = syncingIds.has(source.id);

                    return (
                      <div
                        key={source.id}
                        className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                              <img
                                src={source.logo}
                                alt={source.name}
                                className="w-6 h-6 object-contain"
                              />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{source.name}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(isCurrentlySyncing ? 'syncing' : source.status)}`}>
                                  {source.status === 'connected' && !isCurrentlySyncing && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {source.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                                  {isCurrentlySyncing && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                                  {getStatusText(isCurrentlySyncing ? 'syncing' : source.status)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Sync: {new Date(source.lastSync).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
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
                              onClick={() => handleDeleteSource(source.id)}
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {source.error && (
                          <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {source.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Secao: Configuracao */}
          <Card className={!hasMetaConnection ? 'opacity-60 pointer-events-none' : ''}>
            <button
              type="button"
              onClick={() => toggleSection('config')}
              className="w-full flex items-center justify-between"
              disabled={!hasMetaConnection}
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuracao
              </h3>
              {expandedSections.config ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.config && (
              <div className="mt-4 space-y-4">
                {/* Selecao de conta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta de Anuncios
                  </label>
                  {loadingConnections ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader className="w-4 h-4 animate-spin" />
                      Carregando...
                    </div>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhuma conta Meta conectada. Conecte sua conta acima.
                    </p>
                  ) : (
                    <select
                      value={selectedConnection}
                      onChange={e => {
                        setSelectedConnection(e.target.value);
                        const conn = connections.find(c => c.id === e.target.value);
                        setAccountId(conn?.config?.accountId || '');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {connections.map(conn => (
                        <option key={conn.id} value={conn.id}>
                          {conn.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Nivel do relatorio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nivel do Relatorio
                  </label>
                  <div className="flex gap-2">
                    {(['campaign', 'adset', 'ad'] as ReportLevel[]).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${level === l
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                          }
                        `}
                      >
                        {l === 'campaign' && 'Campaign'}
                        {l === 'adset' && 'Ad Set'}
                        {l === 'ad' && 'Ad'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Secao: Campos */}
          <Card className={!hasMetaConnection ? 'opacity-60 pointer-events-none' : ''}>
            <button
              type="button"
              onClick={() => toggleSection('fields')}
              className="w-full flex items-center justify-between"
              disabled={!hasMetaConnection}
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Campos
                <span className="text-sm font-normal text-gray-500">
                  ({selectedFields.length} selecionados)
                </span>
              </h3>
              {expandedSections.fields ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.fields && (
              <div className="mt-4">
                <FieldSelector
                  selectedFields={selectedFields}
                  onChange={setSelectedFields}
                  level={level}
                />
              </div>
            )}
          </Card>

          {/* Secao: Breakdowns */}
          <Card className={!hasMetaConnection ? 'opacity-60 pointer-events-none' : ''}>
            <button
              type="button"
              onClick={() => toggleSection('breakdowns')}
              className="w-full flex items-center justify-between"
              disabled={!hasMetaConnection}
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Breakdowns
                <span className="text-sm font-normal text-gray-500">
                  ({selectedBreakdowns.length} selecionados)
                </span>
              </h3>
              {expandedSections.breakdowns ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.breakdowns && (
              <div className="mt-4">
                <BreakdownPicker
                  selectedBreakdowns={selectedBreakdowns}
                  onChange={setSelectedBreakdowns}
                />
              </div>
            )}
          </Card>

          {/* Secao: Periodo */}
          <Card className={!hasMetaConnection ? 'opacity-60 pointer-events-none' : ''}>
            <button
              type="button"
              onClick={() => toggleSection('dateRange')}
              className="w-full flex items-center justify-between"
              disabled={!hasMetaConnection}
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Periodo
              </h3>
              {expandedSections.dateRange ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.dateRange && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodo
                  </label>
                  <select
                    value={datePreset}
                    onChange={e => setDatePreset(e.target.value as DatePreset)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {DATE_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                {datePreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data inicial
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data final
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeToday}
                    onChange={e => setIncludeToday(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Incluir hoje</span>
                </label>
              </div>
            )}
          </Card>
        </div>

        {/* Coluna lateral: Templates e Resultado */}
        <div className="space-y-4">
          {/* Templates */}
          <Card className={!hasMetaConnection ? 'opacity-60 pointer-events-none' : ''}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5" />
              Templates
            </h3>

            <div className="space-y-3">
              {/* Templates padrao */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Templates padrao</p>
                {DEFAULT_TEMPLATES.map(template => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => applyTemplate(template.name)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${selectedTemplate === template.name
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </button>
                ))}
              </div>

              {/* Templates salvos */}
              {templates.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-500 uppercase">Meus templates</p>
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                        ${selectedTemplate === template.id
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <div className="font-medium">{template.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Salvar novo template */}
              {showSaveTemplate ? (
                <div className="pt-3 border-t space-y-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Nome do template"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTemplate}>
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowSaveTemplate(false);
                        setTemplateName('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveTemplate(true)}
                  className="w-full mt-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  + Salvar configuracao atual
                </button>
              )}
            </div>
          </Card>

          {/* Resultado da extracao */}
          {extractionResult && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {extractionResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                Resultado
              </h3>

              {extractionResult.success ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">Registros</div>
                      <div className="text-xl font-bold text-gray-900">
                        {extractionResult.totalRecords.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">Tempo</div>
                      <div className="text-xl font-bold text-gray-900">
                        {(extractionResult.durationMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Periodo: {extractionResult.dateRange.start} ate {extractionResult.dateRange.end}
                  </div>

                  <div className="space-y-2">
                    <Button onClick={exportToCSV} icon={Download} className="w-full">
                      Exportar CSV
                    </Button>
                    <Button
                      onClick={handlePreviewDashboard}
                      icon={Eye}
                      variant="outline"
                      className="w-full"
                    >
                      Visualizar Dashboard
                    </Button>
                    <Button
                      onClick={() => setShowSaveModal(true)}
                      icon={LayoutDashboard}
                      variant="primary"
                      className="w-full"
                    >
                      Salvar e Gerar Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  {extractionResult.error}
                </div>
              )}
            </Card>
          )}

          {/* Preview dos dados */}
          {extractionResult && extractionResult.success && extractionResult.data.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Preview (primeiros 5 registros)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {extractionResult.columns.slice(0, 4).map(col => (
                        <th
                          key={col.field}
                          className="px-2 py-1.5 text-left font-medium text-gray-600"
                        >
                          {col.displayName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extractionResult.data.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {extractionResult.columns.slice(0, 4).map(col => (
                          <td key={col.field} className="px-2 py-1.5 text-gray-900">
                            {row[col.field] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal para salvar e gerar dashboard */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Salvar Dados e Gerar Dashboard"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Os dados extraídos serão salvos permanentemente e um dashboard será
            gerado automaticamente com visualizações baseadas nos campos selecionados.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do conjunto de dados *
            </label>
            <input
              type="text"
              value={dataSetName}
              onChange={e => setDataSetName(e.target.value)}
              placeholder="Ex: Campanhas Janeiro 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={dataSetDescription}
              onChange={e => setDataSetDescription(e.target.value)}
              placeholder="Descreva o propósito deste conjunto de dados..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {extractionResult && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Registros:</span>
                <span className="font-medium">{extractionResult.totalRecords.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Período:</span>
                <span className="font-medium">
                  {extractionResult.dateRange.start} a {extractionResult.dateRange.end}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Campos:</span>
                <span className="font-medium">{extractionResult.columns.length}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowSaveModal(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAndGenerateDashboard}
              loading={isSaving}
              disabled={isSaving || !dataSetName.trim()}
              icon={LayoutDashboard}
            >
              {isSaving ? 'Salvando...' : 'Salvar e Gerar Dashboard'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de preview do dashboard */}
      {showDashboardPreview && extractionResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Preview do Dashboard</h2>
                <p className="text-sm text-gray-500">
                  Visualização prévia dos dados extraídos (não salvo)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    setShowDashboardPreview(false);
                    setShowSaveModal(true);
                  }}
                  icon={Save}
                >
                  Salvar Dashboard
                </Button>
                <button
                  onClick={() => setShowDashboardPreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do dashboard */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <DynamicDashboard
                name="Preview - Dados Extraídos"
                description={`${extractionResult.totalRecords} registros extraídos`}
                data={extractionResult.data}
                columns={extractionResult.columns}
                widgets={generatedWidgets}
                dateRangeStart={extractionResult.dateRange.start}
                dateRangeEnd={extractionResult.dateRange.end}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExtractorPage;
