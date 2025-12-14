/**
 * WorkspaceContext
 *
 * Contexto global para gerenciamento do workspace ativo.
 * Fornece o workspace atual e funcoes para trocar entre workspaces.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
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
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref para controlar se ja carregou inicialmente
  const hasLoadedRef = useRef(false);

  // Carrega workspaces do usuario
  const loadWorkspaces = useCallback(async (forceReload = false) => {
    // Evita recarregar se ja carregou e nao e forcado
    if (hasLoadedRef.current && !forceReload) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: listError } = await listUserWorkspaces();

      if (listError) {
        setError(listError);
        setWorkspaces([]);
        setIsLoading(false);
        return;
      }

      setWorkspaces(data);
      hasLoadedRef.current = true;

      // Se nao tem workspaces, apenas finaliza
      if (data.length === 0) {
        setIsLoading(false);
        return;
      }

      // Tenta recuperar workspace salvo no localStorage
      const savedWorkspaceId = localStorage.getItem(WORKSPACE_STORAGE_KEY);

      if (savedWorkspaceId) {
        const saved = data.find(w => w.id === savedWorkspaceId);
        if (saved) {
          setCurrentWorkspaceState(saved);
          setIsLoading(false);
          return;
        }
      }

      // Usa o primeiro workspace da lista
      setCurrentWorkspaceState(data[0]);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, data[0].id);
    } catch (err) {
      setError('Erro ao carregar workspaces');
      console.error('Erro ao carregar workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Define workspace atual
  const setCurrentWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
  }, []);

  // Refresh manual
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces(true);
  }, [loadWorkspaces]);

  // Cria novo workspace
  const createWorkspace = useCallback(async (input: CreateWorkspaceInput) => {
    const { data, error: createError } = await createWorkspaceService(input);

    if (createError || !data) {
      return { success: false, error: createError || 'Erro ao criar workspace' };
    }

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

    setWorkspaces(prev => prev.map(w => w.id === id ? data : w));

    setCurrentWorkspaceState(prev => {
      if (prev?.id === id) {
        return data;
      }
      return prev;
    });

    return { success: true };
  }, []);

  // Deleta workspace
  const deleteWorkspace = useCallback(async (id: string) => {
    const { success, error: deleteError } = await deleteWorkspaceService(id);

    if (!success) {
      return { success: false, error: deleteError || 'Erro ao deletar workspace' };
    }

    setWorkspaces(prev => {
      const newList = prev.filter(w => w.id !== id);

      // Se era o atual, seleciona outro
      setCurrentWorkspaceState(current => {
        if (current?.id === id && newList.length > 0) {
          localStorage.setItem(WORKSPACE_STORAGE_KEY, newList[0].id);
          return newList[0];
        }
        return current;
      });

      return newList;
    });

    return { success: true };
  }, []);

  // Carrega workspaces na montagem e escuta autenticacao
  useEffect(() => {
    let mounted = true;

    const initWorkspaces = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        await loadWorkspaces();
      } else {
        setWorkspaces([]);
        setCurrentWorkspaceState(null);
        setIsLoading(false);
        hasLoadedRef.current = false;
      }
    };

    initWorkspaces();

    // Escuta mudancas de autenticacao
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Usa setTimeout para evitar deadlock do onAuthStateChange
        setTimeout(async () => {
          if (event === 'SIGNED_IN' && session?.user) {
            hasLoadedRef.current = false;
            await loadWorkspaces();
          } else if (event === 'SIGNED_OUT') {
            setWorkspaces([]);
            setCurrentWorkspaceState(null);
            localStorage.removeItem(WORKSPACE_STORAGE_KEY);
            hasLoadedRef.current = false;
          }
        }, 0);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadWorkspaces]);

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
