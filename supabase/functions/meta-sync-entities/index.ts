/**
 * Edge Function: meta-sync-entities
 * 
 * Sincroniza entidades (campaigns, adsets, ads) do Meta para o cache local.
 * 
 * POST /functions/v1/meta-sync-entities
 * Body: { meta_ad_account_id: string, force?: boolean }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncEntitiesPayload {
  meta_ad_account_id: string;
  force?: boolean;
}

interface MetaCampaign {
  id: string;
  name: string;
  effective_status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  effective_status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal?: string;
}

interface MetaAd {
  id: string;
  name: string;
  effective_status: string;
  campaign_id: string;
  adset_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
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

    const body: SyncEntitiesPayload = await req.json();
    const { meta_ad_account_id, force = false } = body;

    if (!meta_ad_account_id) {
      return new Response(
        JSON.stringify({ error: "Missing meta_ad_account_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca workspace do usuário
    const { data: workspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!workspace) {
      return new Response(
        JSON.stringify({ error: "No workspace found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica cache (6h TTL)
    if (!force) {
      const { data: cachedEntities } = await supabaseAdmin
        .from("meta_entities_cache")
        .select("last_synced_at")
        .eq("workspace_id", workspace.id)
        .eq("meta_ad_account_id", meta_ad_account_id)
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedEntities) {
        const lastSync = new Date(cachedEntities.last_synced_at);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        if (lastSync > sixHoursAgo) {
          // Retorna do cache
          const { data: entities } = await supabaseAdmin
            .from("meta_entities_cache")
            .select("*")
            .eq("workspace_id", workspace.id)
            .eq("meta_ad_account_id", meta_ad_account_id);

          return new Response(
            JSON.stringify({
              from_cache: true,
              campaigns: entities?.filter((e) => e.entity_type === "campaign") || [],
              adsets: entities?.filter((e) => e.entity_type === "adset") || [],
              ads: entities?.filter((e) => e.entity_type === "ad") || [],
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Busca conexão Meta
    const { data: metaConnection } = await supabaseAdmin
      .from("meta_connections")
      .select("access_token_encrypted, status")
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (!metaConnection || metaConnection.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "No valid Meta connection" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: decryptedToken } = await supabaseAdmin
      .rpc("decrypt_token", { p_encrypted_token: metaConnection.access_token_encrypted });

    const accessToken = decryptedToken || metaConnection.access_token_encrypted;

    const result = {
      campaigns: [] as MetaCampaign[],
      adsets: [] as MetaAdSet[],
      ads: [] as MetaAd[],
    };

    const now = new Date().toISOString();

    // 1. Buscar Campaigns
    const campaignsUrl = `https://graph.facebook.com/v21.0/${meta_ad_account_id}/campaigns?fields=id,name,effective_status,objective,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.data) {
      result.campaigns = campaignsData.data;

      // Salva no cache
      for (const campaign of campaignsData.data) {
        await supabaseAdmin.from("meta_entities_cache").upsert(
          {
            workspace_id: workspace.id,
            meta_ad_account_id: meta_ad_account_id,
            entity_type: "campaign",
            entity_id: campaign.id,
            name: campaign.name,
            effective_status: campaign.effective_status,
            objective: campaign.objective,
            daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            last_synced_at: now,
            updated_at: now,
          },
          { onConflict: "workspace_id,meta_ad_account_id,entity_type,entity_id" }
        );
      }
    }

    // 2. Buscar AdSets
    const adsetsUrl = `https://graph.facebook.com/v21.0/${meta_ad_account_id}/adsets?fields=id,name,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal&limit=500&access_token=${accessToken}`;
    const adsetsResponse = await fetch(adsetsUrl);
    const adsetsData = await adsetsResponse.json();

    if (adsetsData.data) {
      result.adsets = adsetsData.data;

      for (const adset of adsetsData.data) {
        await supabaseAdmin.from("meta_entities_cache").upsert(
          {
            workspace_id: workspace.id,
            meta_ad_account_id: meta_ad_account_id,
            entity_type: "adset",
            entity_id: adset.id,
            name: adset.name,
            effective_status: adset.effective_status,
            campaign_id: adset.campaign_id,
            daily_budget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null,
            lifetime_budget: adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : null,
            extra_data: { optimization_goal: adset.optimization_goal },
            last_synced_at: now,
            updated_at: now,
          },
          { onConflict: "workspace_id,meta_ad_account_id,entity_type,entity_id" }
        );
      }
    }

    // 3. Buscar Ads
    const adsUrl = `https://graph.facebook.com/v21.0/${meta_ad_account_id}/ads?fields=id,name,effective_status,campaign_id,adset_id&limit=500&access_token=${accessToken}`;
    const adsResponse = await fetch(adsUrl);
    const adsData = await adsResponse.json();

    if (adsData.data) {
      result.ads = adsData.data;

      for (const ad of adsData.data) {
        await supabaseAdmin.from("meta_entities_cache").upsert(
          {
            workspace_id: workspace.id,
            meta_ad_account_id: meta_ad_account_id,
            entity_type: "ad",
            entity_id: ad.id,
            name: ad.name,
            effective_status: ad.effective_status,
            campaign_id: ad.campaign_id,
            adset_id: ad.adset_id,
            last_synced_at: now,
            updated_at: now,
          },
          { onConflict: "workspace_id,meta_ad_account_id,entity_type,entity_id" }
        );
      }
    }

    return new Response(
      JSON.stringify({
        from_cache: false,
        campaigns: result.campaigns,
        adsets: result.adsets,
        ads: result.ads,
        totals: {
          campaigns: result.campaigns.length,
          adsets: result.adsets.length,
          ads: result.ads.length,
        },
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
