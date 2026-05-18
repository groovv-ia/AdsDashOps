/**
 * CampaignObservationPanel
 *
 * Painel com dois blocos distintos e independentes:
 *
 * Bloco 1 — Anotacoes do Gestor:
 *   Textarea livre para o gestor registrar observacoes estrategicas.
 *   Salva no Supabase sem envolver a IA.
 *
 * Bloco 2 — Analise com IA:
 *   Usa o texto do gestor + metricas reais da campanha como contexto.
 *   Exibe resumo executivo, highlights e sugestoes estrategicas.
 *   Resultado persiste no Supabase para nao se perder entre sessoes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PenLine,
  Sparkles,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  Trash2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  CampaignObservationService,
  type CampaignObservation,
  type AIAnalysisResult,
  type CampaignMetricsForAI,
} from '../../lib/services/CampaignObservationService';
import { useWorkspace } from '../../contexts/WorkspaceContext';

// ── Props ─────────────────────────────────────────────────

interface CampaignObservationPanelProps {
  campaignId:          string;
  campaignName:        string;
  campaignObjective?:  string;
  metaAdAccountId:     string;
  metrics:             CampaignMetricsForAI | null;
  period:              { start: string; end: string };
}

// ── Helpers ───────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// Configuracao visual dos tipos de highlight
const HIGHLIGHT_CONFIG = {
  positive:  { icon: CheckCircle2,   bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700',  label: 'Positivo'  },
  attention: { icon: AlertTriangle,  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  badge: 'bg-amber-100 text-amber-700',  label: 'Atenção'   },
  critical:  { icon: XCircle,        bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700',      label: 'Crítico'   },
};

// Configuracao visual das prioridades de sugestao
const PRIORITY_CONFIG = {
  high:   { dot: 'bg-red-400',    label: 'Alta prioridade',   text: 'text-red-600'    },
  medium: { dot: 'bg-amber-400',  label: 'Média prioridade',  text: 'text-amber-600'  },
  low:    { dot: 'bg-gray-400',   label: 'Baixa prioridade',  text: 'text-gray-500'   },
};

// ── Componente principal ───────────────────────────────────

export const CampaignObservationPanel: React.FC<CampaignObservationPanelProps> = ({
  campaignId,
  campaignName,
  campaignObjective,
  metaAdAccountId,
  metrics,
  period,
}) => {
  const { currentWorkspace } = useWorkspace();
  const service = CampaignObservationService.getInstance();

  // Estados do registro salvo
  const [observation, setObservation] = useState<CampaignObservation | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  // Estados do bloco do gestor
  const [managerNotes, setManagerNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);
  const [notesDirty, setNotesDirty] = useState(false);

  // Estados do bloco de IA
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiExpanded, setAiExpanded] = useState(true);

  const workspaceId = currentWorkspace?.id ?? '';

  // Carrega o registro salvo ao montar o componente
  useEffect(() => {
    if (!workspaceId || !campaignId) return;
    loadRecord();
  }, [campaignId, workspaceId]);

  const loadRecord = useCallback(async () => {
    try {
      setLoadingRecord(true);
      const rec = await service.getObservation(campaignId, workspaceId);
      if (rec) {
        setObservation(rec);
        setManagerNotes(rec.manager_notes ?? '');
        setNotesSavedAt(rec.updated_at);
        if (rec.ai_analysis) {
          setAiResult(rec.ai_analysis as AIAnalysisResult);
        }
      }
    } catch {
      // Silencioso — campo simplesmente começa vazio
    } finally {
      setLoadingRecord(false);
    }
  }, [campaignId, workspaceId]);

  // Salva apenas as anotacoes do gestor
  const handleSaveNotes = async () => {
    if (!workspaceId) return;
    try {
      setSavingNotes(true);
      const saved = await service.saveManagerNotes({
        campaignId,
        metaAdAccountId,
        workspaceId,
        managerNotes,
      });
      setObservation(saved);
      setNotesSavedAt(saved.updated_at);
      setNotesDirty(false);
    } catch (err) {
      console.error('Erro ao salvar anotacoes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Gera analise de IA
  const handleGenerateAi = async () => {
    if (!workspaceId || !metrics) return;
    try {
      setGeneratingAi(true);
      setAiError('');
      const result = await service.requestAiAnalysis({
        campaignId,
        campaignName,
        campaignObjective,
        metaAdAccountId,
        workspaceId,
        managerNotes,
        metrics,
        period,
      });
      setAiResult(result);
      setAiExpanded(true);
      // Atualiza o notesSavedAt pois o upsert tambem salva as notas
      setNotesSavedAt(result.generated_at);
      setNotesDirty(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar analise';
      setAiError(msg);
    } finally {
      setGeneratingAi(false);
    }
  };

  if (!workspaceId) return null;

  return (
    <div className="space-y-4">
      {/* ── Bloco 1: Anotacoes do Gestor ───────────────────── */}
      <Card className="overflow-hidden">
        {/* Cabecalho */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <PenLine className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Anotacoes do Gestor</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Registre observacoes estrategicas, contexto de mercado ou pontos de atencao sobre esta campanha.
            </p>
          </div>
          {notesSavedAt && !notesDirty && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>Salvo em {formatTimestamp(notesSavedAt)}</span>
            </div>
          )}
        </div>

        {/* Corpo */}
        <div className="px-5 py-4 space-y-3">
          {loadingRecord ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando anotacoes...
            </div>
          ) : (
            <textarea
              value={managerNotes}
              onChange={e => {
                setManagerNotes(e.target.value);
                setNotesDirty(true);
              }}
              placeholder={`Escreva sua analise sobre a campanha "${campaignName}"...\n\nExemplo: "Essa campanha está performando muito bem com o público lookalike. O CPC caiu 20% depois dos ajustes no criativo da semana passada. Preciso testar um novo conjunto de anuncios focado no publico mais jovem."`}
              rows={6}
              className="w-full text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200
                rounded-xl px-4 py-3 resize-y outline-none leading-relaxed
                focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100
                transition-all duration-150"
            />
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Indicador de nao salvo */}
            {notesDirty && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Voce tem alteracoes nao salvas
              </p>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {/* Botao Salvar Anotacoes */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes || loadingRecord || !notesDirty}
              >
                {savingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Salvar anotacoes
                  </>
                )}
              </Button>

              {/* Botao Gerar Analise */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateAi}
                disabled={generatingAi || loadingRecord || !metrics}
                title={!metrics ? 'Aguarde o carregamento das metricas' : undefined}
              >
                {generatingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {aiResult ? 'Reanalisar com IA' : 'Analisar com IA'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Bloco 2: Resultado da IA ───────────────────────── */}
      {(aiResult || generatingAi || aiError) && (
        <Card className="overflow-hidden">
          {/* Cabecalho */}
          <div
            className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 cursor-pointer select-none"
            onClick={() => setAiExpanded(v => !v)}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Analise com IA</h3>
              {aiResult && (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Gerada em {formatTimestamp(aiResult.generated_at)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {aiResult && (
                <button
                  onClick={e => { e.stopPropagation(); handleGenerateAi(); }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  disabled={generatingAi}
                >
                  <RefreshCw className={`w-3 h-3 ${generatingAi ? 'animate-spin' : ''}`} />
                  Reanalisar
                </button>
              )}
              {aiExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </div>
          </div>

          {/* Corpo colapsavel */}
          {aiExpanded && (
            <div className="px-5 py-5 space-y-5">
              {/* Estado de carregamento */}
              {generatingAi && !aiResult && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-200" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Analisando campanha...</p>
                  <p className="text-xs text-gray-400">Combinando metricas e anotacoes do gestor</p>
                </div>
              )}

              {/* Erro */}
              {aiError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Erro ao gerar analise</p>
                    <p className="text-xs text-red-600 mt-0.5">{aiError}</p>
                  </div>
                </div>
              )}

              {/* Resultado */}
              {aiResult && !generatingAi && (
                <div className="space-y-5">
                  {/* Resumo executivo */}
                  {aiResult.executive_summary && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5">
                        Resumo Executivo
                      </p>
                      <p className="text-sm text-blue-900 leading-relaxed">
                        {aiResult.executive_summary}
                      </p>
                    </div>
                  )}

                  {/* Highlights */}
                  {aiResult.highlights?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pontos de Atencao
                      </p>
                      <div className="space-y-2">
                        {aiResult.highlights.map((h, i) => {
                          const cfg = HIGHLIGHT_CONFIG[h.type] ?? HIGHLIGHT_CONFIG.attention;
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 rounded-xl px-3.5 py-3 border ${cfg.bg} ${cfg.border}`}
                            >
                              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.text}`} />
                              <div className="flex-1 min-w-0">
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide mb-1 ${cfg.badge}`}>
                                  {cfg.label}
                                </span>
                                <p className={`text-sm leading-relaxed ${cfg.text}`}>{h.text}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sugestoes */}
                  {aiResult.suggestions?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Sugestoes Estrategicas
                      </p>
                      <div className="space-y-2">
                        {aiResult.suggestions.map((s, i) => {
                          const cfg = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.medium;
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3"
                            >
                              <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                <span className="text-xs text-gray-400 font-semibold w-4 text-right">{i + 1}.</span>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 leading-relaxed">{s.text}</p>
                                <p className={`text-[11px] font-medium mt-0.5 ${cfg.text}`}>{cfg.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Feedback sobre as anotacoes do gestor */}
                  {aiResult.manager_notes_feedback && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-gray-500" />
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Sobre suas anotacoes
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {aiResult.manager_notes_feedback}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
