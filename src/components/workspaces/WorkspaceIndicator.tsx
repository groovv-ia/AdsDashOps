/**
 * WorkspaceIndicator
 *
 * Componente visual que mostra o workspace ativo no topo das páginas.
 * Permite troca rápida entre workspaces e mostra alertas contextuais.
 */

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  AlertCircle,
  Info,
  Link2,
  Unlink,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface WorkspaceIndicatorProps {
  // Mostra número de conexões do workspace atual (opcional)
  connectionCount?: number;
  // Mostra alerta se não houver conexões
  showNoConnectionAlert?: boolean;
  // Tamanho do componente
  size?: 'sm' | 'md' | 'lg';
}

export function WorkspaceIndicator({
  connectionCount,
  showNoConnectionAlert = false,
  size = 'md',
}: WorkspaceIndicatorProps) {
  const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading } = useWorkspace();
  const [showDropdown, setShowDropdown] = useState(false);

  // Configurações de tamanho
  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-2.5 px-5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Handler para trocar workspace
  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      setShowDropdown(false);
      // Recarrega a página para atualizar todos os dados
      window.location.reload();
    }
  };

  if (isLoading || !currentWorkspace) {
    return (
      <div className={`flex items-center gap-2 bg-gray-100 rounded-lg ${sizeClasses[size]}`}>
        <Building2 className={`${iconSizes[size]} text-gray-400 animate-pulse`} />
        <span className="text-gray-500">Carregando workspace...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Indicador principal */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 bg-white border-2 border-blue-200 hover:border-blue-300 rounded-lg transition-colors ${sizeClasses[size]} group`}
      >
        {/* Logo ou ícone do workspace */}
        <div className={`${iconSizes[size]} rounded overflow-hidden flex-shrink-0`}>
          {currentWorkspace.logo_url ? (
            <img
              src={currentWorkspace.logo_url}
              alt={currentWorkspace.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className={`${iconSizes[size]} text-blue-600`} />
          )}
        </div>

        {/* Nome do workspace */}
        <div className="flex flex-col items-start">
          <span className="font-semibold text-gray-900 truncate max-w-[200px]">
            {currentWorkspace.name}
          </span>
          {connectionCount !== undefined && (
            <span className="text-xs text-gray-500">
              {connectionCount} {connectionCount === 1 ? 'conexão' : 'conexões'}
            </span>
          )}
        </div>

        {/* Ícone de dropdown */}
        <ChevronDown
          className={`${iconSizes[size]} text-gray-400 group-hover:text-gray-600 transition-transform ${
            showDropdown ? 'rotate-180' : ''
          }`}
        />

        {/* Badge de alerta se não houver conexões */}
        {showNoConnectionAlert && connectionCount === 0 && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Dropdown de workspaces */}
      {showDropdown && (
        <>
          {/* Overlay para fechar dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Menu dropdown */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            {/* Header do dropdown */}
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Seus Workspaces ({workspaces.length})
              </p>
            </div>

            {/* Lista de workspaces */}
            <div className="py-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceChange(workspace.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                    workspace.id === currentWorkspace.id ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Logo do workspace */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                    {workspace.logo_url ? (
                      <img
                        src={workspace.logo_url}
                        alt={workspace.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Info do workspace */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{workspace.name}</p>
                    {workspace.id === currentWorkspace.id && (
                      <p className="text-xs text-blue-600 font-medium">Workspace Ativo</p>
                    )}
                  </div>

                  {/* Check se é o atual */}
                  {workspace.id === currentWorkspace.id && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer com link para gerenciar */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <a
                href="/workspaces"
                className="block w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDropdown(false);
                  window.location.href = '/workspaces';
                }}
              >
                Gerenciar Workspaces
              </a>
            </div>
          </div>
        </>
      )}

      {/* Alerta se não houver conexões */}
      {showNoConnectionAlert && connectionCount === 0 && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">
                Nenhuma conexão configurada
              </h4>
              <p className="text-sm text-yellow-800 mb-2">
                Este workspace não possui conexões com Meta Ads ou Google Ads.
              </p>
              <div className="flex gap-2">
                <a
                  href="/meta-admin"
                  className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Conectar Meta Ads
                </a>
                <a
                  href="/google-admin"
                  className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Conectar Google Ads
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WorkspaceConnectionBadge
 *
 * Badge compacto para mostrar status de conexões do workspace
 */
interface ConnectionBadgeProps {
  hasMetaConnection: boolean;
  hasGoogleConnection: boolean;
  size?: 'sm' | 'md';
}

export function WorkspaceConnectionBadge({
  hasMetaConnection,
  hasGoogleConnection,
  size = 'sm',
}: ConnectionBadgeProps) {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (!hasMetaConnection && !hasGoogleConnection) {
    return (
      <div className={`flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded ${textSize}`}>
        <Unlink className={iconSize} />
        <span>Sem conexões</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded ${textSize}`}>
      <Link2 className={iconSize} />
      <span>
        {hasMetaConnection && hasGoogleConnection
          ? 'Meta + Google'
          : hasMetaConnection
          ? 'Meta Ads'
          : 'Google Ads'}
      </span>
    </div>
  );
}

/**
 * WorkspaceInfoTooltip
 *
 * Tooltip informativo sobre workspaces (para uso em páginas de ajuda)
 */
export function WorkspaceInfoTooltip() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900 mb-1">Sobre Workspaces</h4>
          <p className="text-sm text-blue-800 mb-2">
            Workspaces permitem organizar e separar dados de diferentes clientes ou projetos.
            Cada workspace possui suas próprias conexões e dados.
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Conexões são isoladas por workspace</li>
            <li>Troque entre workspaces usando o seletor acima</li>
            <li>Você pode criar múltiplos workspaces</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
