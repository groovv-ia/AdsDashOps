import React, { useState } from 'react';
import { Cookie, Settings } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

/**
 * Componente CookieSettingsButton
 *
 * Botao flutuante para configurar preferencias de cookies.
 * Fica escondido apos o usuario aceitar/rejeitar a politica de cookies,
 * mantendo a interface limpa. O usuario pode acessar as configuracoes
 * de cookies atraves da pagina de Configuracoes caso precise alterar.
 *
 * @example
 * <CookieSettingsButton />
 */
export const CookieSettingsButton: React.FC = () => {
  const { hasConsented, openPreferences } = useCookieConsent();
  const [isHovered, setIsHovered] = useState(false);

  // Esconde o botao apos o usuario dar consentimento (aceitar ou rejeitar)
  // O usuario pode alterar as preferencias na pagina de Configuracoes
  if (hasConsented) {
    return null;
  }

  return (
    <button
      onClick={openPreferences}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
      aria-label="Configurações de cookies"
      title="Gerenciar preferências de cookies"
    >
      <Cookie className="w-6 h-6" />

      {/* Tooltip que aparece ao passar o mouse */}
      {isHovered && (
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg animate-fade-in">
          Configurações de Cookies
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
        </div>
      )}

      {/* CSS para animação do tooltip */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </button>
  );
};
