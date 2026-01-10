/**
 * FirstTimeSetupWizard
 *
 * Wizard de setup inicial para novos usuários.
 * Guia o usuário através de 4 passos simples:
 * 1. Conectar Meta Ads
 * 2. Escolher organização de contas
 * 3. Criação automática de clientes
 * 4. Confirmação e sincronização
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Loader,
  Rocket,
  Users,
  Building2,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SimpleMetaConnect } from '../dashboard/SimpleMetaConnect';
import { useAutoSetup, type MetaAccount } from '../../hooks/useAutoSetup';
import { supabase } from '../../lib/supabase';
import { completeSetupStep, markSetupAsComplete } from '../../lib/services/SetupService';

interface FirstTimeSetupWizardProps {
  // Callback quando o wizard é fechado
  onClose: () => void;

  // Callback quando o setup é completado com sucesso
  onComplete?: () => void;

  // Workspace ID do usuário
  workspaceId: string;

  // User ID
  userId: string;

  // Email do usuário (para sugestão de nome de cliente)
  userEmail: string;
}

type SetupMode = 'one-per-account' | 'single-client';

export const FirstTimeSetupWizard: React.FC<FirstTimeSetupWizardProps> = ({
  onClose,
  onComplete,
  workspaceId,
  userId,
  userEmail,
}) => {
  // Controle de passos (1 a 4)
  const [currentStep, setCurrentStep] = useState(1);

  // Contas Meta conectadas
  const [connectedAccounts, setConnectedAccounts] = useState<MetaAccount[]>([]);

  // Modo de organização escolhido
  const [setupMode, setSetupMode] = useState<SetupMode>('one-per-account');

  // Feedback de sucesso na conexão
  const [showConnectionSuccess, setShowConnectionSuccess] = useState(false);

  // Hook de automação
  const {
    loading,
    error,
    clearError,
    createClientForEachAccount,
    createSingleClientForAccounts,
  } = useAutoSetup();

  // Resultado da criação
  const [creationResult, setCreationResult] = useState<{
    clientsCreated: number;
    accountsBound: number;
  } | null>(null);

  /**
   * Handler quando Meta é conectado com sucesso (Passo 1)
   */
  const handleMetaConnected = (accounts: Array<{ id: string; name: string }>) => {
    console.log('✅ Meta conectado com sucesso!', accounts);
    setConnectedAccounts(accounts);

    // Marca step de connection como completo
    completeSetupStep(userId, workspaceId, 'connection');

    // Mostra feedback de sucesso por 1.5 segundos antes de avançar
    setShowConnectionSuccess(true);
    setTimeout(() => {
      setShowConnectionSuccess(false);
      setCurrentStep(2);
    }, 1500);
  };

  /**
   * Handler quando usuário escolhe organização e avança (Passo 2 → 3)
   */
  const handleContinueToCreation = () => {
    if (connectedAccounts.length === 0) {
      alert('Nenhuma conta conectada. Por favor, conecte suas contas Meta primeiro.');
      return;
    }

    // Avança para o passo 3 (criação automática)
    setCurrentStep(3);
    executeAutoCreation();
  };

  /**
   * Executa a criação automática de clientes e vinculações (Passo 3)
   */
  const executeAutoCreation = async () => {
    try {
      let result;

      if (setupMode === 'one-per-account') {
        // Cria um cliente para cada conta
        result = await createClientForEachAccount(
          connectedAccounts,
          workspaceId,
          userId
        );
      } else {
        // Cria um único cliente para todas as contas
        result = await createSingleClientForAccounts(
          connectedAccounts,
          workspaceId,
          userId,
          undefined,
          userEmail
        );
      }

      if (result.success) {
        setCreationResult(result);

        // Aguarda 1 segundo para mostrar o progresso
        setTimeout(() => {
          setCurrentStep(4);
        }, 1000);
      } else {
        console.error('Erro na criação:', result.error);
      }
    } catch (err) {
      console.error('Erro ao executar criação:', err);
    }
  };

  /**
   * Finaliza o wizard
   */
  const handleFinish = async (shouldSync: boolean) => {
    try {
      // Marca setup como completo
      await markSetupAsComplete(userId, workspaceId);

      if (shouldSync) {
        // TODO: Iniciar sincronização automática
        console.log('🔄 Sincronização será iniciada...');
      }

      // Chama callback de conclusão
      if (onComplete) {
        onComplete();
      }

      // Fecha o wizard
      onClose();
    } catch (err) {
      console.error('Erro ao finalizar setup:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Configuração Inicial
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Passo {currentStep} de 4
            </p>
          </div>
          {currentStep === 1 && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= currentStep
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Passo 1: Conectar Meta */}
          {currentStep === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Rocket className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Vamos conectar sua conta Meta Ads
                </h3>
                <p className="text-gray-600">
                  Conecte sua conta do Facebook/Instagram Ads para começar a
                  analisar suas campanhas.
                </p>
              </div>

              {/* Feedback de sucesso */}
              {showConnectionSuccess && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center text-green-800">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">
                      Conexão realizada com sucesso! Avançando...
                    </span>
                  </div>
                </div>
              )}

              {!showConnectionSuccess && (
                <SimpleMetaConnect
                  onConnectionSuccess={handleMetaConnected}
                  onCancel={onClose}
                  hideIfConnected={false}
                />
              )}
            </div>
          )}

          {/* Passo 2: Escolher organização */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                  <Building2 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Como você quer organizar suas contas?
                </h3>
                <p className="text-gray-600">
                  Encontramos {connectedAccounts.length} conta(s) Meta Ads
                </p>
              </div>

              {/* Lista de contas conectadas */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Contas conectadas:
                </p>
                <ul className="space-y-1">
                  {connectedAccounts.map((account) => (
                    <li key={account.id} className="text-sm text-green-800">
                      • {account.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opções de organização */}
              <div className="space-y-3 mb-6">
                {/* Opção 1: Um cliente por conta */}
                <button
                  onClick={() => setSetupMode('one-per-account')}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    setupMode === 'one-per-account'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          setupMode === 'one-per-account'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {setupMode === 'one-per-account' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <Users className="w-5 h-5 mr-2 text-gray-700" />
                        <h4 className="font-semibold text-gray-900">
                          Criar um cliente para cada conta
                        </h4>
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Ideal se você gerencia diferentes empresas ou clientes.
                        Cada conta terá seu próprio painel independente.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Opção 2: Um cliente único */}
                <button
                  onClick={() => setSetupMode('single-client')}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    setupMode === 'single-client'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          setupMode === 'single-client'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {setupMode === 'single-client' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <Building2 className="w-5 h-5 mr-2 text-gray-700" />
                        <h4 className="font-semibold text-gray-900">
                          Agrupar tudo em um único cliente
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Ideal se todas as contas pertencem à mesma empresa. Você
                        verá todos os dados agregados em um único painel.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleContinueToCreation}
                  disabled={loading}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Passo 3: Criação automática */}
          {currentStep === 3 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Configurando tudo para você...
              </h3>
              <p className="text-gray-600 mb-4">
                Estamos criando seus clientes e vinculando as contas. Isso
                levará apenas alguns segundos.
              </p>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="mt-2"
                  >
                    Voltar e tentar novamente
                  </Button>
                </div>
              )}

              {loading && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse" />
                    Criando clientes...
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse" />
                    Vinculando contas...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Passo 4: Sucesso */}
          {currentStep === 4 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Tudo pronto! 🎉
              </h3>
              <p className="text-gray-600 mb-6">
                Sua conta está configurada e pronta para uso.
              </p>

              {/* Resumo */}
              {creationResult && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {creationResult.clientsCreated}
                      </div>
                      <div className="text-sm text-blue-800">
                        {creationResult.clientsCreated === 1
                          ? 'Cliente criado'
                          : 'Clientes criados'}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {creationResult.accountsBound}
                      </div>
                      <div className="text-sm text-blue-800">
                        {creationResult.accountsBound === 1
                          ? 'Conta vinculada'
                          : 'Contas vinculadas'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleFinish(true)}
                  size="lg"
                  className="w-full"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Sincronizar dados agora
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFinish(false)}
                  size="lg"
                  className="w-full"
                >
                  Ir para o painel
                </Button>
              </div>

              <p className="mt-4 text-xs text-gray-500">
                Você pode sincronizar seus dados a qualquer momento na página de
                configurações.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
