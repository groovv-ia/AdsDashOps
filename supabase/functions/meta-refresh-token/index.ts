/**
 * Edge Function: meta-refresh-token
 *
 * Valida e renova tokens Meta conforme o tipo de conexao:
 *
 * - connection_method='manual': System User Token permanente.
 *   Apenas valida via /me. Nao suporta fb_exchange_token.
 *
 * - connection_method='user_token': User Access Token de 60 dias.
 *   Se o token expira em menos de 7 dias, renova automaticamente
 *   via fb_exchange_token para obter novo long-lived token.
 *
 * - connection_method='flfb': BISUAT permanente (legado).
 *   Mesma logica do manual -- apenas valida.
 *
 * Fluxo:
 * 1. Autentica o usuario via JWT
 * 2. Busca o token atual da conexao Meta no banco
 * 3. Descriptografa e valida chamando /me na Graph API
 * 4. Se user_token e expirando em breve: renova via fb_exchange_token
 * 5. Se valido: atualiza status para 'connected'
 * 6. Se invalido/revogado: marca status como 'token_expired'
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// Renova se o token expira em menos de 7 dias
const RENEWAL_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface RefreshTokenRequest {
  connection_id?: string;
}

interface MetaMeResponse {
  id: string;
  name?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface MetaTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string; code: number; type: string };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autentica o usuario via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: RefreshTokenRequest = await req.json().catch(() => ({}));

    // Busca o workspace do usuario (como owner ou membro)
    let workspaceId: string | null = null;

    const { data: ownedWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedWorkspace) {
      workspaceId = ownedWorkspace.id;
    } else {
      const { data: memberRecord } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      workspaceId = memberRecord?.workspace_id || null;
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Workspace nao encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca a conexao Meta (filtra por connection_id se fornecido)
    let connectionQuery = supabaseAdmin
      .from("meta_connections")
      .select("id, access_token_encrypted, status, token_expires_at, connection_method")
      .eq("workspace_id", workspaceId);

    if (body.connection_id) {
      connectionQuery = connectionQuery.eq("id", body.connection_id);
    }

    const { data: connection, error: connError } = await connectionQuery.maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexao Meta nao encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const connectionMethod = connection.connection_method || "manual";

    // Descriptografa o token atual usando a funcao RPC do banco
    const { data: decryptedToken } = await supabaseAdmin.rpc("decrypt_token", {
      p_encrypted_token: connection.access_token_encrypted,
    });

    const currentToken = decryptedToken || connection.access_token_encrypted;

    if (!currentToken) {
      return new Response(JSON.stringify({ error: "Token atual nao encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[meta-refresh-token] Validando token (method=${connectionMethod}) workspace=${workspaceId}...`);

    // Valida o token chamando /me na Graph API
    const meResponse = await fetch(
      `${GRAPH_API_BASE}/me?access_token=${currentToken}`
    );
    const meData: MetaMeResponse = await meResponse.json();

    // Se o token e invalido/revogado, marca como expirado
    if (meData.error) {
      console.error(
        `[meta-refresh-token] Token invalido (code: ${meData.error.code}):`,
        meData.error.message,
      );

      await supabaseAdmin
        .from("meta_connections")
        .update({
          status: "token_expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      return new Response(
        JSON.stringify({
          error: "Token do Meta foi revogado ou esta invalido. Reconecte na pagina Meta Admin.",
          error_code: meData.error.code,
          requires_reconnect: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[meta-refresh-token] Token valido (user: ${meData.name || meData.id})`,
    );

    // -------------------------------------------------------
    // Renovacao automatica para user_token (60 dias)
    // Se o token expira em menos de 7 dias, troca por novo long-lived
    // -------------------------------------------------------
    let finalToken = currentToken;
    let newExpiresAt: string;
    let wasRenewed = false;

    if (connectionMethod === "user_token" && connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry < RENEWAL_THRESHOLD_MS) {
        console.log(`[meta-refresh-token] Token user_token expira em ${Math.round(timeUntilExpiry / 86400000)} dias, renovando...`);

        const metaAppId = Deno.env.get("META_APP_ID");
        const metaAppSecret = Deno.env.get("META_APP_SECRET");

        if (metaAppId && metaAppSecret) {
          try {
            const renewUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
            renewUrl.searchParams.set("grant_type", "fb_exchange_token");
            renewUrl.searchParams.set("client_id", metaAppId);
            renewUrl.searchParams.set("client_secret", metaAppSecret);
            renewUrl.searchParams.set("fb_exchange_token", currentToken);

            const renewResponse = await fetch(renewUrl.toString());
            const renewData: MetaTokenResponse = await renewResponse.json();

            if (renewData.access_token) {
              finalToken = renewData.access_token;
              const expiresIn = renewData.expires_in || 5184000;
              newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
              wasRenewed = true;
              console.log(`[meta-refresh-token] Token renovado com sucesso (expira em ${expiresIn}s)`);
            } else {
              console.warn("[meta-refresh-token] Renovacao falhou:", renewData.error?.message);
              newExpiresAt = connection.token_expires_at;
            }
          } catch (err) {
            console.warn("[meta-refresh-token] Erro ao renovar token:", err);
            newExpiresAt = connection.token_expires_at;
          }
        } else {
          console.warn("[meta-refresh-token] META_APP_ID/SECRET nao disponivel para renovacao");
          newExpiresAt = connection.token_expires_at;
        }
      } else {
        // Token ainda valido por mais de 7 dias, nao precisa renovar
        newExpiresAt = connection.token_expires_at;
      }
    } else {
      // System User tokens (manual/flfb) sao permanentes -- expiracao em 10 anos
      newExpiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Se o token foi renovado, criptografa e salva o novo
    const updatePayload: Record<string, unknown> = {
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
      status: "connected",
      last_validated_at: new Date().toISOString(),
    };

    if (wasRenewed) {
      let encryptedNewToken = finalToken;
      try {
        const { data: encryptedData, error: encryptError } = await supabaseAdmin
          .rpc("encrypt_token", { p_token: finalToken });
        if (!encryptError && encryptedData) {
          encryptedNewToken = encryptedData;
        }
      } catch {
        // Sem criptografia disponivel
      }
      updatePayload.access_token_encrypted = encryptedNewToken;
    }

    const { error: updateError } = await supabaseAdmin
      .from("meta_connections")
      .update(updatePayload)
      .eq("id", connection.id);

    if (updateError) {
      console.error("[meta-refresh-token] Erro ao atualizar conexao:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar status no banco de dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: newExpiresAt,
        was_renewed: wasRenewed,
        connection_method: connectionMethod,
        message: wasRenewed
          ? "Token renovado com sucesso"
          : connectionMethod === "user_token"
            ? "Token validado (renovacao nao necessaria)"
            : "Token de System User validado com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[meta-refresh-token] Erro inesperado:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
