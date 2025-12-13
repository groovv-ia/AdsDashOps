/**
 * PeriodComparisonCard - Comparacao de Performance entre Periodos
 *
 * Exibe comparacao lado a lado das metricas de uma campanha
 * entre dois periodos/extracoes diferentes.
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, ArrowRight } from 'lucide-react';
import { campaignExtractedDataService, type PeriodComparison } from '../../lib/services/CampaignExtractedDataService';
import { Loading } from '../ui/Loading';

// ============================================
// Tipos e Interfaces
// ============================================

interface PeriodComparisonCardProps {
  campaignId: string;
  availablePeriods: Array<{
    data_set_id: string;
    data_set_name: string;
    start: string | null;
    end: string | null;
  }>;
}

interface MetricCardProps {
  label: string;
  value1: number;
  value2: number;
  variation: number;
  format: 'number' | 'currency' | 'percent' | 'multiplier';
  invertColors?: boolean;
}

// ============================================
// Funcoes Auxiliares
// ============================================

/**
 * Formata valor conforme tipo
 */
function formatValue(value: number, format: 'number' | 'currency' | 'percent' | 'multiplier'): string {
  switch (format) {
    case 'currency':
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      });
    case 'percent':
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + '%';
    case 'multiplier':
      return value.toFixed(2) + 'x';
    default:
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
}

