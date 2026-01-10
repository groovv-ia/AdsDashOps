/**
 * SetupService
 *
 * Centraliza toda a lógica de configuração inicial do usuário.
 * Gerencia o progresso do setup e automatiza a criação de workspaces e clientes.
 */

import { supabase } from '../supabase';

// Tipos para o progresso do setup
export type SetupStep = 'connection' | 'clients' | 'bindings' | 'sync';

export interface SetupProgress {
  id: string;
  userId: string;
  workspaceId: string | null;
  stepsCompleted: SetupStep[];
  setupCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetupStatus {
  needsSetup: boolean;
  hasWorkspace: boolean;
  hasConnection: boolean;
  hasAccounts: boolean;
  hasClients: boolean;
  hasBindings: boolean;
  currentStep: SetupStep | 'complete' | null;
  progress: number; // 0-100
}

/**
 * Verifica se o usuário precisa completar o setup inicial
 */
export async function checkIfNeedsSetup(userId: string): Promise<boolean> {
  try {
    // Verifica se já tem registro de setup completo
    const { data: setupData, error: setupError } = await supabase
      .from('setup_progress')
      .select('setup_completed')
      .eq('user_id', userId)
      .maybeSingle();

    if (setupError) throw setupError;

    // Se já completou o setup, não precisa mais
    if (setupData?.setup_completed) {
      return false;
    }

    // Verifica se tem workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (workspaceError) throw workspaceError;

    // Se não tem workspace, precisa de setup
    if (!workspaceData) {
      return true;
    }

    // Verifica se tem conexões Meta
    const { data: connectionData, error: connectionError } = await supabase
      .from('meta_connections')
      .select('id')
      .eq('workspace_id', workspaceData.workspace_id)
      .limit(1)
      .maybeSingle();

    if (connectionError) throw connectionError;

    // Se não tem conexão Meta, precisa de setup
    return !connectionData;
  } catch (error) {
    console.error('Error checking if needs setup:', error);
    return true; // Em caso de erro, assume que precisa de setup
  }
}

/**
 * Obtém o status detalhado do progresso de setup
 */
export async function getSetupProgress(userId: string): Promise<SetupStatus> {
  try {
    // Inicializa status padrão
    const status: SetupStatus = {
      needsSetup: true,
      hasWorkspace: false,
      hasConnection: false,
      hasAccounts: false,
      hasClients: false,
      hasBindings: false,
      currentStep: null,
      progress: 0,
    };

    // Busca workspace do usuário
    const { data: workspaceData } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (!workspaceData?.workspace_id) {
      status.currentStep = 'connection';
      return status;
    }

    status.hasWorkspace = true;
    status.progress = 20;
    const workspaceId = workspaceData.workspace_id;

    // Busca conexão Meta
    const { data: connectionData } = await supabase
      .from('meta_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();

    if (!connectionData) {
      status.currentStep = 'connection';
      return status;
    }

    status.hasConnection = true;
    status.progress = 40;

    // Busca contas Meta vinculadas
    const { data: accountsData } = await supabase
      .from('client_meta_ad_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    status.hasAccounts = accountsData && accountsData.length > 0;

    // Busca clientes
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1);

    status.hasClients = clientsData && clientsData.length > 0;

    if (!status.hasClients) {
      status.currentStep = 'clients';
      status.progress = 50;
      return status;
    }

    status.progress = 70;

    // Busca vínculos (bindings)
    if (!status.hasAccounts) {
      status.currentStep = 'bindings';
      status.progress = 75;
      return status;
    }

    status.hasBindings = true;
    status.progress = 90;

    // Verifica se tem dados sincronizados
    const { data: metricsData } = await supabase
      .from('meta_insights_daily')
      .select('id')
      .eq('workspace_id', workspaceId)
      .limit(1)
      .maybeSingle();

    if (!metricsData) {
      status.currentStep = 'sync';
      status.progress = 95;
      return status;
    }

    // Setup completo!
    status.needsSetup = false;
    status.currentStep = 'complete';
    status.progress = 100;

    // Atualiza o registro de setup_progress
    await markSetupAsComplete(userId, workspaceId);

    return status;
  } catch (error) {
    console.error('Error getting setup progress:', error);
    return {
      needsSetup: true,
      hasWorkspace: false,
      hasConnection: false,
      hasAccounts: false,
      hasClients: false,
      hasBindings: false,
      currentStep: null,
      progress: 0,
    };
  }
}

/**
 * Completa um passo do setup
 */
export async function completeSetupStep(
  userId: string,
  workspaceId: string,
  step: SetupStep
): Promise<void> {
  try {
    // Busca registro existente
    const { data: existing } = await supabase
      .from('setup_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing) {
      // Atualiza registro existente
      const stepsCompleted = existing.steps_completed || [];
      if (!stepsCompleted.includes(step)) {
        stepsCompleted.push(step);
      }

      await supabase
        .from('setup_progress')
        .update({
          steps_completed: stepsCompleted,
        })
        .eq('id', existing.id);
    } else {
      // Cria novo registro
      await supabase.from('setup_progress').insert({
        user_id: userId,
        workspace_id: workspaceId,
        steps_completed: [step],
      });
    }
  } catch (error) {
    console.error('Error completing setup step:', error);
  }
}

/**
 * Marca o setup como totalmente completo
 */
export async function markSetupAsComplete(
  userId: string,
  workspaceId: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('setup_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('setup_progress')
        .update({
          setup_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('setup_progress').insert({
        user_id: userId,
        workspace_id: workspaceId,
        steps_completed: ['connection', 'clients', 'bindings', 'sync'],
        setup_completed: true,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error marking setup as complete:', error);
  }
}

/**
 * Cria um workspace padrão para o usuário se ele não tiver um
 */
export async function createWorkspaceForUser(
  userId: string,
  userEmail: string
): Promise<string | null> {
  try {
    // Verifica se já tem workspace
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (existingMember) {
      return existingMember.workspace_id;
    }

    // Cria novo workspace
    const workspaceName = `${userEmail.split('@')[0]}'s Workspace`;

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        owner_id: userId,
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    // Adiciona usuário como membro do workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) throw memberError;

    return workspace.id;
  } catch (error) {
    console.error('Error creating workspace for user:', error);
    return null;
  }
}

/**
 * Configuração automática completa para novo usuário
 */
export async function autoConfigureForNewUser(
  userId: string,
  userEmail: string,
  metaAccounts: Array<{ id: string; name: string }>
): Promise<{ success: boolean; workspaceId: string | null; error?: string }> {
  try {
    // 1. Cria ou obtém workspace
    const workspaceId = await createWorkspaceForUser(userId, userEmail);
    if (!workspaceId) {
      return {
        success: false,
        workspaceId: null,
        error: 'Failed to create workspace',
      };
    }

    // 2. Marca step de connection como completo
    await completeSetupStep(userId, workspaceId, 'connection');

    return {
      success: true,
      workspaceId,
    };
  } catch (error) {
    console.error('Error in auto-configure:', error);
    return {
      success: false,
      workspaceId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retorna o próximo passo pendente do setup
 */
export async function resumeSetup(userId: string): Promise<SetupStep | 'complete' | null> {
  const status = await getSetupProgress(userId);
  return status.currentStep;
}
