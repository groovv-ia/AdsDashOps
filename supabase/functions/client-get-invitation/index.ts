/**
 * Edge Function: client-get-invitation
 * 
 * Retorna os detalhes de um convite pelo token.
 * Nao requer autenticacao - usado na pagina de aceite do convite.
 * 
 * GET /functions/v1/client-get-invitation?token=xxx
 * 
 * Retorna: { invitation: object } ou { error: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Headers CORS padrao
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // Trata requisicoes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Apenas aceita GET
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extrai o token da query string
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing token parameter" }),
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
      .select(`
        id,
        email,
        status,
        expires_at,
        created_at,
        client:clients (
          id,
          name,
          description
        ),
        inviter:profiles!client_invitations_invited_by_fkey (
          full_name,
          company
        )
      `)
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

    // Verifica se o convite ja foi aceito
    if (invitation.status === "accepted") {
      return new Response(
        JSON.stringify({ 
          error: "This invitation has already been accepted",
          code: "ALREADY_ACCEPTED"
        }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se o convite foi revogado
    if (invitation.status === "revoked") {
      return new Response(
        JSON.stringify({ 
          error: "This invitation has been revoked",
          code: "REVOKED"
        }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verifica se o convite expirou
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      // Atualiza o status para expirado
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

    // Retorna os dados do convite (sem informacoes sensiveis)
    return new Response(
      JSON.stringify({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expires_at: invitation.expires_at,
          client_name: invitation.client?.name || "Cliente",
          client_description: invitation.client?.description,
          inviter_name: invitation.inviter?.full_name || "Equipe",
          inviter_company: invitation.inviter?.company,
        },
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