/**
 * OnboardingFlow
 *
 * Fluxo de boas-vindas exibido para novos usuarios apos o primeiro login.
 * Como o banco cria automaticamente um workspace ao cadastrar o usuario,
 * a etapa 2 permite ao usuario personalizar o nome desse workspace.
 *
 * Etapas:
 *  1. Boas-vindas    — apresentacao do produto
 *  2. Workspace      — renomear o workspace criado automaticamente
 *  3. Pronto         — confirmacao com atalhos rapidos
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Rocket,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Zap,
  Users,
  ChevronRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  Globe,
  Pencil,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const TOTAL_STEPS = 3;

interface OnboardingFlowProps {
  /** Nome do usuario logado para personalizar a saudacao */
  userName?: string;
  /** Callback chamado ao concluir o onboarding (marca flag no banco) */
  onComplete: () => void;
}

// ─── Barra de progresso ──────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <React.Fragment key={num}>
            <div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                transition-all duration-300
                ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}
              `}
            >
              {done ? <CheckCircle className="w-4 h-4" /> : num}
            </div>
            {num < total && (
              <div className={`h-0.5 w-12 transition-all duration-300 ${num < current ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Etapa 1: Boas-vindas ────────────────────────────────────────────────────

function WelcomeStep({ userName, onNext }: { userName?: string; onNext: () => void }) {
  const firstName = userName?.split(' ')[0] || userName;

  const features = [
    { icon: BarChart3, title: 'Analise de Campanhas', desc: 'Dados em tempo real de Meta e Google Ads' },
    { icon: Zap, title: 'Sincronizacao Automatica', desc: 'Seus dados sempre atualizados sem esforco' },
    { icon: TrendingUp, title: 'Insights com IA', desc: 'Recomendacoes inteligentes para seus resultados' },
    { icon: Users, title: 'Trabalho em Equipe', desc: 'Compartilhe workspaces com sua equipe' },
  ];

  return (
    <div className="text-center space-y-8">
      {/* Marca e saudacao */}
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg shadow-blue-200">
          <img
            src="/logotipo-adsops.fw.png"
            alt="AdsOPS"
            className="w-12 h-12 object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="mt-2 text-gray-500 text-base max-w-xs mx-auto">
            Voce esta a alguns passos de comecar a otimizar suas campanhas de trafego pago.
          </p>
        </div>
      </div>

      {/* Cards de funcionalidades */}
      <div className="grid grid-cols-2 gap-3 text-left">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md shadow-blue-200 hover:shadow-lg group"
      >
        Comecar configuracao
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

// ─── Etapa 2: Personalizar workspace ─────────────────────────────────────────

function WorkspaceStep({ onSuccess }: { onSuccess: (name: string) => void }) {
  const { workspaces, updateWorkspace } = useWorkspace();

  // Pega o workspace criado automaticamente (o primeiro da lista)
  const autoWorkspace = workspaces[0] ?? null;

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-preenche com o nome atual quando o workspace carregar
  useEffect(() => {
    if (autoWorkspace && !name) {
      setName(autoWorkspace.name);
    }
  }, [autoWorkspace]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) { setError('Digite um nome para o workspace.'); return; }
    if (trimmed.length < 2) { setError('O nome deve ter pelo menos 2 caracteres.'); return; }

    setLoading(true);
    setError('');

    try {
      if (autoWorkspace && trimmed !== autoWorkspace.name) {
        // Renomeia o workspace criado automaticamente
        const result = await updateWorkspace(autoWorkspace.id, { name: trimmed });
        if (!result.success) {
          setError(result.error || 'Nao foi possivel atualizar o workspace.');
          return;
        }
      }
      onSuccess(trimmed);
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Cabecalho */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-1">
          <Building2 className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Seu Workspace</h2>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          Um workspace foi criado para voce. Personalize o nome como preferir — pode ser o nome da sua agencia ou empresa.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="ws-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Workspace
          </label>
          <div className="relative">
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Ex: Agencia Exemplo, Minha Empresa..."
              className={`
                w-full pl-4 pr-10 py-3 border rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                transition-colors placeholder-gray-400
                ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
              `}
              disabled={loading}
              autoFocus
              maxLength={80}
            />
            <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Feedback / contador */}
          <div className="flex items-center justify-between mt-1.5">
            {error ? (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            ) : (
              <p className="text-xs text-gray-400">Pode alterar a qualquer momento depois</p>
            )}
            <span className="text-xs text-gray-400 ml-auto pl-2">{name.length}/80</span>
          </div>
        </div>

        {/* Dica informativa */}
        <div className="flex items-start gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
          <Globe className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Voce pode criar multiplos workspaces e convidar membros da sua equipe para colaborar em cada um.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md shadow-blue-200"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <>Continuar <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Etapa 3: Conclusao ───────────────────────────────────────────────────────

function CompletionStep({
  workspaceName,
  onComplete,
  onNavigateAndComplete,
}: {
  workspaceName: string;
  onComplete: () => void;
  onNavigateAndComplete: (page: string) => void;
}) {
  const actions = [
    {
      icon: BarChart3,
      label: 'Conectar Meta Ads',
      desc: 'Sincronize campanhas do Facebook e Instagram',
      page: 'meta-admin',
      color: 'bg-blue-50 border-blue-100 hover:bg-blue-100',
      iconColor: 'text-blue-600 bg-blue-100',
    },
    {
      icon: Globe,
      label: 'Conectar Google Ads',
      desc: 'Sincronize campanhas do Google',
      page: 'google-admin',
      color: 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100',
      iconColor: 'text-emerald-600 bg-emerald-100',
    },
    {
      icon: Users,
      label: 'Gerenciar Workspace',
      desc: 'Convide membros para sua equipe',
      page: 'workspaces',
      color: 'bg-orange-50 border-orange-100 hover:bg-orange-100',
      iconColor: 'text-orange-600 bg-orange-100',
    },
  ];

  return (
    <div className="space-y-7 text-center">
      {/* Sucesso */}
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tudo pronto!</h2>
          <p className="text-gray-500 text-sm mt-1">
            Workspace{' '}
            <span className="font-semibold text-gray-700">"{workspaceName}"</span>{' '}
            configurado com sucesso.
          </p>
        </div>
      </div>

      {/* Proximos passos */}
      <div className="text-left space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Proximos passos
        </p>
        {actions.map(({ icon: Icon, label, desc, page, color, iconColor }) => (
          <button
            key={page}
            onClick={() => onNavigateAndComplete(page)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 group ${color}`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </button>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200"
      >
        Ir para o Dashboard
        <Rocket className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');

  // Navega para uma pagina especifica e finaliza o onboarding
  const handleNavigateAndComplete = (page: string) => {
    window.dispatchEvent(new CustomEvent('changePage', { detail: { page } }));
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      {/* Decoracao de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-slate-100 rounded-full opacity-60 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden">
        {/* Barra de progresso linear no topo */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Indicador circular de etapas */}
          <div className="mb-7">
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>

          {step === 1 && (
            <WelcomeStep userName={userName} onNext={() => setStep(2)} />
          )}

          {step === 2 && (
            <WorkspaceStep
              onSuccess={(name) => {
                setWorkspaceName(name);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <CompletionStep
              workspaceName={workspaceName}
              onComplete={onComplete}
              onNavigateAndComplete={handleNavigateAndComplete}
            />
          )}
        </div>

        {/* Rodape */}
        <div className="px-8 pb-5 text-center">
          <p className="text-xs text-gray-400">Etapa {step} de {TOTAL_STEPS}</p>
        </div>
      </div>
    </div>
  );
}
