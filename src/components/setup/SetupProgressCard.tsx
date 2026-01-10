/**
 * SetupProgressCard
 *
 * Card que mostra visualmente o progresso do setup inicial.
 * Exibe um checklist e barra de progresso.
 */

import React from 'react';
import { CheckCircle, Circle, Rocket } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { SetupStatus } from '../../lib/services/SetupService';

interface SetupProgressCardProps {
  // Status do setup
  setupStatus: SetupStatus | null;

  // Callback quando usuário clica em continuar configuração
  onContinueSetup: () => void;

  // Se está carregando
  loading?: boolean;
}

export const SetupProgressCard: React.FC<SetupProgressCardProps> = ({
  setupStatus,
  onContinueSetup,
  loading = false,
}) => {
  if (!setupStatus || !setupStatus.needsSetup) {
    return null;
  }

  // Lista de passos
  const steps = [
    {
      key: 'workspace',
      label: 'Conta criada',
      completed: setupStatus.hasWorkspace,
    },
    {
      key: 'connection',
      label: 'Conectar Meta Ads',
      completed: setupStatus.hasConnection,
    },
    {
      key: 'clients',
      label: 'Adicionar clientes',
      completed: setupStatus.hasClients && setupStatus.hasBindings,
    },
    {
      key: 'sync',
      label: 'Sincronizar dados',
      completed: !setupStatus.needsSetup,
    },
  ];

  return (
    <Card>
      <div className="flex items-start mb-4">
        <div className="flex-shrink-0 mr-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Rocket className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Configure sua conta
          </h3>
          <p className="text-sm text-gray-600">
            Complete estes passos para começar a usar a plataforma.
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progresso geral
          </span>
          <span className="text-sm font-semibold text-blue-600">
            {Math.round(setupStatus.progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${setupStatus.progress}%` }}
          />
        </div>
      </div>

      {/* Checklist de passos */}
      <div className="space-y-3 mb-6">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className="flex items-center"
          >
            {step.completed ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
            )}
            <span
              className={`ml-3 text-sm ${
                step.completed
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-600'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Botão de ação */}
      <Button
        onClick={onContinueSetup}
        disabled={loading}
        loading={loading}
        className="w-full"
      >
        {setupStatus.progress === 0
          ? 'Iniciar configuração'
          : 'Continuar configuração'}
      </Button>
    </Card>
  );
};
