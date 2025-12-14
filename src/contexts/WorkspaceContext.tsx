/**
 * WorkspaceContext
 *
 * Contexto global para gerenciamento do workspace ativo.
 * Fornece o workspace atual e funcoes para trocar entre workspaces.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Workspace,
  listUserWorkspaces,
  getDefaultWorkspace,
  createWorkspace as createWorkspaceService,
  updateWorkspace as updateWorkspaceService,
  deleteWorkspace as deleteWorkspaceService,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '../lib/services/WorkspaceService';
import { supabase } from '../lib/supabase';

// Chave para persistir workspace selecionado no localStorage
const WORKSPACE_STORAGE_KEY = 'adsops_active_workspace_id';

// Interface do contexto
interface WorkspaceContextType {
  // Estado atual
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;

  // Acoes
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (input: CreateWorkspaceInput) => Promise<{ success: boolean; error?: string }>;
  updateWorkspace: (id: string, input: UpdateWorkspaceInput) => Promise<{ success: boolean; error?: string }>;
  deleteWorkspace: (id: string) => Promise<{ success: boolean; error?: string }>;
}

// Criar contexto
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Props do provider
interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * Provider do contexto de workspace
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  // Estados
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega workspaces do usuario
  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: listError } = await listUserWorkspaces();

      if (listError) {
        setError(listError);
        setWorkspaces([]);
        return;
      }

      setWorkspaces(data);

      // Se nao tem workspace atual, seleciona o primeiro
      if (data.length > 0 && !currentWorkspace) {
        // Tenta recuperar workspace salvo no localStorage
        const savedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

        if (savedWorkspaceId) {
          const saved = data.find(w => w.id === savedWorkspaceId);
          if (saved) {
            setCurrentWorkspaceState(saved);
            return;
          }
        }

        // Usa o workspace padrao
        const { data: defaultWs } = await getDefaultWorkspace();
        if (defaultWs) {
          setCurrentWorkspaceState(defaultWs);
          localStorage.setItem(WORKSPACE_STORAGE_KEY, defaultWs.id);
        } else if (data.length > 0) {
          setCurrentWorkspaceState(data[0]);
          localStorage.setItem(WORKSPACE_STORAGE_KEY, data[0].id);
        }
      }
    } catch (err) {
      setError('Erro ao carregar workspaces');
      console.error('Erro ao carregar workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  // Define workspace atual
  const setCurrentWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
  }, []);

  // Cria novo workspace
  const createWorkspace = useCallback(async (input: CreateWorkspaceInput) => {
    const { data, error: createError } = await createWorkspaceService(input);

    if (createError || !data) {
      return { success: false, error: createError || 'Erro ao criar workspace' };
    }

    // Adiciona a lista e seleciona
    setWorkspaces(prev => [...prev, data]);
    setCurrentWorkspace(data);

    return { success: true };
  }, [setCurrentWorkspace]);

  // Atualiza workspace
  const updateWorkspace = useCallback(async (id: string, input: UpdateWorkspaceInput) => {
    const { data, error: updateError } = await updateWorkspaceService(id, input);

    if (updateError || !data) {
      return { success: false, error: updateError || 'Erro ao atualizar workspace' };
    }

    // Atualiza na lista
    setWorkspaces(prev => prev.map(w => w.id === id ? data : w));

    // Atualiza atual se for o mesmo
    if (currentWorkspace?.id === id) {
      setCurrentWorkspaceState(data);
    }

    return { success: true };
  }, [currentWorkspace]);

  // Deleta workspace
  const deleteWorkspace = useCallback(async (id: string) => {
    const { success, error: deleteError } = await deleteWorkspaceService(id);

    if (!success) {
      return { success: false, error: deleteError || 'Erro ao deletar workspace' };
    }

    // Remove da lista
    const newList = workspaces.filter(w => w.id !== id);
    setWorkspaces(newList);

    // Se era o atual, seleciona outro
    if (currentWorkspace?.id === id && newList.length > 0) {
      setCurrentWorkspace(newList[0]);
    }

    return { success: true };
  }, [workspaces, currentWorkspace, setCurrentWorkspace]);

  // Carrega workspaces quando usuario muda
  useEffect(() => {
    const loadWorkspaces = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await refreshWorkspaces();
      } else {
        setWorkspaces([]);
        setCurrentWorkspaceState(null);
        setIsLoading(false);
      }
    };

    loadWorkspaces();

    // Escuta mudancas de autenticacao
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await refreshWorkspaces();
        } else if (event === 'SIGNED_OUT') {
          setWorkspaces([]);
          setCurrentWorkspaceState(null);
          localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshWorkspaces]);

  // Valor do contexto
  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    isLoading,
    error,
    setCurrentWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Hook para usar o contexto de workspace
 */
export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);

  if (context === undefined) {
    throw new Error('useWorkspace deve ser usado dentro de um WorkspaceProvider');
  }

  return context;
}

/**
 * Hook para obter apenas o workspace atual (sem acoes)
 */
export function useCurrentWorkspace(): Workspace | null {
  const { currentWorkspace } = useWorkspace();
  return currentWorkspace;
}
