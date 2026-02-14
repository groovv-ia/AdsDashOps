/**
 * CreativeDetailPanel
 *
 * Painel lateral deslizante com detalhes completos de um criativo.
 * Exibe imagem em destaque, metricas, texto do criativo e mini-grafico diario.
 * Mostra indicador de loading enquanto imagem HD esta sendo buscada da API.
 * Reseta estado de erro quando dados frescos chegam.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  ExternalLink,
  Image,
  Play,
  Copy,
  Check,
  Eye,
  MousePointer,
  DollarSign,
  TrendingUp,
  Target,
  Users,
  MessageSquare,
  Tag,
  Plus,
  Sparkles,
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { EnrichedCreative } from '../../lib/services/CreativeAnalysisService';

interface CreativeDetailPanelProps {
  creative: EnrichedCreative | null;
  isOpen: boolean;
  onClose: () => void;
  onAddTag?: (adId: string, tag: string) => void;
  onRemoveTag?: (adId: string, tag: string) => void;
  isLoadingCreative?: boolean;
}

// Formata valores para exibicao
function fmt(value: number, type: 'number' | 'currency' | 'percent' | 'multiplier'): string {
  switch (type) {
    case 'currency': return `R$ ${value.toFixed(2).replace('.', ',')}`;
    case 'percent': return `${value.toFixed(2)}%`;
    case 'multiplier': return `${value.toFixed(2)}x`;
    default: return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
  }
}

export const CreativeDetailPanel: React.FC<CreativeDetailPanelProps> = ({
  creative,
  isOpen,
  onClose,
  onAddTag,
  onRemoveTag,
  isLoadingCreative = false,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [imgError, setImgError] = useState(false);

  if (!creative) return null;

  const c = creative.creative;
  const m = creative.metrics;

  const imageUrl = c.cached_image_url || c.image_url_hd || c.image_url
    || c.cached_thumbnail_url || c.thumbnail_url || null;
  const isVideo = c.creative_type === 'video';
  const hasImage = imageUrl && !imgError;

  // Reseta erro de imagem quando a URL muda (dados frescos da API)
  // Usando referencia para comparar sem precisar de useEffect com condicional
  const prevImageRef = useRef<string | null>(null);
  if (imageUrl !== prevImageRef.current) {
    prevImageRef.current = imageUrl;
    if (imgError) setImgError(false);
  }

  // Copia ad_id para clipboard
  const handleCopyId = () => {
    navigator.clipboard.writeText(c.ad_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Adiciona tag
  const handleAddTag = () => {
    if (newTag.trim() && onAddTag) {
      onAddTag(c.ad_id, newTag.trim());
      setNewTag('');
    }
  };

  // Dados para mini-grafico
  const chartData = creative.dailyMetrics.map(dm => ({
    date: dm.date.slice(5),
    spend: dm.spend,
    clicks: dm.clicks,
  }));

  // Tooltip customizado
  const MiniTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg">
        <div>Gasto: R$ {payload[0]?.value?.toFixed(2)}</div>
        {payload[1] && <div>Cliques: {payload[1]?.value}</div>}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Painel */}
      <div className={`
        fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50
        shadow-2xl transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        overflow-y-auto
      `}>
        {/* Header fixo */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {creative.adName}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {creative.campaignName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Preview da imagem */}
          <div className="relative rounded-xl overflow-hidden bg-gray-50 aspect-video">
            {hasImage ? (
              <>
                <img
                  src={imageUrl}
                  alt={creative.adName}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-white/90 rounded-full p-3">
                      <Play className="w-6 h-6 text-gray-800 fill-gray-800" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-12 h-12 text-gray-300" />
              </div>
            )}

            {/* Overlay de loading quando fetch real-time esta em andamento */}
            {isLoadingCreative && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                  <span className="text-xs font-medium text-blue-600">Buscando imagem HD...</span>
                </div>
              </div>
            )}

            {/* Badge de qualidade */}
            {c.thumbnail_quality && c.thumbnail_quality !== 'unknown' && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
                <span className="text-[10px] font-bold text-white uppercase">{c.thumbnail_quality}</span>
              </div>
            )}
          </div>

          {/* Info basica */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[11px] text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {copiedId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {c.ad_id}
              </button>
              <span className="text-[11px] text-gray-400 capitalize">{c.creative_type}</span>
              {creative.aiScore !== undefined && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full ml-auto">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px] font-bold text-amber-700">AI: {creative.aiScore}/100</span>
                </div>
              )}
            </div>

            {c.link_url && (
              <a
                href={c.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 truncate"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{c.link_url}</span>
              </a>
            )}
          </div>

          {/* Metricas em grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              Metricas de Performance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <MetricItem icon={<Eye className="w-3.5 h-3.5" />} label="Impressoes" value={fmt(m.impressions, 'number')} />
              <MetricItem icon={<MousePointer className="w-3.5 h-3.5" />} label="Cliques" value={fmt(m.clicks, 'number')} />
              <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="CTR" value={fmt(m.ctr, 'percent')} highlight={m.ctr > 2} />
              <MetricItem icon={<DollarSign className="w-3.5 h-3.5" />} label="CPC" value={fmt(m.cpc, 'currency')} />
              <MetricItem icon={<DollarSign className="w-3.5 h-3.5" />} label="CPM" value={fmt(m.cpm, 'currency')} />
              <MetricItem icon={<DollarSign className="w-3.5 h-3.5" />} label="Investimento" value={fmt(m.spend, 'currency')} />
              <MetricItem icon={<Users className="w-3.5 h-3.5" />} label="Alcance" value={fmt(m.reach, 'number')} />
              <MetricItem icon={<Target className="w-3.5 h-3.5" />} label="Conversoes" value={fmt(m.conversions, 'number')} />
              <MetricItem icon={<TrendingUp className="w-3.5 h-3.5" />} label="ROAS" value={fmt(m.roas, 'multiplier')} highlight={m.roas >= 2} />
              {m.leads > 0 && (
                <MetricItem icon={<Target className="w-3.5 h-3.5" />} label="Leads" value={fmt(m.leads, 'number')} />
              )}
              {m.messagingConversations > 0 && (
                <MetricItem icon={<MessageSquare className="w-3.5 h-3.5" />} label="Conversas" value={fmt(m.messagingConversations, 'number')} />
              )}
            </div>
          </div>

          {/* Mini grafico diario */}
          {chartData.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Evolucao diaria</h3>
              <div className="bg-gray-50 rounded-xl p-3">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip content={<MiniTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#3B82F6"
                      fill="url(#detailGradient)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Textos do criativo */}
          {(c.title || c.body || c.description) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Conteudo do criativo</h3>
              <div className="space-y-2 bg-gray-50 rounded-xl p-4">
                {c.title && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Titulo</span>
                    <p className="text-sm text-gray-900 mt-0.5">{c.title}</p>
                  </div>
                )}
                {c.body && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Texto principal</span>
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  </div>
                )}
                {c.description && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Descricao</span>
                    <p className="text-sm text-gray-600 mt-0.5">{c.description}</p>
                  </div>
                )}
                {c.call_to_action && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">CTA</span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {c.call_to_action.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {creative.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium group"
                >
                  {tag}
                  {onRemoveTag && (
                    <button
                      onClick={() => onRemoveTag(c.ad_id, tag)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}

              {/* Input para adicionar tag */}
              {onAddTag && (
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Nova tag..."
                    className="w-20 px-2 py-1 text-xs border border-dashed border-gray-300 rounded-lg
                      focus:outline-none focus:border-blue-400 placeholder:text-gray-400"
                  />
                  {newTag && (
                    <button
                      onClick={handleAddTag}
                      className="p-0.5 text-blue-500 hover:text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Sub-componente para item de metrica
interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

const MetricItem: React.FC<MetricItemProps> = ({ icon, label, value, highlight }) => (
  <div className={`p-2.5 rounded-lg ${highlight ? 'bg-green-50' : 'bg-gray-50'}`}>
    <div className="flex items-center gap-1 mb-0.5">
      <span className="text-gray-400">{icon}</span>
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className={`text-sm font-semibold ${highlight ? 'text-green-700' : 'text-gray-900'}`}>
      {value}
    </span>
  </div>
);

export default CreativeDetailPanel;
