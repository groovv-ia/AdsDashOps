/**
 * Edge Function: meta-analyze-video-ai
 * 
 * Analisa vídeos de anúncios usando GPT-4 Vision para fornecer insights sobre
 * gancho, retenção, frames-chave e CTA.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  ad_id: string;
  meta_ad_account_id: string;
  video_url: string;
  video_duration_seconds: number;
  frame_timestamps: number[];
  copy_data?: {
    title?: string;
    body?: string;
    description?: string;
    cta?: string;
  };
  performance_context?: {
    total_impressions: number;
    video_plays: number;
    video_views_3s: number;
    video_views_15s: number;
    video_completion_rate: number;
    ctr: number;
  };
}

const SYSTEM_PROMPT = `Você é um especialista em marketing digital especializado em análise de vídeos publicitários do Meta Ads.

Sua especialidade inclui:
- Análise do gancho (primeiros 3 segundos)
- Análise de retenção e ritmo
- Análise de frames-chave
- Análise de CTA e fechamento

Sempre responda em português brasileiro.
Retorne APENAS um JSON válido no formato especificado.`;

function buildVideoPrompt(payload: RequestPayload, frameCount: number): string {
  return `Analise este vídeo publicitário de ${payload.video_duration_seconds}s. Estou enviando ${frameCount} frames em diferentes momentos.

${payload.copy_data?.title ? `Título: "${payload.copy_data.title}"` : ''}
${payload.copy_data?.body ? `Texto: "${payload.copy_data.body}"` : ''}
${payload.copy_data?.cta ? `CTA: "${payload.copy_data.cta}"` : ''}

${payload.performance_context ? `Métricas: Taxa de conclusão ${(payload.performance_context.video_completion_rate * 100).toFixed(1)}%, CTR ${(payload.performance_context.ctr * 100).toFixed(2)}%` : ''}

Análise solicitada:
1. GANCHO (primeiros 3s): Capacidade de parar o scroll
2. RETENÇÃO: Ritmo, variedade visual, pontos de queda
3. CTA: Timing, clareza, urgência
4. FRAMES: Análise de cada frame individual

Retorne JSON:
{
  "overall_score": <0-100>,
  "hook_score": <0-100>,
  "retention_score": <0-100>,
  "cta_score": <0-100>,
  "hook_analysis": {
    "attention_capture": "<análise>",
    "first_frame_impact": "<análise>",
    "opening_message": "<análise>",
    "visual_elements": ["elemento1", "elemento2"],
    "audio_elements": "<análise>",
    "scroll_stop_potential": "<análise>"
  },
  "retention_analysis": {
    "pacing_analysis": "<análise>",
    "scene_changes": <number>,
    "visual_variety": "<análise>",
    "engagement_peaks": [<timestamps>],
    "potential_drop_points": [<timestamps>],
    "optimal_duration": "<análise>"
  },
  "cta_analysis": {
    "cta_timing": "<análise>",
    "cta_visibility": "<análise>",
    "cta_clarity": "<análise>",
    "cta_urgency": "<análise>",
    "closing_strength": "<análise>"
  },
  "text_overlay_analysis": {
    "text_presence": <boolean>,
    "text_readability": "<análise>",
    "text_timing": "<análise>",
    "text_relevance": "<análise>",
    "captions_present": <boolean>
  },
  "frames": [
    {
      "timestamp_seconds": <number>,
      "frame_score": <0-100>,
      "visual_description": "<descrição>",
      "key_elements": ["elemento1", "elemento2"],
      "text_content": "<texto visível ou null>",
      "emotional_tone": "<tom>",
      "attention_level": "<alto|médio|baixo>",
      "role_in_video": "<gancho|meio|CTA>"
    }
  ],
  "key_strengths": ["ponto1", "ponto2"],
  "improvement_areas": ["área1", "área2"],
  "editing_suggestions": ["sugestão1", "sugestão2"],
  "sound_analysis": "<análise de áudio>",
  "mobile_optimization": "<análise>"
}`;
}

async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  
  return { base64, mimeType: contentType.includes("png") ? "image/png" : "image/jpeg" };
}

async function analyzeVideoWithGPT4Vision(
  payload: RequestPayload,
  frameUrls: string[],
  openaiApiKey: string
): Promise<{ analysis: any; tokensUsed: number }> {
  const userPrompt = buildVideoPrompt(payload, frameUrls.length);
  
  const imageContents = [];
  for (const frameUrl of frameUrls) {
    const { base64, mimeType } = await downloadImageAsBase64(frameUrl);
    imageContents.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high"
      }
    });
  }
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [{ type: "text", text: userPrompt }, ...imageContents] }
      ],
      max_tokens: 4000,
      temperature: 0.5,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const tokensUsed = data.usage?.total_tokens || 0;
  
  const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const analysis = JSON.parse(cleanContent);
  
  return { analysis, tokensUsed };
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
    
    const payload: RequestPayload = await req.json();
    const { ad_id, meta_ad_account_id, video_url, video_duration_seconds, frame_timestamps } = payload;
    
    if (!ad_id || !meta_ad_account_id || !video_url || !frame_timestamps || frame_timestamps.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    
    // Para demonstração, assumimos que frame_timestamps contém URLs de frames já extraídos
    // Em produção, você precisaria extrair frames do vídeo
    const frameUrls = frame_timestamps.map(ts => `${video_url}?frame=${ts}`);
    
    console.log("Starting video analysis...");
    const { analysis, tokensUsed } = await analyzeVideoWithGPT4Vision(payload, frameUrls, openaiApiKey);
    console.log("Analysis completed");
    
    const videoRecord = {
      workspace_id: workspace.id,
      ad_id,
      meta_ad_account_id,
      overall_score: analysis.overall_score,
      hook_score: analysis.hook_score,
      retention_score: analysis.retention_score,
      cta_score: analysis.cta_score,
      video_duration_seconds,
      analysis_data: {
        hook_analysis: analysis.hook_analysis,
        retention_analysis: analysis.retention_analysis,
        cta_analysis: analysis.cta_analysis,
        text_overlay_analysis: analysis.text_overlay_analysis,
        key_strengths: analysis.key_strengths,
        improvement_areas: analysis.improvement_areas,
        editing_suggestions: analysis.editing_suggestions,
        sound_analysis: analysis.sound_analysis,
        mobile_optimization: analysis.mobile_optimization,
      },
      model_used: "gpt-4o",
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString(),
    };
    
    const { data: savedVideo, error: insertError } = await supabaseAdmin
      .from("video_analyses")
      .insert(videoRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          video_analysis: { ...videoRecord, analyzed_at: videoRecord.analyzed_at },
          frame_analyses: [],
          tokens_used: tokensUsed,
          saved: false,
          save_error: insertError.message 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const frameRecords = analysis.frames.map((frameAnalysis: any, index: number) => ({
      video_analysis_id: savedVideo.id,
      workspace_id: workspace.id,
      timestamp_seconds: frameAnalysis.timestamp_seconds,
      frame_url: frameUrls[index] || null,
      frame_score: frameAnalysis.frame_score,
      insights: {
        visual_description: frameAnalysis.visual_description,
        key_elements: frameAnalysis.key_elements,
        text_content: frameAnalysis.text_content,
        emotional_tone: frameAnalysis.emotional_tone,
        attention_level: frameAnalysis.attention_level,
        role_in_video: frameAnalysis.role_in_video,
      },
    }));
    
    const { data: savedFrames } = await supabaseAdmin
      .from("video_frame_analyses")
      .insert(frameRecords)
      .select();
    
    return new Response(
      JSON.stringify({ 
        video_analysis: savedVideo,
        frame_analyses: savedFrames || [],
        tokens_used: tokensUsed,
        saved: true 
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