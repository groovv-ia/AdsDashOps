/**
 * Edge Function: meta-add-account-manual
 *
 * Permite adicionar uma conta de anuncios Meta manualmente pelo seu ID.
 * Util quando o fluxo FLFB nao retorna as contas automaticamente.
 *
 * Fluxo:
 * 1. Recebe account_id no body (formato "act_XXXXXXXX" ou apenas os numeros)
 * 2. Valida o ID contra a Meta Graph API usando o token salvo do workspace
 * 3. Se valida, salva em meta_ad_accounts e meta_sync_state
 * 4. Retorna os dados da conta salva
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// Mapeia status numerico Meta para texto
function mapAccountStatus(status: number): string {
  const statusMap: Record<number, string> = {
    1: "ACTIVE",
    2: "DISABLED",
    3: "UNSETTLED",
    7: "PENDING_RISK_REVIEW",
    8: "PENDING_SETTLEMENT",
    9: "IN_GRACE_PERIOD",
    100: "PENDING_CLOSURE",
    101: "CLOSED",
  };
  return statusMap[status] || "UNKNOWN";
}

// Normaliza o account_id para o formato act_XXXXXXXX
function normalizeAccountId(accountId: string): string {
  const cleaned = accountId.trim().replace(/^act_/, "");
  // Valida que e apenas numeros
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(`ID de conta invalido: "${accountId}". Use apenas numeros ou o formato act_XXXXXXXX.`);
  }
  return `act_${cleaned}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica autenticacao do usuario
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Le e valida o body
    const body = await req.json();
    const rawAccountId: string = body.account_id || "";

    if (!rawAccountId) {
      return new Response(
        JSON.stringify({ error: "Campo 'account_id' e obrigatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normaliza o ID para act_XXXXXXXX
    let accountId: string;
    try {
      accountId = normalizeAccountId(rawAccountId);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "ID invalido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-add-account-manual] Usuario: ${user.id}, conta: ${accountId}`);

    // Busca o workspace do usuario
    let workspaceId: string | null = null;

    const { data: ownedWs } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (ownedWs && ownedWs.length > 0) {
      workspaceId = ownedWs[0].id;
    } else {
      const { data: memberWs } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (memberWs && memberWs.length > 0) {
        workspaceId = memberWs[0].workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Nenhum workspace encontrado. Conecte o Meta primeiro." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca a conexao Meta ativa do workspace
    const { data: metaConn } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .maybeSingle();

    if (!metaConn) {
      return new Response(
        JSON.stringify({ error: "Nenhuma conexao Meta ativa encontrada para este workspace." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Descriptografa o token
    let accessToken = metaConn.access_token_encrypted;
    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConn.access_token_encrypted });

    if (decryptedToken) {
      accessToken = decryptedToken;
      console.log("[meta-add-account-manual] Token descriptografado");
    } else {
      console.warn("[meta-add-account-manual] Usando token raw");
    }

    // Valida a conta na Meta Graph API
    console.log(`[meta-add-account-manual] Validando conta ${accountId} na Meta API...`);
    const metaResponse = await fetch(
      `${GRAPH_API_BASE}/${accountId}?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`
    );
    const metaData: {
      id?: string;
      name?: string;
      account_status?: number;
      currency?: string;
      timezone_name?: string;
      error?: { message: string; code: number; type?: string };
    } = await metaResponse.json();

    if (metaData.error || !metaData.id) {
      console.warn(`[meta-add-account-manual] Conta nao encontrada:`, metaData.error);
      const errCode = metaData.error?.code;
      let errorMsg = metaData.error?.message || "Conta nao encontrada na Meta API.";

      if (errCode === 100) {
        errorMsg = `Conta ${accountId} nao encontrada. Verifique o ID e tente novamente.`;
      } else if (errCode === 190 || errCode === 102) {
        errorMsg = "Token expirado ou invalido. Reconecte o Meta Ads.";
      } else if (errCode === 200 || errCode === 273) {
        errorMsg = `Sem permissao para acessar a conta ${accountId}. Verifique se esta conta pertence ao seu Business Manager.`;
      }

      return new Response(
        JSON.stringify({ error: errorMsg, meta_error_code: errCode }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-add-account-manual] Conta valida: ${metaData.name} (${metaData.id})`);

    // Verifica se a conta ja existe no workspace
    const { data: existingAccount } = await supabaseAdmin
      .from("meta_ad_accounts")
      .select("id, meta_ad_account_id, name")
      .eq("workspace_id", workspaceId)
      .eq("meta_ad_account_id", metaData.id)
      .maybeSingle();

    if (existingAccount) {
      return new Response(
        JSON.stringify({
          success: true,
          already_exists: true,
          account: {
            id: existingAccount.id,
            meta_ad_account_id: existingAccount.meta_ad_account_id,
            name: existingAccount.name,
          },
          message: `Conta ${metaData.name} ja esta vinculada ao seu workspace.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salva a conta no banco
    const { data: savedAccount, error: saveError } = await supabaseAdmin
      .from("meta_ad_accounts")
      .insert({
        workspace_id: workspaceId,
        meta_ad_account_id: metaData.id,
        name: metaData.name || accountId,
        currency: metaData.currency || "BRL",
        timezone_name: metaData.timezone_name || "America/Sao_Paulo",
        account_status: mapAccountStatus(metaData.account_status ?? 1),
        primary_connection_id: metaConn.id,
        updated_at: new Date().toISOString(),
      })
      .select("id, meta_ad_account_id, name, currency, timezone_name, account_status")
      .single();

    if (saveError) {
      console.error("[meta-add-account-manual] Erro ao salvar conta:", saveError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar conta no banco de dados.", details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cria o registro de sync_state para a nova conta
    await supabaseAdmin
      .from("meta_sync_state")
      .upsert(
        {
          workspace_id: workspaceId,
          meta_ad_account_id: metaData.id,
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,meta_ad_account_id" }
      );

    console.log(`[meta-add-account-manual] Conta ${metaData.id} salva com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        already_exists: false,
        account: savedAccount,
        message: `Conta "${metaData.name}" adicionada com sucesso!`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[meta-add-account-manual] Erro inesperado:", err);
    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
