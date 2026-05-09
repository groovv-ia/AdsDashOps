/**
 * OnboardingFlow
 *
 * Fluxo de boas-vindas exibido para novos usuarios apos o primeiro login.
 * Guia o usuario pelas etapas iniciais de configuracao da plataforma,
 * incluindo a criacao obrigatoria do primeiro workspace.
 *
 * Etapas:
 *  1. Boas-vindas — apresentacao do produto
 *  2. Criar Workspace — formulario de criacao com nome
 *  3. Pronto — confirmacao e atalhos rapidos
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

// Numero total de etapas do onboarding
const TOTAL_STEPS = 3;

interface OnboardingFlowProps {
  /** Nome do usuario logado para personalizar a mensagem */
  userName?: string;
  /** Callback chamado ao concluir o onboarding */
  onComplete: () => void;
}

/**
 * Barra de progresso das etapas
 */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < current;
        const isActive = stepNum === current;

        return (
          <React.Fragment key={stepNum}>
            <div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                transition-all duration-300
                ${isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isActive
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-gray-100 text-gray-400'}
              `}
            >
              {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNum}
            </div>
            {stepNum < total && (
              <div
                className={`h-0.5 w-12 transition-all duration-300 ${
                  stepNum < current ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Etapa 1: Boas-vindas
 */
function WelcomeStep({ userName, onNext }: { userName?: string; onNext: () => void }) {
  const features = [
    {
      icon: BarChart3,
      title: 'Analise de Campanhas',
      description: 'Dados em tempo real de Meta e Google Ads',
    },
    {
      icon: Zap,
      title: 'Sincronizacao Automatica',
      description: 'Seus dados sempre atualizados sem esforco',
    },
    {
      icon: TrendingUp,
      title: 'Insights com IA',
      description: 'Recomendacoes inteligentes para melhorar resultados',
    },
    {
      icon: Users,
      title: 'Trabalho em Equipe',
      description: 'Compartilhe workspaces com sua equipe',
    },
  ];

  return (
    <div className="text-center space-y-8">
      {/* Logo e mensagem de boas-vindas */}
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg shadow-blue-200 mb-2">
          <img
            src="/logotipo-adsops.fw.png"
            alt="AdsOPS"
            className="w-12 h-12 object-contain"
            onError={(e) => {
              // Fallback caso a imagem nao carregue
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <Rocket className="w-10 h-10 text-white hidden" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo{userName ? `, ${userName.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-2 text-gray-500 text-base max-w-sm mx-auto">
            Voce esta a alguns passos de comecar a otimizar suas campanhas de trafego pago.
          </p>
        </div>
      </div>

      {/* Cards de funcionalidades */}
      <div className="grid grid-cols-2 gap-3 text-left">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 group"
      >
        Comecar configuracao
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

/**
 * Etapa 2: Criacao do primeiro workspace
 */
function CreateWorkspaceStep({ onSuccess }: { onSuccess: (workspaceName: string) => void }) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Digite um nome para o workspace.');
      return;
    }
    if (trimmedName.length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createWorkspace({ name: trimmedName });

      if (!result.success) {
        setError(result.error || 'Nao foi possivel criar o workspace. Tente novamente.');
        return;
      }

      onSuccess(trimmedName);
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
        <h2 className="text-2xl font-bold text-gray-900">Crie seu Workspace</h2>
        <p className="text-gray-500 text-sm max-w-xs mx-auto">
          Um workspace e o seu espaco de trabalho onde voce organiza clientes,
          campanhas e conexoes com plataformas de anuncios.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="ws-name" className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Workspace
          </label>
          <input
            id="ws-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Ex: Agencia Exemplo, Minha Empresa..."
            className={`
              w-full px-4 py-3 border rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-colors placeholder-gray-400
              ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
            `}
            disabled={loading}
            autoFocus
            maxLength={80}
          />
          {/* Contador de caracteres */}
          <div className="flex items-center justify-between mt-1.5">
            {error ? (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Pode ser o nome da sua agencia ou empresa
              </p>
            )}
            <span className="text-xs text-gray-400 ml-auto pl-2">{name.length}/80</span>
          </div>
        </div>

        {/* Dica visual */}
        <div className="flex items-start gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
          <Globe className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Voce pode criar multiplos workspaces depois e convidar membros da sua equipe para cada um deles.
          </p>
        </div>

        {/* Botao de criar */}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando workspace...
            </>
          ) : (
            <>
              Criar Workspace
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * Etapa 3: Conclusao e atalhos
 */
function CompletionStep({
  workspaceName,
  onComplete,
  onNavigate,
}: {
  workspaceName: string;
  onComplete: () => void;
  onNavigate: (page: string) => void;
}) {
  const quickActions = [
    {
      icon: BarChart3,
      label: 'Conectar Meta Ads',
      description: 'Sincronize campanhas do Facebook e Instagram',
      page: 'meta-admin',
      color: 'bg-blue-50 border-blue-100 hover:bg-blue-100',
      iconColor: 'text-blue-600 bg-blue-100',
    },
    {
      icon: Globe,
      label: 'Conectar Google Ads',
      description: 'Sincronize campanhas do Google',
      page: 'google-admin',
      color: 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100',
      iconColor: 'text-emerald-600 bg-emerald-100',
    },
    {
      icon: Users,
      label: 'Gerenciar Workspace',
      description: 'Convide membros para sua equipe',
      page: 'workspaces',
      color: 'bg-orange-50 border-orange-100 hover:bg-orange-100',
      iconColor: 'text-orange-600 bg-orange-100',
    },
  ];

  return (
    <div className="space-y-7 text-center">
      {/* Animacao de sucesso */}
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tudo pronto!</h2>
          <p className="text-gray-500 text-sm mt-1">
            Workspace{' '}
            <span className="font-semibold text-gray-700">"{workspaceName}"</span>{' '}
            criado com sucesso.
          </p>
        </div>
      </div>

      {/* Proximos passos */}
      <div className="text-left space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Proximos passos
        </p>
        {quickActions.map(({ icon: Icon, label, description, page, color, iconColor }) => (
          <button
            key={page}
            onClick={() => {
              onComplete();
              onNavigate(page);
            }}
            className={`
              w-full flex items-center gap-3 p-3.5 rounded-xl border text-left
              transition-all duration-200 group
              ${color}
            `}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Botao de ir para dashboard */}
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

/**
 * Componente principal do fluxo de onboarding
 */
export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [createdWorkspaceName, setCreatedWorkspaceName] = useState('');

  // Callback para navegar para uma pagina especifica apos concluir
  const handleNavigateAndComplete = (page: string) => {
    // Dispara evento de mudanca de pagina antes de concluir
    window.dispatchEvent(new CustomEvent('changePage', { detail: { page } }));
    onComplete();
  };

  return (
    // Overlay de fundo com gradiente suave
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-slate-100 rounded-full opacity-60 blur-3xl" />
      </div>

      {/* Card principal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden">
        {/* Barra de progresso no topo */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        {/* Conteudo */}
        <div className="p-8">
          {/* Indicador de etapas */}
          <div className="mb-7">
            <StepIndicator current={step} total={TOTAL_STEPS} />
          </div>

          {/* Renderizacao condicional por etapa */}
          {step === 1 && (
            <WelcomeStep
              userName={userName}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <CreateWorkspaceStep
              onSuccess={(name) => {
                setCreatedWorkspaceName(name);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <CompletionStep
              workspaceName={createdWorkspaceName}
              onComplete={onComplete}
              onNavigate={handleNavigateAndComplete}
            />
          )}
        </div>

        {/* Rodape com numero da etapa */}
        <div className="px-8 pb-5 text-center">
          <p className="text-xs text-gray-400">
            Etapa {step} de {TOTAL_STEPS}
          </p>
        </div>
      </div>
    </div>
  );
}
