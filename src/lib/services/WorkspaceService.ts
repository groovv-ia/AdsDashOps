/**
 * WorkspaceService
 *
 * Servico para gerenciamento de workspaces do usuario.
 * Permite criar, listar, atualizar e deletar workspaces,
 * alem de gerenciar membros.
 */

import { supabase } from '../supabase';

// Tipos para workspaces
export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
  member_count: number;
}

export interface CreateWorkspaceInput {
  name: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
}

export interface InviteMemberInput {
  email: string;
  role: 'admin' | 'member';
}

/**
 * Lista todos os workspaces do usuario atual
 */
export async function listUserWorkspaces(): Promise<{
  data: Workspace[];
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Usuario nao autenticado' };
  }

  // Busca workspaces onde o usuario e owner ou membro
  const { data: owned, error: ownedError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (ownedError) {
    return { data: [], error: ownedError.message };
  }

  // Busca workspaces onde e membro (mas nao owner)
  const { data: memberOf, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id);

  if (memberError) {
    return { data: owned || [], error: undefined };
  }

  // IDs de workspaces que ja temos
  const ownedIds = (owned || []).map(w => w.id);

  // Busca workspaces adicionais onde e membro
  const additionalIds = (memberOf || [])
    .map(m => m.workspace_id)
    .filter(id => !ownedIds.includes(id));

  if (additionalIds.length > 0) {
    const { data: additional } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', additionalIds)
      .order('created_at', { ascending: true });

    return {
      data: [...(owned || []), ...(additional || [])],
      error: undefined
    };
  }

  return { data: owned || [], error: undefined };
}

/**
 * Obtem detalhes de um workspace especifico com seus membros
 */
export async function getWorkspaceDetails(workspaceId: string): Promise<{
  data: WorkspaceWithMembers | null;
  error?: string;
}> {
  // Busca o workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) {
    return { data: null, error: wsError.message };
  }

  if (!workspace) {
    return { data: null, error: 'Workspace nao encontrado' };
  }

  // Busca membros do workspace
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('role', { ascending: true });

  if (membersError) {
    return {
      data: { ...workspace, members: [], member_count: 0 },
      error: undefined
    };
  }

  // Busca informacoes dos usuarios membros
  const memberUserIds = (members || []).map(m => m.user_id);

  let memberDetails: WorkspaceMember[] = [];

  if (memberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', memberUserIds);

    memberDetails = (members || []).map(member => {
      const profile = profiles?.find(p => p.id === member.user_id);
      return {
        ...member,
        user_email: profile?.email,
        user_name: profile?.full_name,
      };
    });
  }

  return {
    data: {
      ...workspace,
      members: memberDetails,
      member_count: memberDetails.length
    },
    error: undefined
  };
}

/**
 * Cria um novo workspace
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<{
  data: Workspace | null;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Usuario nao autenticado' };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { data: null, error: 'Nome do workspace e obrigatorio' };
  }

  // Cria o workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      name: input.name.trim(),
      owner_id: user.id,
    })
    .select()
    .single();

  if (wsError) {
    return { data: null, error: wsError.message };
  }

  // Adiciona o usuario como owner do workspace
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    });

  if (memberError) {
    console.warn('Falha ao adicionar membro owner:', memberError.message);
  }

  return { data: workspace, error: undefined };
}

/**
 * Atualiza um workspace existente
 */
export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput
): Promise<{
  data: Workspace | null;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Usuario nao autenticado' };
  }

  // Verifica se e owner do workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { data: null, error: 'Sem permissao para editar este workspace' };
  }

  // Atualiza o workspace
  const { data: updated, error: updateError } = await supabase
    .from('workspaces')
    .update({
      name: input.name?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId)
    .select()
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  return { data: updated, error: undefined };
}

/**
 * Deleta um workspace (apenas owner)
 */
export async function deleteWorkspace(workspaceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario nao autenticado' };
  }

  // Verifica se e owner do workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { success: false, error: 'Sem permissao para deletar este workspace' };
  }

  // Verifica se e o unico workspace do usuario
  const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id);

  if ((allWorkspaces?.length || 0) <= 1) {
    return { success: false, error: 'Voce deve ter pelo menos um workspace' };
  }

  // Deleta o workspace (cascade deletara membros automaticamente)
  const { error: deleteError } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}

/**
 * Obtem o workspace padrao do usuario
 */
export async function getDefaultWorkspace(): Promise<{
  data: Workspace | null;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Usuario nao autenticado' };
  }

  // Busca primeiro workspace onde e owner
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (workspace) {
    return { data: workspace, error: undefined };
  }

  // Se nao encontrou como owner, busca como membro
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { data: null, error: 'Nenhum workspace encontrado' };
  }

  const { data: memberWorkspace, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', membership.workspace_id)
    .maybeSingle();

  if (wsError) {
    return { data: null, error: wsError.message };
  }

  return { data: memberWorkspace, error: undefined };
}

/**
 * Adiciona um membro ao workspace por email
 */
export async function addWorkspaceMember(
  workspaceId: string,
  input: InviteMemberInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario nao autenticado' };
  }

  // Verifica se tem permissao (owner ou admin)
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Sem permissao para adicionar membros' };
  }

  // Busca usuario pelo email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', input.email.toLowerCase())
    .maybeSingle();

  if (!profile) {
    return { success: false, error: 'Usuario nao encontrado com este email' };
  }

  // Verifica se ja e membro
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Usuario ja e membro deste workspace' };
  }

  // Adiciona como membro
  const { error: insertError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: profile.id,
      role: input.role,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

/**
 * Remove um membro do workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  memberId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario nao autenticado' };
  }

  // Busca informacoes do membro a ser removido
  const { data: targetMember } = await supabase
    .from('workspace_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!targetMember) {
    return { success: false, error: 'Membro nao encontrado' };
  }

  // Nao pode remover owner
  if (targetMember.role === 'owner') {
    return { success: false, error: 'Nao e possivel remover o owner do workspace' };
  }

  // Verifica se tem permissao (owner ou admin)
  const { data: myMembership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
    return { success: false, error: 'Sem permissao para remover membros' };
  }

  // Remove o membro
  const { error: deleteError } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}

/**
 * Atualiza role de um membro
 */
export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  newRole: 'admin' | 'member'
): Promise<{
  success: boolean;
  error?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Usuario nao autenticado' };
  }

  // Verifica se e owner do workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (!workspace || workspace.owner_id !== user.id) {
    return { success: false, error: 'Apenas o owner pode alterar roles' };
  }

  // Busca o membro
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!member) {
    return { success: false, error: 'Membro nao encontrado' };
  }

  // Nao pode alterar role do owner
  if (member.role === 'owner') {
    return { success: false, error: 'Nao e possivel alterar role do owner' };
  }

  // Atualiza o role
  const { error: updateError } = await supabase
    .from('workspace_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
