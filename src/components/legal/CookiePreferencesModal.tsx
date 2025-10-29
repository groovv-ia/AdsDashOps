import React, { useState, useEffect } from 'react';
import { X, Shield, Check } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';
import { CookieCategoryInfo } from '../../types/consent';

/**
 * Componente CookiePreferencesModal
 *
 * Modal para customização detalhada das preferências de cookies.
 * Permite ao usuário escolher quais categorias de cookies deseja aceitar.
 *
 * @example
 * <CookiePreferencesModal />
 */
export const CookiePreferencesModal: React.FC = () => {
  const {
    showPreferences,
    preferences,
    closePreferences,
    updatePreferences,
    acceptAll,
  } = useCookieConsent();

  // Estado local para as preferências enquanto o usuário customiza
  const [localPreferences, setLocalPreferences] = useState({
    necessary: preferences.necessary,
    functional: preferences.functional,
    marketing: preferences.marketing,
  });

  // Atualiza preferências locais quando as preferências globais mudam
  useEffect(() => {
    setLocalPreferences({
      necessary: preferences.necessary,
      functional: preferences.functional,
      marketing: preferences.marketing,
    });
  }, [preferences]);

  // Informações sobre as categorias de cookies
  const categories: CookieCategoryInfo[] = [
    {
      id: 'necessary',
      title: 'Cookies Necessários',
      description:
        'Estes cookies são essenciais para o funcionamento do site. Eles permitem funcionalidades básicas como segurança, gerenciamento de rede e acessibilidade. Você não pode desabilitar estes cookies.',
      required: true,
      enabled: localPreferences.necessary,
    },
    {
      id: 'functional',
      title: 'Cookies Funcionais',
      description:
        'Estes cookies ajudam a melhorar a experiência do usuário, lembrando suas preferências e configurações. Por exemplo, idioma preferido, região e outras configurações personalizadas.',
      required: false,
      enabled: localPreferences.functional,
    },
    {
      id: 'marketing',
      title: 'Cookies de Marketing e Analytics',
      description:
        'Estes cookies são usados para rastrear visitantes através dos websites. A intenção é exibir anúncios relevantes e envolventes para o usuário individual, além de coletar dados analíticos sobre o uso do site.',
      required: false,
      enabled: localPreferences.marketing,
    },
  ];

  // Handler para alternar uma categoria de cookie
  const handleToggle = (category: 'functional' | 'marketing') => {
    setLocalPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Handler para salvar preferências customizadas
  const handleSavePreferences = () => {
    updatePreferences(localPreferences);
  };

  // Handler para aceitar todos os cookies
  const handleAcceptAll = () => {
    acceptAll();
  };

  // Não renderiza se o modal não estiver aberto
  if (!showPreferences) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        onClick={closePreferences}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Preferências de Cookies
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Gerencie suas preferências de privacidade
                  </p>
                </div>
              </div>
              <button
                onClick={closePreferences}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-white"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-5">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {category.description}
                      </p>
                      {category.required && (
                        <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Sempre ativo
                        </p>
                      )}
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex-shrink-0">
                      <button
                        disabled={category.required}
                        onClick={() => !category.required && handleToggle(category.id as 'functional' | 'marketing')}
                        className={`
                          relative inline-flex h-7 w-12 items-center rounded-full transition-colors
                          ${category.enabled
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                            : 'bg-gray-300'
                          }
                          ${category.required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        `}
                        aria-label={`Toggle ${category.title}`}
                      >
                        <span
                          className={`
                            inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md
                            ${category.enabled ? 'translate-x-6' : 'translate-x-1'}
                          `}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Informação adicional */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">Importante:</span> Você pode alterar suas preferências a qualquer momento. Para mais informações, consulte nossa{' '}
                <a
                  href="https://adsops.bolt.host/politica-de-privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Política de Privacidade
                </a>
                .
              </p>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSavePreferences}
              className="flex-1 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Salvar Preferências
            </button>
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Aceitar Todos
            </button>
          </div>
        </div>
      </div>

      {/* CSS para animação */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};
