/**
 * Edge Function: meta-list-adaccounts
 * 
 * Lista todas as Ad Accounts acessíveis pelo System User e salva no banco.
 * 
 * CORREÇÃO: O onConflict agora usa a constraint composta correta
 * (workspace_id, meta_ad_account_id) ao invés de só meta_ad_account_id.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  amount_spent: string;
}

interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
  paging?: {
    cursors: { after: string };
    next: string;
  };
  error?: {
    message: string;
    code: number;
  };
}

// Mapeia status numérico do Meta para texto
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
    201: "ANY_ACTIVE",
    202: "ANY_CLOSED",
  };
  return statusMap[status] || "UNKNOWN";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica usuário autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("[meta-list-adaccounts] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-list-adaccounts] User authenticated: ${user.id}`);

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // BUSCA O WORKSPACE DO USUÁRIO (OWNER OU MEMBRO)
    // =====================================================
    let workspaceId: string | null = null;

    // 1. Tenta buscar como owner direto
    const { data: ownedWorkspace, error: ownerError } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownerError) {
      console.error("[meta-list-adaccounts] Error finding owned workspace:", ownerError);
    }

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
      console.log(`[meta-list-adaccounts] Found workspace as owner: ${workspaceId}`);
    } else {
      // 2. Se não é owner, busca como membro
      console.log("[meta-list-adaccounts] User is not owner, checking membership...");
      
      const { data: memberRecord, error: memberError } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("[meta-list-adaccounts] Error finding member workspace:", memberError);
      }

      if (memberRecord) {
        workspaceId = memberRecord.workspace_id;
        console.log(`[meta-list-adaccounts] Found workspace as member: ${workspaceId}`);
      }
    }

    if (!workspaceId) {
      console.error("[meta-list-adaccounts] No workspace found for user");
      return new Response(
        JSON.stringify({ error: "No workspace found. Please connect Meta first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // BUSCA A CONEXÃO META DO WORKSPACE
    // =====================================================
    const { data: metaConnection, error: connError } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status, business_manager_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .maybeSingle();

    if (connError) {
      console.error("[meta-list-adaccounts] Error finding connection:", connError);
    }

    if (!metaConnection) {
      console.log("[meta-list-adaccounts] No valid Meta connection found");
      return new Response(
        JSON.stringify({ error: "No valid Meta connection found", adaccounts: [], total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[meta-list-adaccounts] Found connection: ${metaConnection.id}, BM: ${metaConnection.business_manager_id}`);

    // =====================================================
    // DESCRIPTOGRAFA O TOKEN
    // =====================================================
    let accessToken = metaConnection.access_token_encrypted;

    // Tenta descriptografar (pode não estar criptografado)
    const { data: decryptedToken, error: decryptError } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    if (!decryptError && decryptedToken) {
      accessToken = decryptedToken;
      console.log("[meta-list-adaccounts] Token decrypted successfully");
    } else {
      console.warn("[meta-list-adaccounts] Using raw token (not encrypted or decrypt failed)");
    }

    // =====================================================
    // BUSCA AD ACCOUNTS DA META API COM PAGINAÇÃO
    // =====================================================
    const allAdAccounts: MetaAdAccount[] = [];
    let nextUrl: string | null = 
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent&limit=100&access_token=${accessToken}`;

    let pageCount = 0;
    const maxPages = 50; // Limite de segurança

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      console.log(`[meta-list-adaccounts] Fetching page ${pageCount}...`);

      const response = await fetch(nextUrl);
      const data: MetaAdAccountsResponse = await response.json();

      if (data.error) {
        console.error("[meta-list-adaccounts] Meta API error:", data.error);
        return new Response(
          JSON.stringify({ error: "Meta API error", details: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data.data && data.data.length > 0) {
        allAdAccounts.push(...data.data);
        console.log(`[meta-list-adaccounts] Page ${pageCount}: ${data.data.length} accounts (total: ${allAdAccounts.length})`);
      }

      nextUrl = data.paging?.next || null;
    }

    console.log(`[meta-list-adaccounts] Total accounts fetched from Meta: ${allAdAccounts.length}`);

    // =====================================================
    // SALVA AS CONTAS NO BANCO DE DADOS
    // IMPORTANTE: Usa a constraint composta correta!
    // =====================================================
    if (allAdAccounts.length > 0) {
      // Prepara os dados para upsert
      const adAccountsToUpsert = allAdAccounts.map((acc) => ({
        workspace_id: workspaceId,
        meta_ad_account_id: acc.id,
        name: acc.name,
        currency: acc.currency || "USD",
        timezone_name: acc.timezone_name || "UTC",
        account_status: mapAccountStatus(acc.account_status),
        primary_connection_id: metaConnection.id,
        updated_at: new Date().toISOString(),
      }));

      // Divide em batches de 100 para evitar timeout
      const batchSize = 100;
      let savedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < adAccountsToUpsert.length; i += batchSize) {
        const batch = adAccountsToUpsert.slice(i, i + batchSize);
        
        // CORREÇÃO CRÍTICA: onConflict deve usar a constraint composta
        const { error: upsertError } = await supabaseAdmin
          .from("meta_ad_accounts")
          .upsert(batch, {
            onConflict: "workspace_id,meta_ad_account_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`[meta-list-adaccounts] Upsert error batch ${Math.floor(i/batchSize) + 1}:`, upsertError);
          errorCount += batch.length;
        } else {
          savedCount += batch.length;
          console.log(`[meta-list-adaccounts] Batch ${Math.floor(i/batchSize) + 1} saved: ${batch.length} accounts`);
        }
      }

      console.log(`[meta-list-adaccounts] TOTAL SAVED: ${savedCount} accounts, ERRORS: ${errorCount}`);
    }

    // =====================================================
    // RETORNA AS CONTAS PARA O FRONTEND
    // =====================================================
    const formattedAccounts = allAdAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      timezone: acc.timezone_name,
      status: mapAccountStatus(acc.account_status),
      amount_spent: acc.amount_spent,
    }));

    return new Response(
      JSON.stringify({
        adaccounts: formattedAccounts,
        total: formattedAccounts.length,
        workspace_id: workspaceId,
        saved_to_db: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[meta-list-adaccounts] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
