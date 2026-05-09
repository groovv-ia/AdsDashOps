import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Edge Function: verify-totp
 *
 * Verifica um codigo TOTP (RFC 6238) server-side usando HMAC-SHA1.
 * Se valido, ativa o 2FA no metadata do usuario.
 *
 * Requer autenticacao (JWT valido no header Authorization).
 */

// Decodifica base32 para Uint8Array
function base32Decode(input: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const char of clean) {
    const val = chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

// Gera TOTP para um contador usando HMAC-SHA1
async function generateTOTP(secret: string, counter: number): Promise<string> {
  const keyBytes = base32Decode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  // Counter como 8 bytes big-endian
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  // JavaScript nao tem inteiros de 64 bits nativos, mas TOTP atual cabe em 32 bits
  counterView.setUint32(4, counter >>> 0, false);

  const hmac = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, counterBuffer)
  );

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1_000_000;

  return code.toString().padStart(6, "0");
}

// Verifica o token com janela de ±1 periodo (tolerancia de clock skew de 30s)
async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(now / timeStep);

  for (const offset of [-1, 0, 1]) {
    const expected = await generateTOTP(secret, counter + offset);
    if (expected === token) return true;
  }
  return false;
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

    // Verifica autenticacao
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();

    // Valida formato do token
    if (!token || !/^\d{6}$/.test(token)) {
      return new Response(
        JSON.stringify({ error: "Token deve ter 6 digitos numericos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Recupera o segredo pendente do metadata do usuario
    const pendingSecret = user.user_metadata?.totp_secret_pending;
    if (!pendingSecret) {
      return new Response(
        JSON.stringify({ error: "Sessao de configuracao 2FA nao encontrada. Reinicie o processo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica o TOTP server-side com HMAC-SHA1 real
    const isValid = await verifyTOTP(pendingSecret, token);
    if (!isValid) {
      return new Response(
        JSON.stringify({ valid: false, error: "Codigo invalido ou expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Codigo valido: promove segredo de pending para ativo no metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        two_factor_enabled: true,
        totp_secret_pending: null,
      },
    });

    if (updateError) {
      console.error("[verify-totp] Erro ao ativar 2FA:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar configuracao 2FA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[verify-totp] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
