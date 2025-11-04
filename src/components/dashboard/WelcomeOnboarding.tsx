import React, { useState } from 'react';
import { X, Check, ArrowRight, Database, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface WelcomeOnboardingProps {
  onClose: () => void;
  onComplete: () => void;
}

/**
 * Componente WelcomeOnboarding
 *
 * Modal de boas-vindas opcional que explica o fluxo do sistema.
 * Exibido apenas na primeira vez que o usuário acessa o sistema.
 * Pode ser pulado ou fechado a qualquer momento.
 */
export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Database,
      title: 'Conecte Suas Campanhas',
      description: 'Conecte suas contas de Meta Ads, Google Ads ou TikTok Ads de forma rápida e segura com OAuth.',
      color: 'from-blue-600 to-purple-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      icon: TrendingUp,
      title: 'Sincronização Automática',
      description: 'Seus dados são importados e atualizados automaticamente. Aguarde alguns minutos para a primeira sincronização.',
      color: 'from-purple-600 to-pink-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      icon: BarChart3,
      title: 'Analise Suas Métricas',
      description: 'Visualize gráficos, tabelas e insights sobre suas campanhas. Filtre por plataforma, campanha, período e muito mais.',
      color: 'from-green-600 to-blue-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    }
  ];

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Marca que o usuário já viu o onboarding
        await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Erro ao salvar progresso do onboarding:', error);
    }

    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header com botão fechar */}
        <div className="relative p-6 border-b border-gray-200">
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo ao AdsOPS!</h2>
          <p className="text-gray-600 mt-1">Vamos te mostrar como funciona em 3 passos simples</p>
        </div>

        {/* Progress indicators */}
        <div className="flex items-center justify-center space-x-2 py-6 bg-gray-50">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-12 bg-gradient-to-r ' + currentStepData.color
                  : index < currentStep
                  ? 'w-8 bg-green-500'
                  : 'w-8 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step content com animação */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto mb-6 ${currentStepData.iconBg} rounded-2xl flex items-center justify-center`}>
              <StepIcon className={`w-10 h-10 ${currentStepData.iconColor}`} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {currentStepData.title}
            </h3>
            <p className="text-lg text-gray-600 max-w-lg mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Dica específica de cada etapa */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
              </div>
              <div>
                {currentStep === 0 && (
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> Você pode conectar múltiplas contas de diferentes plataformas para ter uma visão unificada.
                  </p>
                )}
                {currentStep === 1 && (
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> A primeira sincronização pode levar alguns minutos dependendo do volume de dados.
                  </p>
                )}
                {currentStep === 2 && (
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> Use os filtros para analisar campanhas específicas ou períodos personalizados.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer com botões de navegação */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Passo {currentStep + 1} de {steps.length}
          </div>

          <div className="flex items-center space-x-3">
            {!isLastStep && (
              <Button
                variant="ghost"
                onClick={handleSkip}
              >
                Pular tutorial
              </Button>
            )}
            <Button
              onClick={handleNext}
              icon={isLastStep ? Check : ArrowRight}
              iconPosition="right"
              className={`bg-gradient-to-r ${currentStepData.color} hover:opacity-90`}
            >
              {isLastStep ? 'Começar Agora' : 'Próximo'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
