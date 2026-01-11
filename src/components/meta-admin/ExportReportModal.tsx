/**
 * ExportReportModal
 *
 * Modal para exportação de relatórios com insights de IA
 * Permite escolher formato (PDF, Excel, CSV) e opções de exportação
 */

import React, { useState } from 'react';
import { X, FileText, Table, FileSpreadsheet, Download, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ExportDataWithAI } from '../../lib/services/ExportWithAIService';
import {
  prepareExportDataWithAI,
  generateExportFileName,
} from '../../lib/services/ExportWithAIService';
import {
  exportMetaInsightsToCSV,
  exportMetaInsightsToExcel,
  exportMetaInsightsToPDF,
} from '../../utils/exportAdvanced';
import type { AnalysisLevel } from '../../types/metricsAnalysis';
import type { PreloadedMetricsData } from '../../lib/services/MetricsAIAnalysisService';

/**
 * Props do componente
 */
interface ExportReportModalProps {
  // Controle de visibilidade
  isOpen: boolean;
  onClose: () => void;

  // Dados para exportação
  rawData: any[];
  metadata: {
    accountName: string;
    accountId: string;
    entityLevel: AnalysisLevel;
    periodStart: string;
    periodEnd: string;
  };
  kpis: {
    totalSpend: number;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    avgCtr: number;
    avgCpc: number;
    avgCpm: number;
    avgFrequency: number;
  };

  // Informações para geração de insights de IA
  entityId?: string;
  entityName?: string;
  metaAdAccountId?: string;

  // Dados pre-carregados para análise de IA (opcional)
  preloadedData?: PreloadedMetricsData;
}

/**
 * Tipo de formato de exportação
 */
type ExportFormat = 'pdf' | 'xlsx' | 'csv';

/**
 * Etapas do processo de exportação
 */
type ExportStep = 'idle' | 'preparing' | 'generating_ai' | 'creating_file' | 'done' | 'error';

/**
 * Componente ExportReportModal
 */
