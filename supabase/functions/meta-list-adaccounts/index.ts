/**
 * Edge Function: meta-list-adaccounts
 * 
 * Lista todas as Ad Accounts acessíveis pelo System User e salva no cache.
 * 
 * GET /functions/v1/meta-list-adaccounts
 * 
 * Retorna: { adaccounts: Array<{ id, name, currency, timezone, status }> }
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Busca o workspace do usuário
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found. Please connect Meta first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca a conexão Meta do workspace
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!metaConnection || metaConnection.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "No valid Meta connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Descriptografa o token
    const { data: decryptedToken, error: decryptError } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    if (decryptError || !decryptedToken) {
      // Fallback: tenta usar o token como está (caso não esteja criptografado)
      console.warn("Decrypt failed, trying raw token");
    }

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    // Busca ad accounts do Meta com paginação
    const allAdAccounts: MetaAdAccount[] = [];
    let nextUrl: string | null = 
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent&limit=100&access_token=${accessToken}`;

    while (nextUrl) {
      const response = await fetch(nextUrl);
      const data: MetaAdAccountsResponse = await response.json();

      if (data.error) {
        return new Response(
          JSON.stringify({ error: "Meta API error", details: data.error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (data.data) {
        allAdAccounts.push(...data.data);
      }

      nextUrl = data.paging?.next || null;
    }

    // Upsert nas tabelas meta_ad_accounts
    const adAccountsToUpsert = allAdAccounts.map((acc) => ({
      workspace_id: workspace.id,
      meta_ad_account_id: acc.id,
      name: acc.name,
      currency: acc.currency || "USD",
      timezone: acc.timezone_name || "UTC",
      account_status: mapAccountStatus(acc.account_status),
      updated_at: new Date().toISOString(),
    }));

    if (adAccountsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("meta_ad_accounts")
        .upsert(adAccountsToUpsert, {
          onConflict: "meta_ad_account_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }
    }

    // Formata resposta para o frontend
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
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
