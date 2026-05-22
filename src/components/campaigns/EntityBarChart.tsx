/**
 * EntityBarChart
 *
 * Grafico de barras horizontais estilo Google Ads para comparacao entre entidades
 * (adsets ou anuncios) que nao possuem serie diaria individual.
 *
 * Estrutura visual:
 * - Seletor de metrica no topo (cards clicaveis coloridos, igual ao MetricLineChart)
 * - Lista de barras horizontais, uma por entidade, ordenadas pelo valor da metrica ativa
 * - Valor absoluto e percentual do total exibidos em cada barra
 *
 * Recebe um array de entidades genericas com todas as metricas pre-calculadas.
 */

import React, { useState, useMemo } from 'react';
import { Settings2 } from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────

export interface EntityMetrics {
  id:           string;
  name:         string;
  impressions:  number;
  clicks:       number;
  spend:        number;
  conversions:  number;
  ctr:          number;
  cpc:          number;
  cpm:          number;
  roas:         number;
  leads:        number;
  messaging_conversations_started: number;
  reach:        number;
}

type MetricKey = keyof Omit<EntityMetrics, 'id' | 'name'>;

interface EntityBarChartProps {
  entities:     EntityMetrics[];
  entityLabel?: string;  // ex: "Conjunto" ou "Anuncio"
}

// ── Configuracao das metricas ─────────────────────────────

interface MetricConfig {
  key:     MetricKey;
  label:   string;
  color:   string;
  format:  'number' | 'currency' | 'percent' | 'decimal';
  decimals?: number;
}

const METRIC_CONFIGS: MetricConfig[] = [
  { key: 'impressions',  label: 'Impressoes',  color: '#3B82F6', format: 'number'   },
  { key: 'clicks',       label: 'Cliques',     color: '#F97316', format: 'number'   },
  { key: 'spend',        label: 'Custo',       color: '#22C55E', format: 'currency' },
  { key: 'conversions',  label: 'Conversoes',  color: '#EC4899', format: 'decimal', decimals: 2 },
  { key: 'ctr',          label: 'CTR',         color: '#EF4444', format: 'percent'  },
  { key: 'cpc',          label: 'CPC',         color: '#F59E0B', format: 'currency' },
  { key: 'cpm',          label: 'CPM',         color: '#06B6D4', format: 'currency' },
  { key: 'reach',        label: 'Alcance',     color: '#8B5CF6', format: 'number'   },
  { key: 'leads',        label: 'Leads',       color: '#10B981', format: 'number'   },
  { key: 'messaging_conversations_started', label: 'Conversas', color: '#6366F1', format: 'number' },
  { key: 'roas',         label: 'ROAS',        color: '#78716C', format: 'decimal', decimals: 2 },
];

const METRIC_MAP = Object.fromEntries(METRIC_CONFIGS.map(m => [m.key, m])) as Record<MetricKey, MetricConfig>;

// ── Formatadores ──────────────────────────────────────────

function formatValue(value: number, cfg: MetricConfig): string {
  if (cfg.format === 'currency') {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (cfg.format === 'percent') return `${value.toFixed(2)}%`;
  if (cfg.format === 'decimal') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: cfg.decimals ?? 2,
      maximumFractionDigits: cfg.decimals ?? 2,
    });
  }
  return value.toLocaleString('pt-BR');
}

// ── Componente principal ───────────────────────────────────

export const EntityBarChart: React.FC<EntityBarChartProps> = ({
  entities,
  entityLabel = 'Item',
}) => {
  // Metrica ativa selecionada
  const [activeMetric, setActiveMetric] = useState<MetricKey>('spend');

  // Controle do seletor de metrica
  const [showPicker, setShowPicker] = useState(false);

  // Metricas que tem pelo menos um valor > 0
  const metricsWithData = useMemo<MetricKey[]>(() => {
    return METRIC_CONFIGS
      .filter(cfg => entities.some(e => (e[cfg.key] as number) > 0))
      .map(cfg => cfg.key);
  }, [entities]);

  // Se a metrica ativa nao tem dados, usa a primeira disponivel
  const safeMetric: MetricKey = metricsWithData.includes(activeMetric)
    ? activeMetric
    : (metricsWithData[0] ?? 'spend');

  const activeCfg = METRIC_MAP[safeMetric];

  // Entidades ordenadas pelo valor da metrica ativa (decrescente)
  const sorted = useMemo(
    () => [...entities].sort((a, b) => (b[safeMetric] as number) - (a[safeMetric] as number)),
    [entities, safeMetric]
  );

  // Valor maximo para calcular a proporcao das barras
  const maxValue = useMemo(
    () => Math.max(...sorted.map(e => e[safeMetric] as number), 1),
    [sorted, safeMetric]
  );

  // Total para calcular percentuais
  const total = useMemo(
    () => sorted.reduce((sum, e) => sum + (e[safeMetric] as number), 0),
    [sorted, safeMetric]
  );

  if (!entities.length) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Nenhuma entidade disponivel.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Seletor de metrica (tabs coloridos) ─────────── */}
      <div className="flex items-stretch border border-gray-200 rounded-t-xl overflow-hidden">
        <div className="flex flex-1 overflow-x-auto divide-x divide-gray-200">
          {METRIC_CONFIGS.filter(cfg => metricsWithData.includes(cfg.key)).map(cfg => {
            const isActive = safeMetric === cfg.key;
            const val = sorted.reduce((s, e) => s + (e[cfg.key] as number), 0);
            return (
              <button
                key={cfg.key}
                onClick={() => setActiveMetric(cfg.key)}
                className="flex-1 min-w-[100px] px-4 py-3 text-left transition-all duration-150"
                style={{ backgroundColor: isActive ? cfg.color : '#F9FAFB' }}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                  {cfg.label}
                </p>
                <p className={`text-base font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {formatValue(val, cfg)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Botao de configuracao (placeholder para consistencia visual) */}
        <div className="relative flex-shrink-0 border-l border-gray-200 bg-gray-50">
          <button
            onClick={() => setShowPicker(v => !v)}
            className="h-full px-4 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="Selecionar metrica"
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-xs">Metricas</span>
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-1.5">
                Selecionar metrica
              </p>
              {METRIC_CONFIGS.filter(cfg => metricsWithData.includes(cfg.key)).map(cfg => (
                <button
                  key={cfg.key}
                  onClick={() => { setActiveMetric(cfg.key); setShowPicker(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className={`text-sm ${safeMetric === cfg.key ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                    {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Barras horizontais ───────────────────────────── */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-xl px-5 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {entityLabel}s — por {activeCfg.label}
        </p>

        {sorted.map((entity, idx) => {
          const value  = entity[safeMetric] as number;
          const pct    = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const sharePct = total > 0 ? (value / total) * 100 : 0;

          return (
            <div key={entity.id} className="space-y-1">
              {/* Nome + valor */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-400 font-semibold w-5 flex-shrink-0 text-right">
                    {idx + 1}.
                  </span>
                  <span
                    className="text-sm text-gray-800 truncate"
                    title={entity.name}
                  >
                    {entity.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{sharePct.toFixed(1)}%</span>
                  <span className="text-sm font-semibold text-gray-900 min-w-[90px] text-right">
                    {formatValue(value, activeCfg)}
                  </span>
                </div>
              </div>

              {/* Barra */}
              <div className="flex items-center gap-2">
                <div className="w-5 flex-shrink-0" /> {/* alinha com o numero */}
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: activeCfg.color,
                      opacity: 0.85 + (0.15 * (1 - idx / Math.max(sorted.length - 1, 1))),
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
