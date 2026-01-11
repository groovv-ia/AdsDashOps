import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface UpgradeBannerProps {
  onUpgradeClick?: () => void;
}

// Componente de banner promocional para upgrade de plano
// Exibido apenas para usuarios do plano Free
// Layout vertical centralizado com avatar, titulo, descricao e botao
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
      {/* Container principal com fundo claro e imagem de fundo com opacidade */}
      <div className="rounded-2xl bg-slate-100 p-5 text-center relative overflow-hidden">
        {/* Imagem de fundo com opacidade */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url('/a-confident-smiling-woman-in-her-30s-giving-a-thum.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />

        {/* Conteudo sobre a imagem de fundo */}
        <div className="relative z-10">
          {/* Avatar circular centralizado */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md">
              <img
                src="/a-confident-smiling-woma33 copy copy copy.jpg"
                alt="Upgrade para Pro"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Titulo centralizado */}
          <h3 className="font-semibold text-slate-800 text-[15px] mb-1.5">
            Upgrade para Pro
          </h3>

          {/* Descricao centralizada */}
          <p className="text-[12px] text-slate-500 leading-relaxed mb-4">
            Obtenha analises avancadas e campanhas ilimitadas
          </p>

          {/* Botao CTA azul com bordas arredondadas */}
          <button
            onClick={handleUpgradeClick}
            className="
              w-full py-2.5 px-4 rounded-xl
              bg-blue-500 hover:bg-blue-600
              text-white text-[13px] font-medium
              transition-colors duration-200
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
