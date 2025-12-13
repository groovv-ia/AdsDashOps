/**
 * Edge Function: client-send-invitation
 * 
 * Cria um convite para um usuario de cliente acessar o portal de visualizacao.
 * Apenas usuarios de agencia (workspace members) podem enviar convites.
 * 
 * POST /functions/v1/client-send-invitation
 * Body: { client_id: string, email: string }
 * 
 * Retorna: { success: boolean, invitation: object }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Interface para payload da requisicao
interface SendInvitationPayload {
  client_id: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  // Trata requisicoes OPTIONS (preflight CORS)
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

    // Cria clientes Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente para verificar o usuario autenticado
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verifica o usuario autenticado
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

    // Cliente com service role para operacoes no banco
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do body
    const body: SendInvitationPayload = await req.json();
    const { client_id, email } = body;

    // Validacao basica
    if (!client_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing client_id or email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validacao de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se o usuario e membro de um workspace (agencia)
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "Only agency users can send invitations" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se o cliente pertence ao workspace do usuario
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, name, workspace_id")
      .eq("id", client_id)
      .eq("workspace_id", membership.workspace_id)
      .maybeSingle();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se ja existe um convite pendente para este email/cliente
    const { data: existingInvitation } = await supabaseAdmin
      .from("client_invitations")
      .select("id, status, expires_at")
      .eq("client_id", client_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      // Se existe e nao expirou, retorna erro
      const expiresAt = new Date(existingInvitation.expires_at);
      if (expiresAt > new Date()) {
        return new Response(
          JSON.stringify({ 
            error: "An invitation is already pending for this email",
            invitation_id: existingInvitation.id
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Se expirou, atualiza o status
      await supabaseAdmin
        .from("client_invitations")
        .update({ status: "expired" })
        .eq("id", existingInvitation.id);
    }

    // Verifica se o email ja tem acesso ao cliente
    const { data: existingUser } = await supabaseAdmin
      .from("client_users")
      .select(`
        id,
        user_id,
        is_active
      `)
      .eq("client_id", client_id)
      .maybeSingle();

    // Busca se existe usuario com este email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (targetUser && existingUser?.user_id === targetUser.id && existingUser?.is_active) {
      return new Response(
        JSON.stringify({ error: "This user already has access to this client" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cria o convite
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("client_invitations")
      .insert({
        client_id: client_id,
        email: email.toLowerCase(),
        invited_by: user.id,
        status: "pending",
      })
      .select("id, token, email, expires_at, created_at")
      .single();

    if (inviteError || !invitation) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation", details: inviteError?.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Monta a URL de convite
    // Em producao, seria o dominio real da aplicacao
    const appUrl = Deno.env.get("APP_URL") || "https://seu-app.com";
    const inviteUrl = `${appUrl}/invite/${invitation.token}`;

    // Retorna sucesso com dados do convite
    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          client_name: client.name,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          invite_url: inviteUrl,
        },
      }),
      {
        status: 201,
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