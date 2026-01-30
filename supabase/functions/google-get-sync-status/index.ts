/**
 * Edge Function: google-get-sync-status
 *
 * Retorna status completo da conexao Google Ads do workspace:
 * - Status da conexao
 * - Lista de contas vinculadas
 * - Historico de jobs de sincronizacao
 * - Totais de dados sincronizados
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

/**
 * Formata Customer ID para exibicao (XXX-XXX-XXXX)
 */
function formatCustomerId(customerId: string): string {
  const clean = customerId.replace(/\D/g, "");
  if (clean.length !== 10) return customerId;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/**
 * Determina o health status baseado nos dados
 */
function calculateHealthStatus(
  connection: any,
  lastSyncJob: any,
  insightsCount: number
): string {
  if (!connection) {
    return "disconnected";
  }

  if (connection.status === "error") {
    return "error";
  }

  if (connection.status !== "active") {
    return "disconnected";
  }

  if (insightsCount === 0) {
    return "pending_first_sync";
  }

  if (lastSyncJob) {
    if (lastSyncJob.status === "failed") {
      return "error";
    }

    // Verifica se a ultima sync foi ha mais de 7 dias
    const lastSyncDate = new Date(
      lastSyncJob.completed_at || lastSyncJob.created_at
    );
    const daysSinceSync = Math.floor(
      (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSync > 7) {
      return "stale";
    }
  }

  return "healthy";
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

    console.log(`[google-get-sync-status] User authenticated: ${user.email}`);

    // Cliente admin para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // =====================================================
    // 1. BUSCAR WORKSPACE DO USUARIO
    // =====================================================
    let workspaceId: string | null = null;
    let workspaceName: string = "Workspace";

    // Tenta buscar como owner
    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
      workspaceName = ownedWorkspace.name || "Workspace";
    } else {
      // Busca como membro
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberRecord) {
        workspaceId = memberRecord.workspace_id;

        // Busca nome do workspace
        const { data: workspace } = await supabaseAdmin
          .from("workspaces")
          .select("name")
          .eq("id", workspaceId)
          .single();

        if (workspace) {
          workspaceName = workspace.name || "Workspace";
        }
      }
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({
          workspace: { id: "", name: "" },
          connection: null,
          health_status: "disconnected",
          ad_accounts: [],
          recent_jobs: [],
          totals: {
            ad_accounts: 0,
            campaigns: 0,
            ad_groups: 0,
            ads: 0,
            keywords: 0,
            total_insights_rows: 0,
            jobs_with_errors: 0,
          },
          error: "Workspace not found",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[google-get-sync-status] Workspace: ${workspaceId}`);

    // =====================================================
    // 2. BUSCAR CONEXAO GOOGLE
    // =====================================================
    const { data: connection } = await supabaseAdmin
      .from("google_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // =====================================================
    // 3. BUSCAR CONTAS
    // =====================================================
    const { data: accounts } = await supabaseAdmin
      .from("google_ad_accounts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    // =====================================================
    // 4. BUSCAR JOBS RECENTES
    // =====================================================
    const { data: recentJobs } = await supabaseAdmin
      .from("google_sync_jobs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    // =====================================================
    // 5. CONTAR TOTAIS
    // =====================================================

    // Total de insights
    const { count: insightsCount } = await supabaseAdmin
      .from("google_insights_daily")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // Total de campanhas
    const { count: campaignsCount } = await supabaseAdmin
      .from("google_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // Total de ad groups
    const { count: adGroupsCount } = await supabaseAdmin
      .from("google_ad_groups")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // Total de ads
    const { count: adsCount } = await supabaseAdmin
      .from("google_ads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // Total de keywords
    const { count: keywordsCount } = await supabaseAdmin
      .from("google_keywords")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // Jobs com erro
    const { count: errorJobsCount } = await supabaseAdmin
      .from("google_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "failed");

    // =====================================================
    // 6. CALCULAR HEALTH STATUS
    // =====================================================
    const lastSyncJob = recentJobs && recentJobs.length > 0 ? recentJobs[0] : null;
    const healthStatus = calculateHealthStatus(
      connection,
      lastSyncJob,
      insightsCount || 0
    );

    // =====================================================
    // 7. FORMATAR E RETORNAR RESPOSTA
    // =====================================================
    const formattedAccounts = (accounts || []).map((acc: any) => ({
      id: acc.id,
      customer_id: acc.customer_id,
      customer_id_formatted: formatCustomerId(acc.customer_id),
      name: acc.name,
      currency_code: acc.currency_code,
      timezone: acc.timezone,
      status: acc.status,
      is_manager: acc.is_manager,
      is_selected: acc.is_selected,
      last_sync_at: acc.last_sync_at,
    }));

    // Verifica se OAuth esta configurado
    const hasOAuth = connection
      ? Boolean(connection.access_token && connection.refresh_token)
      : false;

    // Verifica se token esta expirado
    const tokenExpired = connection?.token_expires_at
      ? new Date(connection.token_expires_at) < new Date()
      : false;

    const response = {
      workspace: {
        id: workspaceId,
        name: workspaceName,
      },
      connection: connection
        ? {
            status: connection.status,
            customer_id: connection.customer_id,
            customer_id_formatted: formatCustomerId(connection.customer_id),
            login_customer_id: connection.login_customer_id
              ? formatCustomerId(connection.login_customer_id)
              : null,
            last_validated_at: connection.last_validated_at,
            error_message: connection.error_message,
            has_oauth: hasOAuth,
            oauth_email: connection.oauth_email || null,
            token_expired: tokenExpired,
          }
        : null,
      health_status: healthStatus,
      ad_accounts: formattedAccounts,
      recent_jobs: recentJobs || [],
      totals: {
        ad_accounts: accounts?.length || 0,
        campaigns: campaignsCount || 0,
        ad_groups: adGroupsCount || 0,
        ads: adsCount || 0,
        keywords: keywordsCount || 0,
        total_insights_rows: insightsCount || 0,
        jobs_with_errors: errorJobsCount || 0,
      },
    };

    console.log(
      `[google-get-sync-status] Response: ${formattedAccounts.length} accounts, health: ${healthStatus}`
    );

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[google-get-sync-status] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        workspace: { id: "", name: "" },
        connection: null,
        health_status: "error",
        ad_accounts: [],
        recent_jobs: [],
        totals: {
          ad_accounts: 0,
          campaigns: 0,
          ad_groups: 0,
          ads: 0,
          keywords: 0,
          total_insights_rows: 0,
          jobs_with_errors: 0,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
