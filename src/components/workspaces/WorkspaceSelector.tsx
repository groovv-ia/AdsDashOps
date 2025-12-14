/**
 * WorkspaceSelector
 *
 * Componente dropdown para selecionar e trocar entre workspaces.
 * Exibe o logo do workspace se disponivel, caso contrario usa icone padrao.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Plus, Settings } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Workspace } from '../../lib/services/WorkspaceService';

interface WorkspaceSelectorProps {
  onNavigateToWorkspaces?: () => void;
  compact?: boolean;
}

/**
 * Componente para exibir logo ou icone padrao do workspace
 */
function WorkspaceLogo({
  workspace,
  size = 'md',
  isActive = false,
}: {
  workspace: Workspace;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Se tem logo, exibe a imagem
  if (workspace.logo_url) {
    return (
      <div className={`${sizeClasses[size]} rounded-md overflow-hidden flex-shrink-0`}>
        <img
          src={workspace.logo_url}
          alt={workspace.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Se falhar ao carregar, esconde a imagem e mostra fallback
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Fallback: icone padrao com gradiente
  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-md flex items-center justify-center flex-shrink-0
        ${isActive
          ? 'bg-blue-100 text-blue-600'
          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
        }
      `}
    >
      <Building2 className={iconSizes[size]} />
    </div>
  );
}

export function WorkspaceSelector({ onNavigateToWorkspaces, compact = false }: WorkspaceSelectorProps) {
  const { currentWorkspace, workspaces, setCurrentWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seleciona workspace
  const handleSelect = (workspace: typeof workspaces[0]) => {
    setCurrentWorkspace(workspace);
    setIsOpen(false);
  };

  // Navega para pagina de workspaces
  const handleManage = () => {
    setIsOpen(false);
    if (onNavigateToWorkspaces) {
      onNavigateToWorkspaces();
    }
  };

  // Mostra skeleton apenas enquanto carrega
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} bg-gray-100 rounded-lg animate-pulse`}>
        <div className="w-7 h-7 bg-gray-200 rounded-md" />
        <div className="w-20 h-4 bg-gray-200 rounded" />
      </div>
    );
  }

  // Se nao ha workspace, mostra botao para criar
  if (!currentWorkspace || workspaces.length === 0) {
    return (
      <button
        onClick={onNavigateToWorkspaces}
        className={`
          flex items-center gap-2 w-full
          ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}
          bg-blue-50 hover:bg-blue-100 border border-blue-200
          rounded-lg transition-colors text-left
        `}
      >
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
          <Plus className="w-4 h-4" />
        </div>
        <span className={`font-medium text-blue-600 ${compact ? 'text-sm' : ''}`}>
          Criar Workspace
        </span>
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Botao do selector */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 w-full
          ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}
          bg-gray-50 hover:bg-gray-100 border border-gray-200
          rounded-lg transition-colors text-left
        `}
      >
        <WorkspaceLogo workspace={currentWorkspace} size="sm" />

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
            {currentWorkspace.name}
          </p>
          {!compact && workspaces.length > 1 && (
            <p className="text-xs text-gray-500">
              {workspaces.length} workspaces
            </p>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[220px]">
          {/* Lista de workspaces */}
          <div className="max-h-60 overflow-y-auto">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSelect(workspace)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left
                  ${currentWorkspace.id === workspace.id ? 'bg-blue-50' : ''}
                `}
              >
                <WorkspaceLogo
                  workspace={workspace}
                  size="md"
                  isActive={currentWorkspace.id === workspace.id && !workspace.logo_url}
                />

                <span className={`flex-1 truncate ${
                  currentWorkspace.id === workspace.id ? 'font-medium text-blue-600' : 'text-gray-700'
                }`}>
                  {workspace.name}
                </span>

                {currentWorkspace.id === workspace.id && (
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="border-t border-gray-100 my-1" />

          {/* Acoes */}
          {onNavigateToWorkspaces && (
            <button
              onClick={handleManage}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left text-gray-600"
            >
              <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <span>Gerenciar Workspaces</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Export do componente auxiliar para uso em outros lugares
export { WorkspaceLogo };

// Export do index
export { WorkspaceSelector as default };
