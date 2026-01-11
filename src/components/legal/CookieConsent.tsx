import React from 'react';
import { X, Shield, Check, Settings, Lock } from 'lucide-react';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

/**
 * Componente CookieConsent
 *
 * Banner de consentimento de cookies com design moderno e persuasivo.
 * Exibido no centro da tela com overlay, seguindo diretrizes da LGPD.
 * Inclui imagem ilustrativa para melhor experiencia visual.
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

  // Nao renderiza se o usuario ja deu consentimento
  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Overlay com blur para destacar o banner */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300" />

      {/* Banner centralizado */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="animate-scale-in bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">

          {/* Layout em duas colunas no desktop */}
          <div className="flex flex-col md:flex-row">

            {/* Coluna da imagem - visivel apenas em telas maiores */}
            <div className="hidden md:block w-1/3 relative">
              <img
                src="/a-confident-smiling-woma33 copy copy.jpg"
                alt="Sua privacidade importa"
                className="w-full h-full object-cover"
              />
              {/* Overlay gradiente sobre a imagem */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
            </div>

            {/* Coluna do conteudo */}
            <div className="flex-1 p-6 md:p-8">

              {/* Botao fechar */}
              <button
                onClick={rejectOptional}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                aria-label="Fechar banner"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badge de seguranca */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-4">
                <Lock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Sua Privacidade
                </span>
              </div>

              {/* Titulo principal */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                Valorizamos sua
                <span className="text-blue-600"> privacidade</span>
              </h2>

              {/* Descricao persuasiva */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                Utilizamos cookies para personalizar sua experiencia e garantir que voce
                aproveite ao maximo nossa plataforma. Voce tem total controle sobre suas preferencias.
              </p>

              {/* Lista de beneficios */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Experiencia personalizada</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Navegacao mais rapida</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Seus dados protegidos (LGPD)</span>
                </div>
              </div>

              {/* Botoes de acao */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  onClick={acceptAll}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Aceitar Todos
                </button>
                <button
                  onClick={rejectOptional}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                  Apenas Essenciais
                </button>
              </div>

              {/* Link para customizar */}
              <div className="flex items-center justify-center">
                <button
                  onClick={openPreferences}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Personalizar preferencias</span>
                </button>
              </div>

              {/* Links legais */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
                <a
                  href="https://adsops.bolt.host/politica-de-privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  Politica de Privacidade
                </a>
                <span>|</span>
                <a
                  href="https://adsops.bolt.host/termos-de-uso"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  Termos de Uso
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS para animacoes */}
      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
};
