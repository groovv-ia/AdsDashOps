/**
 * SetupPage
 *
 * Página dedicada para configuração inicial.
 * Permite acesso manual ao wizard de setup para usuários que pularam
 * ou querem reconfigurar.
 */

import React, { useState, useEffect } from 'react';
import { Rocket, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FirstTimeSetupWizard } from './FirstTimeSetupWizard';
import { SetupProgressCard } from './SetupProgressCard';
import { useFirstTimeSetup } from '../../hooks/useFirstTimeSetup';
import { supabase } from '../../lib/supabase';

export const SetupPage: React.FC = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Hook de setup
  const {
    loading,
    needsSetup,
    setupStatus,
    refetchStatus,
  } = useFirstTimeSetup(user?.id || null);

  /**
   * Carrega informações do usuário e workspace
   */
  useEffect(() => {
    loadUserAndWorkspace();
  }, []);

  const loadUserAndWorkspace = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      setUser(currentUser);

      // Busca workspace do usuário
      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', currentUser.id)
        .limit(1)
        .maybeSingle();

      if (workspaceData) {
        setWorkspaceId(workspaceData.workspace_id);
      }
    } catch (err) {
      console.error('Error loading user and workspace:', err);
    }
  };

  /**
   * Abre o wizard de setup
   */
  const handleStartSetup = () => {
    setShowWizard(true);
  };

  /**
   * Fecha o wizard e recarrega status
   */
  const handleCloseWizard = () => {
    setShowWizard(false);
    refetchStatus();
  };

  /**
   * Quando o setup é completado
   */
  const handleSetupComplete = () => {
    setShowWizard(false);
    refetchStatus();
  };

  // Loading state
  if (loading || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-gray-600 mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuração Inicial
        </h1>
        <p className="text-gray-600">
          Configure sua conta Meta Ads para começar a analisar suas campanhas.
        </p>
      </div>

      {/* Setup completado */}
      {!needsSetup && (
        <Card>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Configuração completa! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Sua conta está configurada e pronta para uso. Você já pode
              começar a analisar suas campanhas.
            </p>
            <Button
              onClick={() => (window.location.href = '/dashboard')}
              size="lg"
            >
              Ir para o Dashboard
            </Button>
          </div>
        </Card>
      )}

      {/* Setup incompleto */}
      {needsSetup && (
        <div className="space-y-6">
          {/* Card de progresso */}
          {setupStatus && setupStatus.progress > 0 && (
            <SetupProgressCard
              setupStatus={setupStatus}
              onContinueSetup={handleStartSetup}
              loading={false}
            />
          )}

          {/* Card principal de ação */}
          <Card>
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                <Rocket className="w-10 h-10 text-blue-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Configure sua conta Meta Ads em minutos
              </h2>

              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Siga nosso assistente de configuração simplificado para conectar
                suas contas Meta, criar clientes e começar a analisar suas
                campanhas em poucos cliques.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center text-left">
                  <div className="bg-blue-50 rounded-lg p-4 max-w-md">
                    <ul className="space-y-3 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                          1
                        </span>
                        <span>Conecte sua conta Meta Ads com OAuth seguro</span>
                      </li>
                      <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                          2
                        </span>
                        <span>Escolha como organizar suas contas</span>
                      </li>
                      <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                          3
                        </span>
                        <span>Deixe-nos criar os clientes automaticamente</span>
                      </li>
                      <li className="flex items-start">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                          4
                        </span>
                        <span>Pronto! Comece a analisar seus dados</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button onClick={handleStartSetup} size="lg">
                Iniciar Configuração
              </Button>

              <p className="text-xs text-gray-500 mt-4">
                Tempo estimado: 3-5 minutos
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && workspaceId && user && (
        <FirstTimeSetupWizard
          onClose={handleCloseWizard}
          onComplete={handleSetupComplete}
          workspaceId={workspaceId}
          userId={user.id}
          userEmail={user.email || ''}
        />
      )}
    </div>
  );
};
