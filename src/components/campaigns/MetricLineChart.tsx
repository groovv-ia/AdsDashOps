/**
 * MetricLineChart
 *
 * Grafico de linhas estilo Google Ads para visualizacao de metricas de campanhas.
 *
 * Estrutura visual:
 * - Cards de metricas coloridos no topo (clicar ativa/desativa a linha correspondente)
 * - Grafico de linhas multiplas abaixo (uma linha por metrica ativa)
 * - Eixo X com datas formatadas
 * - Tooltip unificado no hover
 * - Botao "Metricas" para selecionar quais exibir
 *
 * Aceita qualquer array de DailyInsightRow — funciona para nivel de campanha
 * e nivel de adset sem modificacoes.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Settings2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DailyInsightRow } from '../../lib/services/MetaRealTimeService';

// ── Tipos ──────────────────────────────────────────────────

/** Chaves de metrica disponiveis no DailyInsightRow */
export type MetricKey =
  | 'impressions'
  | 'clicks'
  | 'spend'
  | 'conversions'
  | 'ctr'
  | 'cpc'
  | 'cpm'
  | 'reach'
  | 'leads'
  | 'messaging_conversations_started'
  | 'frequency';

/** Configuracao de cada metrica: label, cor, formato de valor */
interface MetricConfig {
  key:      MetricKey;
  label:    string;
  color:    string;       // hex
  format:   'number' | 'currency' | 'percent' | 'decimal';
  decimals?: number;
}

interface MetricLineChartProps {
  /** Dados diarios — um objeto por dia com todas as metricas */
  data:             DailyInsightRow[];
  /** Metricas inicialmente ativas (max 4 para legibilidade) */
  defaultMetrics?:  MetricKey[];
  /** Altura do grafico em px */
  chartHeight?:     number;
  /** Mostra legenda abaixo do grafico */
  showLegend?:      boolean;
}

// ── Paleta de metricas ────────────────────────────────────
// Cores identicas as ja usadas nos cards e graficos do sistema

const METRIC_CONFIGS: MetricConfig[] = [
  { key: 'impressions',                   label: 'Impressoes',  color: '#3B82F6', format: 'number'   },
  { key: 'clicks',                        label: 'Cliques',     color: '#F97316', format: 'number'   },
  { key: 'spend',                         label: 'Custo',       color: '#22C55E', format: 'currency' },
  { key: 'conversions',                   label: 'Conversoes',  color: '#EC4899', format: 'decimal', decimals: 2 },
  { key: 'ctr',                           label: 'CTR',         color: '#EF4444', format: 'percent'  },
  { key: 'cpc',                           label: 'CPC',         color: '#F59E0B', format: 'currency' },
  { key: 'cpm',                           label: 'CPM',         color: '#06B6D4', format: 'currency' },
  { key: 'reach',                         label: 'Alcance',     color: '#8B5CF6', format: 'number'   },
  { key: 'leads',                         label: 'Leads',       color: '#10B981', format: 'number'   },
  { key: 'messaging_conversations_started', label: 'Conversas', color: '#6366F1', format: 'number'   },
  { key: 'frequency',                     label: 'Frequencia',  color: '#78716C', format: 'decimal', decimals: 2 },
];

const METRIC_MAP = Object.fromEntries(METRIC_CONFIGS.map(m => [m.key, m])) as Record<MetricKey, MetricConfig>;

// ── Formatadores ──────────────────────────────────────────

function formatValue(value: number, config: MetricConfig): string {
  if (config.format === 'currency') {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (config.format === 'percent') {
    return `${value.toFixed(2)}%`;
  }
  if (config.format === 'decimal') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: config.decimals ?? 2,
      maximumFractionDigits: config.decimals ?? 2,
    });
  }
  // number
  return value.toLocaleString('pt-BR');
}

/** Formata data "2026-05-16" em "16 de mai." */
function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Formata data completa para tooltip */
function formatDateFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Tooltip customizado ───────────────────────────────────

