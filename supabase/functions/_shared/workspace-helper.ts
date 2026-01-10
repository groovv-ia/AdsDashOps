/**
 * Helper compartilhado para buscar workspace do usuário
 * Suporta tanto owners quanto membros do workspace
 */

export interface WorkspaceData {
  id: string;
  name: string;
}

/**
 * Busca o workspace do usuário autenticado
 * Tenta primeiro como owner direto, depois como membro
 */
export async function getUserWorkspace(
  supabaseAdmin: any,
  userId: string
): Promise<WorkspaceData | null> {
  console.log(`[workspace-helper] Buscando workspace para user_id: ${userId}`);

  // Tenta buscar como owner direto
  const { data: ownedWorkspace } = await supabaseAdmin
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedWorkspace) {
    console.log(`[workspace-helper] ✓ Workspace encontrado como owner: ${ownedWorkspace.id}`);
    return ownedWorkspace;
  }

  console.log(`[workspace-helper] Não é owner, buscando como membro...`);

  // Se não é owner, busca como membro
  const { data: memberWorkspace } = await supabaseAdmin
    .from("workspace_members")
    .select(`
      workspace_id,
      workspaces!inner (
        id,
        name
      )
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberWorkspace && memberWorkspace.workspaces) {
    console.log(`[workspace-helper] ✓ Workspace encontrado como membro: ${memberWorkspace.workspaces.id}`);
    return memberWorkspace.workspaces;
  }

  console.log(`[workspace-helper] ❌ Nenhum workspace encontrado`);
  return null;
}
