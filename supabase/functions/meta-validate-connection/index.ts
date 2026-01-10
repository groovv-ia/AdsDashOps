/**
 * Edge Function: meta-validate-connection
 * 
 * Valida um token de System User do Meta e salva a conexão no banco.
 * 
 * POST /functions/v1/meta-validate-connection
 * Body: { business_manager_id: string, system_user_token: string }
 * 
 * Retorna: { status: string, adaccounts_count: number, scopes: string[] }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para payload da requisição
interface ValidateConnectionPayload {
  business_manager_id: string;
  system_user_token: string;
}

// Interface para resposta do Meta /me
interface MetaMeResponse {
  id: string;
  name?: string;
  error?: {
    message: string;
    code: number;
  };
}

// Interface para resposta de permissões
interface MetaPermissionsResponse {
  data: Array<{ permission: string; status: string }>;
  error?: {
    message: string;
    code: number;
  };
}

// Interface para resposta de ad accounts
interface MetaAdAccountsResponse {
  data: Array<{
    id: string;
    name: string;
    account_status: number;
    currency: string;
    timezone_name: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

Deno.serve(async (req: Request) => {
  // Trata requisições OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Apenas aceita POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extrai o token JWT do header Authorization
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

    // Cria cliente Supabase com service role para operações privilegiadas
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente com anon key para verificar o usuário
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verifica o usuário autenticado
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cliente com service role para operações no banco
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const body: ValidateConnectionPayload = await req.json();
    const { business_manager_id, system_user_token } = body;

    if (!business_manager_id || !system_user_token) {
      return new Response(
        JSON.stringify({ error: "Missing business_manager_id or system_user_token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Validar o token com a API do Meta (/me)
    const meResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${system_user_token}`
    );
    const meData: MetaMeResponse = await meResponse.json();

    if (meData.error) {
      return new Response(
        JSON.stringify({
          error: "Invalid Meta token",
          details: meData.error.message,
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Verificar permissões do token
    const permissionsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/permissions?access_token=${system_user_token}`
    );
    const permissionsData: MetaPermissionsResponse = await permissionsResponse.json();

    const grantedScopes: string[] = [];
    if (permissionsData.data) {
      for (const perm of permissionsData.data) {
        if (perm.status === "granted") {
          grantedScopes.push(perm.permission);
        }
      }
    }

    // Verificar permissões mínimas necessárias
    const requiredScopes = ["ads_read", "business_management"];
    const missingScopes = requiredScopes.filter((s) => !grantedScopes.includes(s));

    if (missingScopes.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required permissions",
          missing_scopes: missingScopes,
          granted_scopes: grantedScopes,
          status: "invalid",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Buscar ad accounts acessíveis
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${system_user_token}`
    );
    const adAccountsData: MetaAdAccountsResponse = await adAccountsResponse.json();

    const adAccountsCount = adAccountsData.data?.length || 0;

    // 4. Buscar ou criar workspace do usuário
    let workspaceId: string;

    const { data: existingWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existingWorkspace) {
      workspaceId = existingWorkspace.id;
    } else {
      // Cria novo workspace
      const { data: newWorkspace, error: createError } = await supabaseAdmin
        .from("workspaces")
        .insert({
          name: `Workspace de ${user.email}`,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (createError || !newWorkspace) {
        return new Response(
          JSON.stringify({ error: "Failed to create workspace", details: createError?.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      workspaceId = newWorkspace.id;

      // Adiciona o owner como membro
      await supabaseAdmin.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "owner",
      });
    }

    // 5. Criptografar o token usando a função do banco (se existir)
    let encryptedToken = system_user_token;
    try {
      const { data: encryptedData, error: encryptError } = await supabaseAdmin
        .rpc("encrypt_token", { p_token: system_user_token });

      if (!encryptError && encryptedData) {
        encryptedToken = encryptedData;
      }
    } catch (e) {
      // Função de criptografia não existe, usa token como está
      console.log("Encryption function not available, storing token as-is");
    }

    // 6. Verificar se já existe conexão para este workspace
    const { data: existingConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Nome da conexão baseado no usuário Meta
    const connectionName = meData.name || `Meta Connection - ${business_manager_id}`;

    let upsertError;

    if (existingConnection) {
      // Atualiza conexão existente
      const { error } = await supabaseAdmin
        .from("meta_connections")
        .update({
          business_manager_id: business_manager_id,
          access_token_encrypted: encryptedToken,
          granted_scopes: grantedScopes,
          status: "connected",
          name: connectionName,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id);
      
      upsertError = error;
    } else {
      // Insere nova conexão com todos os campos obrigatórios
      const { error } = await supabaseAdmin
        .from("meta_connections")
        .insert({
          workspace_id: workspaceId,
          business_manager_id: business_manager_id,
          access_token_encrypted: encryptedToken,
          granted_scopes: grantedScopes,
          status: "connected",
          name: connectionName,
          is_default: true,
          last_validated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      upsertError = error;
    }

    if (upsertError) {
      console.error("Save connection error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection", details: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Persistir ad accounts descobertas na tabela meta_ad_accounts
    // Mapeia status numérico do Meta para texto
    const mapAccountStatus = (status: number): string => {
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
    };

    if (adAccountsData.data && adAccountsData.data.length > 0) {
      const adAccountsToUpsert = adAccountsData.data.map((acc) => ({
        workspace_id: workspaceId,
        meta_ad_account_id: acc.id,
        name: acc.name,
        currency: acc.currency || "USD",
        timezone_name: acc.timezone_name || "UTC",
        account_status: mapAccountStatus(acc.account_status),
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertAdAccountsError } = await supabaseAdmin
        .from("meta_ad_accounts")
        .upsert(adAccountsToUpsert, {
          onConflict: "meta_ad_account_id",
          ignoreDuplicates: false,
        });

      if (upsertAdAccountsError) {
        console.error("Failed to save ad accounts:", upsertAdAccountsError);
        // Não falha a operação inteira, apenas loga o erro
      } else {
        console.log(`Successfully saved ${adAccountsToUpsert.length} ad accounts`);

        // 8. Criar registros em meta_sync_state para cada conta
        // Permite que as contas sejam sincronizadas posteriormente
        for (const acc of adAccountsData.data) {
          await supabaseAdmin
            .from("meta_sync_state")
            .upsert(
              {
                workspace_id: workspaceId,
                meta_ad_account_id: acc.id,
                sync_enabled: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "workspace_id,meta_ad_account_id" }
            );
        }
      }
    }

    // 9. Retornar sucesso
    return new Response(
      JSON.stringify({
        status: "connected",
        workspace_id: workspaceId,
        business_manager_id: business_manager_id,
        adaccounts_count: adAccountsCount,
        scopes: grantedScopes,
        meta_user_id: meData.id,
        meta_user_name: meData.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
