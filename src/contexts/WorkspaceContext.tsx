import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/utils/logger';

/**
 * Interface do Workspace (Agência)
 */
export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface do Context
 */
interface WorkspaceContextType {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  refreshWorkspace: () => Promise<void>;
  updateWorkspace: (data: Partial<Workspace>) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/**
 * Provider do Workspace
 *
 * Gerencia o workspace (agência) do usuário.
 * Cada usuário tem um único workspace criado automaticamente no primeiro login.
 */
export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref para prevenir múltiplas chamadas simultâneas
  const isLoadingRef = useRef(false);

  /**
   * Busca ou cria workspace para o usuário autenticado
   */
  const loadWorkspace = async () => {
    // Previne múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      logger.info('loadWorkspace já está em execução, ignorando chamada');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        logger.info('Usuário não autenticado, aguardando login');
        setWorkspace(null);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      logger.info('Buscando workspace do usuário', { userId: user.id });

      // Busca workspace existente
      const { data: existingWorkspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (fetchError) {
        logger.error('Erro ao buscar workspace', { error: fetchError, userId: user.id });
        throw new Error(`Erro ao buscar workspace: ${fetchError.message || JSON.stringify(fetchError)}`);
      }

      if (existingWorkspace) {
        logger.info('Workspace encontrado', { workspaceId: existingWorkspace.id });
        setWorkspace(existingWorkspace);
      } else {
        // Cria workspace automaticamente no primeiro login
        logger.info('Criando workspace para novo usuário');

        const workspaceName = user.user_metadata?.full_name
          ? `${user.user_metadata.full_name}'s Agency`
          : user.email?.split('@')[0] + "'s Agency" || 'My Agency';

        const { data: newWorkspace, error: createError } = await supabase
          .from('workspaces')
          .insert({
            name: workspaceName,
            owner_id: user.id,
          })
          .select()
          .single();

        if (createError) {
          logger.error('Erro ao criar workspace', { error: createError, userId: user.id });
          throw new Error(`Erro ao criar workspace: ${createError.message || JSON.stringify(createError)}`);
        }

        logger.info('Workspace criado com sucesso', { workspaceId: newWorkspace.id });
        setWorkspace(newWorkspace);
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Erro desconhecido ao carregar workspace';
      logger.error('Erro ao carregar workspace', {
        error: err,
        message: errorMessage,
        stack: err?.stack
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  /**
   * Atualiza dados do workspace
   */
  const updateWorkspace = async (data: Partial<Workspace>) => {
    if (!workspace) {
      throw new Error('Nenhum workspace carregado');
    }

    try {
      logger.info('Atualizando workspace', { workspaceId: workspace.id, data });

      const { data: updated, error: updateError } = await supabase
        .from('workspaces')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspace.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      logger.info('Workspace atualizado com sucesso');
      setWorkspace(updated);
    } catch (err: any) {
      logger.error('Erro ao atualizar workspace', err);
      throw err;
    }
  };

  /**
   * Recarrega workspace
   */
  const refreshWorkspace = async () => {
    await loadWorkspace();
  };

  // Carrega workspace ao montar e monitora mudanças de autenticação
  useEffect(() => {
    loadWorkspace();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadWorkspace();
      } else if (event === 'SIGNED_OUT') {
        setWorkspace(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        loading,
        error,
        refreshWorkspace,
        updateWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook para acessar o workspace
 */
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);

  if (context === undefined) {
    throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  }

  return context;
};
