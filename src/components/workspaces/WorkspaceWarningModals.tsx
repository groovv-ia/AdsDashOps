/**
 * WorkspaceWarningModals
 *
 * Modais de aviso e confirmação para operações de workspace.
 * Evita que o usuário perca conexões sem saber o que está acontecendo.
 */

import React from 'react';
import { AlertTriangle, Info, ArrowRight, Link2, Unlink } from 'lucide-react';
import { WorkspaceConnections } from '../../lib/services/WorkspaceService';

/**
 * Modal de aviso ao criar novo workspace
 * Explica que as conexões atuais permanecerão no workspace original
 */
interface CreateWorkspaceWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentWorkspaceName: string;
  hasConnections: boolean;
}

export function CreateWorkspaceWarningModal({
  isOpen,
  onClose,
  onConfirm,
  currentWorkspaceName,
  hasConnections,
}: CreateWorkspaceWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        {/* Ícone de alerta */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
          <Info className="w-6 h-6 text-yellow-600" />
        </div>

        {/* Título */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Criar Novo Workspace
        </h2>

        {/* Mensagem */}
        <div className="space-y-3 mb-6 text-gray-700">
          <p className="text-center">
            Você está prestes a criar um novo workspace. É importante entender como isso funciona:
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</div>
              <p className="text-sm flex-1">
                <strong>Isolamento de dados:</strong> Cada workspace é completamente independente
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</div>
              <p className="text-sm flex-1">
                <strong>Conexões separadas:</strong> O novo workspace não terá nenhuma conexão configurada inicialmente
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</div>
              <p className="text-sm flex-1">
                <strong>Workspace atual preservado:</strong> Suas conexões em "{currentWorkspaceName}" permanecerão intactas
              </p>
            </div>
          </div>

          {hasConnections && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Para usar suas plataformas no novo workspace,
                  você precisará conectá-las novamente ou trocá-las do workspace atual.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-center text-gray-600">
            Você pode gerenciar e trocar entre workspaces a qualquer momento.
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Entendi, Criar Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de confirmação ao trocar workspace
 * Mostra o que está em cada workspace e confirma a troca
 */
interface SwitchWorkspaceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentWorkspace: {
    name: string;
    connections: WorkspaceConnections | null;
  };
  targetWorkspace: {
    name: string;
    connections: WorkspaceConnections | null;
  };
}

export function SwitchWorkspaceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  currentWorkspace,
  targetWorkspace,
}: SwitchWorkspaceConfirmModalProps) {
  if (!isOpen) return null;

  // Calcula totais
  const currentTotal =
    (currentWorkspace.connections?.meta_connections || 0) +
    (currentWorkspace.connections?.google_connections || 0);

  const targetTotal =
    (targetWorkspace.connections?.meta_connections || 0) +
    (targetWorkspace.connections?.google_connections || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
        {/* Título */}
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
          Confirmar Troca de Workspace
        </h2>

        {/* Comparação de workspaces */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Workspace atual */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Atual</div>
            <h3 className="font-bold text-gray-900 mb-3 truncate">{currentWorkspace.name}</h3>

            <div className="space-y-2">
              {currentTotal > 0 ? (
                <>
                  {currentWorkspace.connections?.meta_connections! > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Link2 className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">
                        {currentWorkspace.connections?.meta_connections} Meta Ads
                      </span>
                    </div>
                  )}
                  {currentWorkspace.connections?.google_connections! > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Link2 className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">
                        {currentWorkspace.connections?.google_connections} Google Ads
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Unlink className="w-4 h-4" />
                  <span>Sem conexões</span>
                </div>
              )}
            </div>
          </div>

          {/* Seta */}
          <div className="flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-blue-600" />
          </div>

          {/* Workspace destino */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="text-xs font-semibold text-blue-600 uppercase mb-2">Novo</div>
            <h3 className="font-bold text-gray-900 mb-3 truncate">{targetWorkspace.name}</h3>

            <div className="space-y-2">
              {targetTotal > 0 ? (
                <>
                  {targetWorkspace.connections?.meta_connections! > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Link2 className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-700">
                        {targetWorkspace.connections?.meta_connections} Meta Ads
                      </span>
                    </div>
                  )}
                  {targetWorkspace.connections?.google_connections! > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Link2 className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">
                        {targetWorkspace.connections?.google_connections} Google Ads
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Unlink className="w-4 h-4" />
                  <span>Sem conexões</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Aviso se o destino não tem conexões */}
        {targetTotal === 0 && currentTotal > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  O workspace de destino não possui conexões configuradas
                </p>
                <p className="text-sm text-yellow-700">
                  Você não verá dados de campanhas até conectar as plataformas neste workspace.
                  Suas conexões em "{currentWorkspace.name}" permanecerão disponíveis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informação */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-800 text-center">
            Ao trocar de workspace, a página será recarregada para atualizar todos os dados.
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Confirmar Troca
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner de alerta para workspaces sem conexões
 * Mostra no topo das páginas quando não há conexões configuradas
 */
interface NoConnectionBannerProps {
  onConnectMeta: () => void;
  onConnectGoogle: () => void;
  onSwitchWorkspace: () => void;
  hasOtherWorkspacesWithConnections: boolean;
}

export function NoConnectionBanner({
  onConnectMeta,
  onConnectGoogle,
  onSwitchWorkspace,
  hasOtherWorkspacesWithConnections,
}: NoConnectionBannerProps) {
  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <Unlink className="w-5 h-5 text-yellow-600" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Nenhuma Plataforma Conectada
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            Este workspace não possui conexões com Meta Ads ou Google Ads.
            Configure suas conexões para começar a visualizar dados.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onConnectMeta}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Conectar Meta Ads
            </button>
            <button
              onClick={onConnectGoogle}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Conectar Google Ads
            </button>

            {hasOtherWorkspacesWithConnections && (
              <>
                <span className="text-gray-400 self-center">ou</span>
                <button
                  onClick={onSwitchWorkspace}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Trocar de Workspace
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
