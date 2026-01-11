import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UpgradeBannerProps {
  onUpgradeClick?: () => void;
}

// Componente de banner promocional para upgrade de plano
// Exibido apenas para usuarios do plano Free
// Estilo premium com gradiente azul-roxo e ilustracao
export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ onUpgradeClick }) => {
  // Estado para controlar visibilidade baseada no plano do usuario
  const [isVisible, setIsVisible] = useState(true);
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'loading'>('loading');

  // Verifica o plano do usuario ao montar o componente
  useEffect(() => {
    const checkUserPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Busca o perfil do usuario para verificar o plano
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .maybeSingle();

          // Define o plano baseado nos dados ou assume free como padrao
          const plan = profile?.plan || 'free';
          setUserPlan(plan === 'pro' ? 'pro' : 'free');
        } else {
          setUserPlan('free');
        }
      } catch {
        // Em caso de erro, assume plano free
        setUserPlan('free');
      }
    };

    checkUserPlan();
  }, []);

  // Handler para click no botao de upgrade
  const handleUpgradeClick = () => {
    // Dispara evento de tracking para analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'upgrade_cta_clicked', {
        event_category: 'conversion',
        event_label: 'sidebar_banner',
      });
    }

    // Callback customizado ou navegacao padrao
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  // Nao renderiza durante carregamento ou se usuario e Pro
  if (userPlan === 'loading' || userPlan === 'pro' || !isVisible) {
    return null;
  }

  return (
    <div className="p-3 flex-shrink-0">
      {/* Container principal com gradiente azul-roxo suave */}
      <div className="rounded-2xl relative overflow-hidden shadow-lg transition-shadow duration-300 hover:shadow-xl">
        {/* Fundo com gradiente azul para roxo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600" />

        {/* Formas organicas decorativas de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Circulo grande no canto superior direito */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          {/* Circulo medio no canto inferior esquerdo */}
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-violet-400/15 rounded-full blur-lg" />
          {/* Forma organica central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-20 bg-blue-400/10 rounded-full blur-2xl rotate-12" />
          {/* Pequenos pontos decorativos */}
          <div className="absolute top-4 left-8 w-2 h-2 bg-white/20 rounded-full" />
          <div className="absolute bottom-8 right-12 w-1.5 h-1.5 bg-white/15 rounded-full" />
        </div>

        {/* Conteudo do banner */}
        <div className="relative z-10 p-4">
          {/* Avatar ilustrado circular */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
              <img
                src="/a-confident-smiling-woma33 copy copy copy.jpg"
                alt="Upgrade para Pro"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Icone de destaque */}
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Titulo principal */}
          <h3 className="font-bold text-white text-[16px] leading-tight mb-1.5 tracking-tight">
            Upgrade para Pro
          </h3>

          {/* Descricao dos beneficios */}
          <p className="text-[12px] text-blue-100/90 leading-relaxed mb-4 max-w-[200px]">
            Obtenha analises avancadas e campanhas ilimitadas
          </p>

          {/* Botao CTA com estilo pill e gradiente */}
          <button
            onClick={handleUpgradeClick}
            className="
              w-full py-2.5 px-4 rounded-full
              bg-gradient-to-r from-blue-600 to-violet-600
              text-white text-[13px] font-semibold
              shadow-md hover:shadow-lg
              transition-all duration-200
              hover:brightness-110
              active:scale-[0.98]
              border border-white/20
            "
          >
            Fazer Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};

// Adiciona tipagem para gtag no window
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, string>
    ) => void;
  }
}

export default UpgradeBanner;
