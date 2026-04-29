/**
 * Helper compartilhado para buscar workspace do usuario
 * Suporta tanto owners quanto membros do workspace
 *
 * IMPORTANTE: Usa .order().limit(1) ao inves de .maybeSingle() para
 * funcionar corretamente quando o usuario possui multiplos workspaces.
 */

export interface WorkspaceData {
  id: string;
  name: string;
}

/**
 * Busca o workspace do usuario autenticado
 * Tenta primeiro como owner direto, depois como membro
 * Sempre retorna o workspace mais antigo (primeiro criado) em caso de multiplos
 */
export async function getUserWorkspace(
  supabaseAdmin: any,
  userId: string
): Promise<WorkspaceData | null> {
  console.log(`[workspace-helper] Buscando workspace para user_id: ${userId}`);

  // Tenta buscar como owner direto (pega o mais antigo se houver multiplos)
  const { data: ownedWorkspaces } = await supabaseAdmin
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (ownedWorkspaces && ownedWorkspaces.length > 0) {
    console.log(`[workspace-helper] Workspace encontrado como owner: ${ownedWorkspaces[0].id}`);
    return ownedWorkspaces[0];
  }

  console.log(`[workspace-helper] Nao e owner, buscando como membro...`);

  // Se nao e owner, busca como membro (pega o mais antigo)
  const { data: memberRecords } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (memberRecords && memberRecords.length > 0 && memberRecords[0].workspaces) {
    console.log(`[workspace-helper] Workspace encontrado como membro: ${memberRecords[0].workspaces.id}`);
    return memberRecords[0].workspaces;
  }

  console.log(`[workspace-helper] Nenhum workspace encontrado`);
  return null;
}