/**
 * Formata data para exibicao
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// Componente de Card de Metrica
// ============================================

function MetricComparisonCard({ label, value1, value2, variation, format, invertColors = false }: MetricCardProps) {
  const isPositive = invertColors ? variation < 0 : variation > 0;
  const isNeutral = Math.abs(variation) < 0.5;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500 mb-2">{label}</p>

      <div className="flex items-end justify-between gap-4">
        {/* Valores */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Periodo 1</p>
            <p className="font-semibold text-gray-900">{formatValue(value1, format)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Periodo 2</p>
            <p className="font-semibold text-gray-900">{formatValue(value2, format)}</p>
          </div>
        </div>

        {/* Variacao */}
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium
          ${isNeutral ? 'bg-gray-200 text-gray-600' :
            isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }
        `}>
          {isNeutral ? (
            <Minus className="w-4 h-4" />
          ) : isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{variation >= 0 ? '+' : ''}{variation.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Componente Principal
// ============================================

export function PeriodComparisonCard({
  campaignId,
  availablePeriods,
}: PeriodComparisonCardProps) {
  // Estados
  const [period1Id, setPeriod1Id] = useState<string>('');
  const [period2Id, setPeriod2Id] = useState<string>('');
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar periodos quando disponiveis
  useEffect(() => {
    if (availablePeriods.length >= 2) {
      setPeriod1Id(availablePeriods[1].data_set_id);
      setPeriod2Id(availablePeriods[0].data_set_id);
    } else if (availablePeriods.length === 1) {
      setPeriod1Id(availablePeriods[0].data_set_id);
    }
  }, [availablePeriods]);

  // Carregar comparacao quando ambos periodos selecionados
  useEffect(() => {
    if (period1Id && period2Id && period1Id !== period2Id) {
      loadComparison();
    } else {
      setComparison(null);
    }
  }, [period1Id, period2Id, campaignId]);

  /**
   * Carrega dados de comparacao
   */
  async function loadComparison() {
    setLoading(true);
    setError(null);

    const result = await campaignExtractedDataService.comparePeriods(
      campaignId,
      period1Id,
      period2Id
    );

    if (result.success && result.comparison) {
      setComparison(result.comparison);
    } else {
      setError(result.error || 'Erro ao comparar periodos');
    }

    setLoading(false);
  }

  // Se nao houver periodos suficientes
  if (availablePeriods.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Comparacao de Periodos
        </h3>
        <p className="text-gray-500 text-sm">
          Sao necessarias pelo menos duas extracoes desta campanha para comparar periodos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Cabecalho */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Comparacao de Periodos
      </h3>

      {/* Seletores de periodo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Periodo 1 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Periodo 1 (Base)
          </label>
          <select
            value={period1Id}
            onChange={e => setPeriod1Id(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Selecione...</option>
            {availablePeriods.map(p => (
              <option key={p.data_set_id} value={p.data_set_id} disabled={p.data_set_id === period2Id}>
                {p.data_set_name} ({formatDate(p.start)} - {formatDate(p.end)})
              </option>
            ))}
          </select>
        </div>

        {/* Seta */}
        <div className="hidden sm:flex items-end pb-2">
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* Periodo 2 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Periodo 2 (Comparar)
          </label>
          <select
            value={period2Id}
            onChange={e => setPeriod2Id(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Selecione...</option>
            {availablePeriods.map(p => (
              <option key={p.data_set_id} value={p.data_set_id} disabled={p.data_set_id === period1Id}>
                {p.data_set_name} ({formatDate(p.start)} - {formatDate(p.end)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado de carregamento */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loading size="md" />
          <span className="ml-2 text-gray-500">Calculando comparacao...</span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Resultados da comparacao */}
      {comparison && !loading && (
        <div className="space-y-4">
          {/* Resumo dos periodos */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Periodo 1</span>
              </div>
              <p className="text-xs text-blue-700">{comparison.period1.name}</p>
              <p className="text-xs text-blue-600">
                {formatDate(comparison.period1.start)} - {formatDate(comparison.period1.end)}
              </p>
            </div>
            <div className="flex-1 bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Periodo 2</span>
              </div>
              <p className="text-xs text-green-700">{comparison.period2.name}</p>
              <p className="text-xs text-green-600">
                {formatDate(comparison.period2.start)} - {formatDate(comparison.period2.end)}
              </p>
            </div>
          </div>

          {/* Grid de metricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricComparisonCard
              label="Impressoes"
              value1={comparison.period1.metrics.impressions}
              value2={comparison.period2.metrics.impressions}
              variation={comparison.variations.impressions}
              format="number"
            />
            <MetricComparisonCard
              label="Cliques"
              value1={comparison.period1.metrics.clicks}
              value2={comparison.period2.metrics.clicks}
              variation={comparison.variations.clicks}
              format="number"
            />
            <MetricComparisonCard
              label="Gastos"
              value1={comparison.period1.metrics.spend}
              value2={comparison.period2.metrics.spend}
              variation={comparison.variations.spend}
              format="currency"
              invertColors
            />
            <MetricComparisonCard
              label="Conversoes"
              value1={comparison.period1.metrics.conversions}
              value2={comparison.period2.metrics.conversions}
              variation={comparison.variations.conversions}
              format="number"
            />
            <MetricComparisonCard
              label="CTR"
              value1={comparison.period1.metrics.ctr}
              value2={comparison.period2.metrics.ctr}
              variation={comparison.variations.ctr}
              format="percent"
            />
            <MetricComparisonCard
              label="CPC"
              value1={comparison.period1.metrics.cpc}
              value2={comparison.period2.metrics.cpc}
              variation={comparison.variations.cpc}
              format="currency"
              invertColors
            />
            <MetricComparisonCard
              label="CPM"
              value1={comparison.period1.metrics.cpm}
              value2={comparison.period2.metrics.cpm}
              variation={comparison.variations.cpm}
              format="currency"
              invertColors
            />
            <MetricComparisonCard
              label="ROAS"
              value1={comparison.period1.metrics.roas}
              value2={comparison.period2.metrics.roas}
              variation={comparison.variations.roas}
              format="multiplier"
            />
          </div>
        </div>
      )}

      {/* Mensagem quando nao ha selecao */}
      {!comparison && !loading && !error && period1Id && period2Id && period1Id === period2Id && (
        <div className="text-center py-6 text-gray-500">
          <p>Selecione dois periodos diferentes para comparar.</p>
        </div>
      )}
    </div>
  );
}