export function ExportReportModal({
  isOpen,
  onClose,
  rawData,
  metadata,
  kpis,
  entityId,
  entityName,
  metaAdAccountId,
  preloadedData,
}: ExportReportModalProps): JSX.Element {
  // Estado do formato selecionado
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');

  // Estado de incluir insights de IA
  const [includeAI, setIncludeAI] = useState<boolean>(true);

  // Estado de forçar nova análise de IA
  const [forceNewAI, setForceNewAI] = useState<boolean>(false);

  // Estado do processo de exportação
  const [exportStep, setExportStep] = useState<ExportStep>('idle');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportError, setExportError] = useState<string>('');

  /**
   * Reseta o estado do modal
   */
  const resetModal = () => {
    setExportStep('idle');
    setExportProgress(0);
    setExportError('');
  };

  /**
   * Fecha o modal
   */
  const handleClose = () => {
    if (exportStep !== 'idle' && exportStep !== 'done' && exportStep !== 'error') {
      // Não permite fechar durante exportação
      return;
    }
    resetModal();
    onClose();
  };

  /**
   * Inicia o processo de exportação
   */
  const handleExport = async () => {
    try {
      setExportStep('preparing');
      setExportProgress(10);
      setExportError('');

      // Prepara metadados
      const fullMetadata = {
        ...metadata,
        generatedAt: new Date().toISOString(),
        totalRecords: rawData.length,
      };

      // Prepara dados com IA (se solicitado)
      setExportStep('generating_ai');
      setExportProgress(30);

      const aiOptions = includeAI && entityId && entityName && metaAdAccountId
        ? {
            entityId,
            entityName,
            metaAdAccountId,
            preloadedData,
            forceNew: forceNewAI,
          }
        : undefined;

      const exportData: ExportDataWithAI = await prepareExportDataWithAI(
        rawData,
        fullMetadata,
        kpis,
        includeAI,
        aiOptions
      );

      setExportProgress(60);

      // Gera nome do arquivo
      const fileName = generateExportFileName(selectedFormat, fullMetadata, includeAI);

      // Cria o arquivo no formato selecionado
      setExportStep('creating_file');
      setExportProgress(80);

      switch (selectedFormat) {
        case 'csv':
          await exportMetaInsightsToCSV(exportData, fileName);
          break;
        case 'xlsx':
          await exportMetaInsightsToExcel(exportData, fileName);
          break;
        case 'pdf':
          await exportMetaInsightsToPDF(exportData, fileName);
          break;
      }

      // Sucesso
      setExportStep('done');
      setExportProgress(100);

      // Fecha automaticamente após 3 segundos
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao exportar:', error);
      setExportStep('error');
      setExportError(error.message || 'Erro desconhecido ao exportar');
    }
  };

  // Se não estiver aberto, não renderiza
  if (!isOpen) return <></>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Exportar Relatório</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            disabled={exportStep !== 'idle' && exportStep !== 'done' && exportStep !== 'error'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6">
          {/* Informações do relatório */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Informações do Relatório</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>
                <span className="font-medium">Conta:</span> {metadata.accountName}
              </div>
              <div>
                <span className="font-medium">Registros:</span> {rawData.length}
              </div>
              <div>
                <span className="font-medium">Nível:</span>{' '}
                {metadata.entityLevel === 'campaign'
                  ? 'Campanhas'
                  : metadata.entityLevel === 'adset'
                  ? 'Conjuntos'
                  : 'Anúncios'}
              </div>
              <div>
                <span className="font-medium">Período:</span>{' '}
                {new Date(metadata.periodStart).toLocaleDateString('pt-BR')} -{' '}
                {new Date(metadata.periodEnd).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Seleção de formato */}
          {exportStep === 'idle' && (
            <>
              <h3 className="font-semibold text-gray-800 mb-3">Selecione o formato:</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* PDF */}
                <button
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    selectedFormat === 'pdf'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <FileText size={32} className={selectedFormat === 'pdf' ? 'text-blue-600' : 'text-gray-600'} />
                  <span className="font-semibold text-sm">PDF</span>
                  <span className="text-xs text-gray-600 text-center">Relatório completo e profissional</span>
                </button>

                {/* Excel */}
                <button
                  onClick={() => setSelectedFormat('xlsx')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    selectedFormat === 'xlsx'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <FileSpreadsheet size={32} className={selectedFormat === 'xlsx' ? 'text-green-600' : 'text-gray-600'} />
                  <span className="font-semibold text-sm">Excel</span>
                  <span className="text-xs text-gray-600 text-center">Múltiplas abas e análise</span>
                </button>

                {/* CSV */}
                <button
                  onClick={() => setSelectedFormat('csv')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    selectedFormat === 'csv'
                      ? 'border-amber-500 bg-amber-50 shadow-md'
                      : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <Table size={32} className={selectedFormat === 'csv' ? 'text-amber-600' : 'text-gray-600'} />
                  <span className="font-semibold text-sm">CSV</span>
                  <span className="text-xs text-gray-600 text-center">Dados tabulares simples</span>
                </button>
              </div>

              {/* Opções de IA */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="text-purple-600" size={20} />
                  <h3 className="font-semibold text-purple-900">Insights de Inteligência Artificial</h3>
                </div>

                {/* Toggle incluir IA */}
                <label className="flex items-center gap-3 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAI}
                    onChange={e => setIncludeAI(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm text-purple-900">
                    Incluir análises e recomendações geradas por IA
                  </span>
                </label>

                {/* Toggle forçar nova análise */}
                {includeAI && (
                  <label className="flex items-center gap-3 cursor-pointer ml-8">
                    <input
                      type="checkbox"
                      checked={forceNewAI}
                      onChange={e => setForceNewAI(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-purple-800">
                      Forçar geração de nova análise (ignora análises recentes)
                    </span>
                  </label>
                )}

                {includeAI && (
                  <p className="text-xs text-purple-700 mt-3">
                    ℹ️ A IA analisará performance, identificará tendências, detectará anomalias e gerará
                    recomendações acionáveis.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Barra de progresso */}
          {(exportStep === 'preparing' || exportStep === 'generating_ai' || exportStep === 'creating_file') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {exportStep === 'preparing' && 'Preparando dados...'}
                  {exportStep === 'generating_ai' && 'Gerando insights de IA...'}
                  {exportStep === 'creating_file' && 'Criando arquivo...'}
                </span>
                <span className="text-sm text-gray-600">{exportProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-center mt-4">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            </div>
          )}

          {/* Sucesso */}
          {exportStep === 'done' && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-600" size={32} />
                <div>
                  <h3 className="font-semibold text-green-900">Relatório exportado com sucesso!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    O download do arquivo deve iniciar automaticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {exportStep === 'error' && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={32} />
                <div>
                  <h3 className="font-semibold text-red-900">Erro ao exportar relatório</h3>
                  <p className="text-sm text-red-700 mt-1">{exportError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            disabled={exportStep !== 'idle' && exportStep !== 'done' && exportStep !== 'error'}
          >
            {exportStep === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
          {exportStep === 'idle' && (
            <button
              onClick={handleExport}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Exportar
            </button>
          )}
          {exportStep === 'error' && (
            <button
              onClick={handleExport}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
