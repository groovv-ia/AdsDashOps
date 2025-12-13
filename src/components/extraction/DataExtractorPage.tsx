/**
 * DataExtractorPage - Página principal de extração de dados estilo Adveronix
 *
 * Interface completa para extração configurável de dados do Meta Ads:
 * 1. Seleção de conta
 * 2. Nível do relatório (Campaign, Ad Set, Ad)
 * 3. Seleção de campos (chips clicáveis)
 * 4. Breakdowns (segmentações)
 * 5. Período de datas
 * 6. Execução e preview dos resultados
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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FieldSelector } from './FieldSelector';
import { BreakdownPicker } from './BreakdownPicker';
import { supabase } from '../../lib/supabase';
import { ConfigurableExtractService } from '../../lib/services/ConfigurableExtractService';
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
// Componente Principal
// ============================================

export const DataExtractorPage: React.FC = () => {
  // Estados de conexão
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [loadingConnections, setLoadingConnections] = useState(true);

  // Estados de configuração
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

  // Estados de extração
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de UI
  const [expandedSections, setExpandedSections] = useState({
    connection: true,
    fields: true,
    breakdowns: false,
    dateRange: true,
    templates: false,
  });

  // Carregar conexões ao montar
  useEffect(() => {
    loadConnections();
    loadTemplates();
  }, []);

  // Carregar conexões Meta ativas
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

      // Selecionar primeira conexão automaticamente
      if (data && data.length > 0) {
        setSelectedConnection(data[0].id);
        setAccountId(data[0].config?.accountId || '');
      }
    } catch (err: any) {
      console.error('Erro ao carregar conexões:', err);
      setError('Erro ao carregar conexões');
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

  // Aplicar template selecionado
  const applyTemplate = (templateId: string) => {
    // Verificar se é um template padrão
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
      if (!user) throw new Error('Usuário não autenticado');

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

  // Executar extração
  const handleExtract = async () => {
    if (!selectedConnection || !accountId) {
      setError('Selecione uma conta de anúncios');
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

      const accessToken = tokenData?.access_token || import.meta.env.VITE_META_ACCESS_TOKEN;

      if (!accessToken) {
        throw new Error('Token de acesso não encontrado');
      }

      // Criar configuração de extração
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

      // Executar extração
      const service = new ConfigurableExtractService(accessToken, handleProgress);
      const result = await service.extract(config);

      setExtractionResult(result);

      if (!result.success) {
        setError(result.error || 'Erro desconhecido na extração');
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

  // Toggle de seção
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
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
            <p className="text-gray-600">Configure e extraia dados do Meta Ads</p>
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
        {/* Coluna de configuração */}
        <div className="lg:col-span-2 space-y-4">
          {/* Seção: Conexão e Nível */}
          <Card>
            <button
              type="button"
              onClick={() => toggleSection('connection')}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração
              </h3>
              {expandedSections.connection ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.connection && (
              <div className="mt-4 space-y-4">
                {/* Seleção de conta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta de Anúncios
                  </label>
                  {loadingConnections ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader className="w-4 h-4 animate-spin" />
                      Carregando...
                    </div>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Nenhuma conta Meta conectada.{' '}
                      <a href="/dashboard/data-sources" className="text-blue-600 hover:underline">
                        Conectar conta
                      </a>
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

                {/* Nível do relatório */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nível do Relatório
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

          {/* Seção: Campos */}
          <Card>
            <button
              type="button"
              onClick={() => toggleSection('fields')}
              className="w-full flex items-center justify-between"
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

          {/* Seção: Breakdowns */}
          <Card>
            <button
              type="button"
              onClick={() => toggleSection('breakdowns')}
              className="w-full flex items-center justify-between"
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

          {/* Seção: Período */}
          <Card>
            <button
              type="button"
              onClick={() => toggleSection('dateRange')}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Período
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
                    Período
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
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5" />
              Templates
            </h3>

            <div className="space-y-3">
              {/* Templates padrão */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Templates padrão</p>
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
                  + Salvar configuração atual
                </button>
              )}
            </div>
          </Card>

          {/* Resultado da extração */}
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
                    Período: {extractionResult.dateRange.start} até {extractionResult.dateRange.end}
                  </div>

                  <Button onClick={exportToCSV} icon={Download} className="w-full">
                    Exportar CSV
                  </Button>
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
    </div>
  );
};

export default DataExtractorPage;
