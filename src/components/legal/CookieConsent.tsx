import React, { useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

/**
 * Componente CookieConsent
 *
 * Banner de consentimento de cookies exibido no canto inferior esquerdo da tela.
 * Segue as diretrizes da LGPD e permite ao usuário gerenciar suas preferências.
 *
 * @example
 * <CookieConsent />
 */
export const CookieConsent: React.FC = () => {
  const {
    showBanner,
    acceptAll,
    rejectOptional,
    openPreferences,
  } = useCookieConsent();

  // Não renderiza se o usuário já deu consentimento
  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Overlay semi-transparente */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-40 transition-opacity duration-300" />

      {/* Banner de Cookies */}
      <div className="fixed bottom-6 left-6 z-50 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-[90vw] sm:w-[420px] border border-gray-200 overflow-hidden">
          {/* Header com título e botão fechar */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Controle sua privacidade
                </h3>
              </div>
              <button
                onClick={rejectOptional}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                aria-label="Fechar banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Descrição */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Nosso site usa cookies para melhorar a navegação.{' '}
              <a
                href="https://adsops.bolt.host/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Política de Privacidade
              </a>
              {' - '}
              <a
                href="https://adsops.bolt.host/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Termos de uso
              </a>
              {' - '}
              <button
                onClick={openPreferences}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Opt-out
              </button>
            </p>
          </div>

          {/* Botões de ação */}
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={openPreferences}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Customizar
            </button>
            <button
              onClick={rejectOptional}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Rejeitar
            </button>
            <button
              onClick={acceptAll}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Aceitar
            </button>
          </div>

          {/* Indicador visual no canto inferior esquerdo */}
          <div className="absolute bottom-4 left-4 opacity-30">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* CSS para animação */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </>
  );
};