interface CustomTooltipProps {
  active?:   boolean;
  payload?:  { dataKey: string; value: number; color: string }[];
  label?:    string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-500 mb-2">{formatDateFull(label)}</p>
      <div className="space-y-1.5">
        {payload.map(entry => {
          const cfg = METRIC_MAP[entry.dataKey as MetricKey];
          if (!cfg) return null;
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">
                {formatValue(entry.value, cfg)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Componente principal ───────────────────────────────────

export const MetricLineChart: React.FC<MetricLineChartProps> = ({
  data,
  defaultMetrics = ['impressions', 'clicks', 'spend', 'conversions'],
  chartHeight = 280,
  showLegend = false,
}) => {
  // Metricas ativas (linhas visiveis no grafico)
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(defaultMetrics);

  // Controle do dropdown de selecao de metricas
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fecha o picker ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMetricPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Detecta quais metricas tem dados relevantes (evita mostrar metricas sempre zero)
  const metricsWithData = useMemo<MetricKey[]>(() => {
    if (!data.length) return [];
    return METRIC_CONFIGS
      .filter(cfg => data.some(row => (row[cfg.key as keyof DailyInsightRow] as number) > 0))
      .map(cfg => cfg.key);
  }, [data]);

  // Apenas metricas ativas que realmente existem nos dados
  const visibleMetrics = useMemo(
    () => activeMetrics.filter(k => metricsWithData.includes(k)),
    [activeMetrics, metricsWithData]
  );

  // Totais do periodo por metrica (para os cards superiores)
  const totals = useMemo(() => {
    const t: Partial<Record<MetricKey, number>> = {};
    METRIC_CONFIGS.forEach(({ key, format }) => {
      const vals = data.map(r => (r[key as keyof DailyInsightRow] as number) ?? 0);
      // CTR, CPC, CPM, frequency, conversions sao medias; o restante soma
      if (format === 'percent' || format === 'decimal' || key === 'cpc' || key === 'cpm' || key === 'frequency') {
        t[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      } else {
        t[key] = vals.reduce((a, b) => a + b, 0);
      }
    });
    return t;
  }, [data]);

  // Variacao percentual: segunda metade vs primeira metade do periodo
  const changes = useMemo(() => {
    const c: Partial<Record<MetricKey, number>> = {};
    if (data.length < 2) return c;
    const mid = Math.floor(data.length / 2);
    const first = data.slice(0, mid);
    const second = data.slice(mid);
    METRIC_CONFIGS.forEach(({ key, format }) => {
      const isAvg = format === 'percent' || format === 'decimal' || key === 'cpc' || key === 'cpm' || key === 'frequency';
      const sumOrAvg = (rows: DailyInsightRow[]) => {
        const vals = rows.map(r => (r[key as keyof DailyInsightRow] as number) ?? 0);
        return isAvg ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : vals.reduce((a, b) => a + b, 0);
      };
      const a = sumOrAvg(first);
      const b = sumOrAvg(second);
      c[key] = a === 0 ? 0 : ((b - a) / a) * 100;
    });
    return c;
  }, [data]);

  // Dados formatados para o recharts (agrupados por data)
  const chartData = useMemo(
    () => data.map(row => ({ ...row, _dateLabel: formatDateShort(row.date) })),
    [data]
  );

  // Metricas disponiveis para o picker (apenas as que tem dados)
  const pickableMetrics = METRIC_CONFIGS.filter(cfg => metricsWithData.includes(cfg.key));

  // Alterna ativacao de uma metrica
  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev  // ao menos 1 ativa
        : [...prev, key]
    );
  };

  // Normaliza valores para eixo Y multiplo (cada metrica em escala propria)
  // Recharts gerencia eixos duplos; com muitas metricas de escalas diferentes
  // usamos yAxisId por grupo: 'left' para valores grandes, 'right' para percentuais/decimais
  const getYAxisId = (key: MetricKey): 'left' | 'right' => {
    const cfg = METRIC_MAP[key];
    return cfg.format === 'percent' || key === 'cpc' || key === 'cpm' || key === 'frequency' ? 'right' : 'left';
  };

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Nenhum dado disponivel para o periodo selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Cards de metricas no topo ──────────────────────── */}
      <div className="flex items-stretch gap-0 border border-gray-200 rounded-t-xl overflow-hidden">
        {/* Cards das metricas ativas */}
        <div className="flex flex-1 divide-x divide-gray-200 overflow-x-auto">
          {METRIC_CONFIGS.filter(cfg => visibleMetrics.includes(cfg.key)).map(cfg => {
            const total   = totals[cfg.key] ?? 0;
            const change  = changes[cfg.key] ?? 0;
            const isActive = visibleMetrics.includes(cfg.key);

            return (
              <button
                key={cfg.key}
                onClick={() => toggleMetric(cfg.key)}
                className={`
                  flex-1 min-w-[120px] px-4 py-3 text-left transition-all duration-150
                  focus:outline-none group
                `}
                style={{ backgroundColor: isActive ? cfg.color : undefined }}
                title={`${isActive ? 'Ocultar' : 'Exibir'} ${cfg.label}`}
              >
                {/* Label da metrica */}
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80 mb-1">
                  {cfg.label}
                </p>
                {/* Valor total */}
                <p className="text-lg font-bold text-white leading-tight">
                  {formatValue(total, cfg)}
                </p>
                {/* Variacao percentual */}
                {data.length >= 4 && (
                  <div className="flex items-center gap-1 mt-1">
                    {change > 0 ? (
                      <TrendingUp className="w-3 h-3 text-white/70" />
                    ) : change < 0 ? (
                      <TrendingDown className="w-3 h-3 text-white/70" />
                    ) : (
                      <Minus className="w-3 h-3 text-white/70" />
                    )}
                    <span className="text-xs text-white/80">
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Botao de configuracao de metricas */}
        <div className="relative flex-shrink-0 border-l border-gray-200" ref={pickerRef}>
          <button
            onClick={() => setShowMetricPicker(v => !v)}
            className="h-full px-4 flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="Selecionar metricas"
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-xs">Metricas</span>
          </button>

          {/* Dropdown de selecao */}
          {showMetricPicker && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                Selecionar metricas
              </p>
              {pickableMetrics.map(cfg => {
                const isOn = activeMetrics.includes(cfg.key);
                return (
                  <button
                    key={cfg.key}
                    onClick={() => toggleMetric(cfg.key)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Indicador de cor / checkbox visual */}
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 transition-opacity ${isOn ? 'opacity-100' : 'opacity-30'}`}
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className={`text-sm ${isOn ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {cfg.label}
                    </span>
                    {isOn && (
                      <svg className="w-3.5 h-3.5 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cards das metricas INATIVAS (cinzas, clicaveis para reativar) */}
      {METRIC_CONFIGS.filter(cfg => metricsWithData.includes(cfg.key) && !visibleMetrics.includes(cfg.key)).length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pt-2">
          {METRIC_CONFIGS
            .filter(cfg => metricsWithData.includes(cfg.key) && !visibleMetrics.includes(cfg.key))
            .map(cfg => (
              <button
                key={cfg.key}
                onClick={() => toggleMetric(cfg.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-700 transition-colors"
                title={`Exibir ${cfg.label}`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </button>
            ))}
        </div>
      )}

      {/* ── Grafico de linhas ──────────────────────────────── */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-xl pt-4 pb-2 pr-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />

            {/* Eixo esquerdo: valores grandes (impressoes, cliques, spend, etc.) */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={val => {
                if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                return val.toLocaleString('pt-BR');
              }}
              width={52}
            />

            {/* Eixo direito: percentuais e valores pequenos */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={val => val.toFixed(2)}
              width={48}
              hide={!visibleMetrics.some(k => getYAxisId(k) === 'right')}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#E5E7EB', strokeWidth: 1.5 }}
            />

            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                formatter={(_value, entry) => {
                  const cfg = METRIC_MAP[entry.dataKey as MetricKey];
                  return <span style={{ color: '#6B7280' }}>{cfg?.label ?? entry.dataKey}</span>;
                }}
              />
            )}

            {/* Uma linha por metrica ativa */}
            {visibleMetrics.map(key => {
              const cfg = METRIC_MAP[key];
              return (
                <Line
                  key={key}
                  yAxisId={getYAxisId(key)}
                  type="monotone"
                  dataKey={key}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
