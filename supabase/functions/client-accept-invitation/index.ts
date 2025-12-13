/**
 * Edge Function: client-accept-invitation
 * 
 * Aceita um convite, cria o usuario no Supabase Auth e vincula ao cliente.
 * Nao requer autenticacao previa - o usuario sera criado aqui.
 * 
 * POST /functions/v1/client-accept-invitation
 * Body: { token: string, password: string, full_name?: string }
 * 
 * Retorna: { success: boolean, message: string }
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
interface AcceptInvitationPayload {
  token: string;
  password: string;
  full_name?: string;
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

    // Parse do body
    const body: AcceptInvitationPayload = await req.json();
    const { token, password, full_name } = body;

    // Validacao basica
    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Missing token or password" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validacao de senha (minimo 6 caracteres)
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cria cliente Supabase com service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Busca o convite pelo token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("client_invitations")
      .select("id, email, status, expires_at, client_id")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch invitation" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found", code: "NOT_FOUND" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica status do convite
    if (invitation.status !== "pending") {
      return new Response(
        JSON.stringify({ 
          error: `This invitation is ${invitation.status}`,
          code: invitation.status.toUpperCase()
        }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se expirou
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      // Atualiza status para expirado
      await supabaseAdmin
        .from("client_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ 
          error: "This invitation has expired",
          code: "EXPIRED"
        }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se ja existe um usuario com este email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // Usuario ja existe - apenas vincula ao cliente
      userId = existingUser.id;
      
      // Verifica se ja tem vinculo com este cliente
      const { data: existingLink } = await supabaseAdmin
        .from("client_users")
        .select("id, is_active")
        .eq("client_id", invitation.client_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingLink) {
        if (existingLink.is_active) {
          return new Response(
            JSON.stringify({ 
              error: "You already have access to this client",
              code: "ALREADY_LINKED"
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          // Reativa o vinculo
          await supabaseAdmin
            .from("client_users")
            .update({ is_active: true, invitation_id: invitation.id })
            .eq("id", existingLink.id);
        }
      } else {
        // Cria novo vinculo
        const { error: linkError } = await supabaseAdmin
          .from("client_users")
          .insert({
            client_id: invitation.client_id,
            user_id: userId,
            invitation_id: invitation.id,
            is_active: true,
          });

        if (linkError) {
          console.error("Error creating client_users link:", linkError);
          return new Response(
            JSON.stringify({ error: "Failed to link user to client" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    } else {
      // Cria novo usuario
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // Usuario ja confirmado pois veio de convite
        user_metadata: {
          full_name: full_name || "",
          user_type: "client",
        },
      });

      if (createUserError || !newUser.user) {
        console.error("Error creating user:", createUserError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to create user account",
            details: createUserError?.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userId = newUser.user.id;

      // Cria o perfil do usuario
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: invitation.email,
          full_name: full_name || "",
        });

      // Cria o vinculo com o cliente
      const { error: linkError } = await supabaseAdmin
        .from("client_users")
        .insert({
          client_id: invitation.client_id,
          user_id: userId,
          invitation_id: invitation.id,
          is_active: true,
        });

      if (linkError) {
        console.error("Error creating client_users link:", linkError);
        // Nao falha aqui pois o usuario ja foi criado
      }
    }

    // Marca o convite como aceito
    const { error: updateError } = await supabaseAdmin
      .from("client_invitations")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
    }

    // Retorna sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser 
          ? "Your account has been linked to the client. You can now login."
          : "Your account has been created successfully. You can now login.",
        email: invitation.email,
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