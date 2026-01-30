/**
 * Edge Function: google-list-adaccounts
 *
 * Lista todas as contas de anuncio do Google Ads vinculadas ao workspace.
 * Retorna contas do banco de dados e opcionalmente atualiza da API.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para conta de anuncio
interface GoogleAdAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  customer_id: string;
  name: string;
  currency_code: string;
  timezone: string;
  status: string;
  is_manager: boolean;
  is_selected: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
function formatCustomerId(customerId: string): string {
  const clean = customerId.replace(/\D/g, "");
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

// Handler principal
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Aceita GET e POST
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica usuario autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[google-list-adaccounts] User authenticated: ${user.email}`);

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // 1. BUSCAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string | null = null;

    // Tenta buscar como owner
    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      // Busca como membro
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberRecord) {
        workspaceId = memberRecord.workspace_id;
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({
          accounts: [],
          total: 0,
          error: "Workspace not found",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[google-list-adaccounts] Workspace: ${workspaceId}`);

    // =====================================================
    // 2. VERIFICAR CONEXAO GOOGLE
    // =====================================================
    const { data: connection } = await supabaseAdmin
      .from("google_connections")
      .select("id, customer_id, status")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!connection) {
      return new Response(
        JSON.stringify({
          accounts: [],
          total: 0,
          connected: false,
          message: "Google Ads not connected",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 3. BUSCAR CONTAS DO BANCO
    // =====================================================
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("google_ad_accounts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    if (accountsError) {
      console.error(
        "[google-list-adaccounts] Error fetching accounts:",
        accountsError
      );
      return new Response(
        JSON.stringify({
          accounts: [],
          total: 0,
          error: accountsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =====================================================
    // 4. FORMATAR E RETORNAR RESPOSTA
    // =====================================================
    const formattedAccounts = (accounts || []).map((acc: GoogleAdAccount) => ({
      ...acc,
      customer_id_formatted: formatCustomerId(acc.customer_id),
    }));

    const selectedCount = formattedAccounts.filter(
      (acc: any) => acc.is_selected
    ).length;

    console.log(
      `[google-list-adaccounts] Found ${formattedAccounts.length} accounts, ${selectedCount} selected`
    );

    return new Response(
      JSON.stringify({
        accounts: formattedAccounts,
        total: formattedAccounts.length,
        selected_count: selectedCount,
        connected: connection.status === "active",
        connection_customer_id: formatCustomerId(connection.customer_id),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[google-list-adaccounts] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        accounts: [],
        total: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
