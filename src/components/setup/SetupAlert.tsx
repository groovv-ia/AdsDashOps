/**
 * SetupAlert
 *
 * Banner de alerta que aparece no topo da aplicação quando o usuário
 * ainda não completou a configuração inicial da conta Meta Ads.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface SetupAlertProps {
  // Callback quando usuário clica em "Conectar agora"
  onClickSetup: () => void;

  // Se true, mostra o alerta
  show: boolean;
}

// Chave para localStorage
const DISMISS_KEY = 'setup_alert_dismissed_until';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export const SetupAlert: React.FC<SetupAlertProps> = ({
  onClickSetup,
  show,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Verifica se foi dispensado recentemente no mount
  useEffect(() => {
    checkIfDismissed();
  }, []);

  /**
   * Verifica se o alerta foi dispensado recentemente
   */
  const checkIfDismissed = () => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (!dismissedUntil) return;

      const dismissedTime = parseInt(dismissedUntil, 10);
      const now = Date.now();

      // Se o tempo de dispensa expirou, remove do localStorage
      if (now > dismissedTime) {
        localStorage.removeItem(DISMISS_KEY);
        setIsDismissed(false);
      } else {
        setIsDismissed(true);
      }
    } catch (error) {
      console.error('Error checking if alert is dismissed:', error);
    }
  };

  /**
   * Dispensa o alerta por 24 horas
   */
  const handleDismiss = () => {
    try {
      const dismissUntil = Date.now() + DISMISS_DURATION;
      localStorage.setItem(DISMISS_KEY, dismissUntil.toString());
      setIsDismissed(true);
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  // Não mostra se não deve mostrar ou se foi dispensado
  if (!show || isDismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="ml-3 text-sm font-medium text-yellow-800">
              Você ainda não conectou sua conta Meta Ads. Configure agora para
              começar a analisar suas campanhas.
            </p>
          </div>

          <div className="flex items-center ml-4 gap-2">
            <Button
              onClick={onClickSetup}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap"
            >
              Conectar agora
            </Button>

            <button
              onClick={handleDismiss}
              className="text-yellow-600 hover:text-yellow-800 transition-colors p-1"
              aria-label="Dispensar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
