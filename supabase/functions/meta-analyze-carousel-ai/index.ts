/**
 * Edge Function: meta-analyze-carousel-ai
 * 
 * Analisa carrossel de anúncios usando GPT-4 Vision para fornecer insights sobre
 * storytelling, coerência visual e análise individual de cada slide.
 * 
 * POST /functions/v1/meta-analyze-carousel-ai
 * Body: { 
 *   ad_id: string, 
 *   meta_ad_account_id: string,
 *   slides: Array<{slide_number: number, image_url: string, copy_data?: object}>
 * }
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
  slides: Array<{
    slide_number: number;
    image_url: string;
    copy_data?: {
      title?: string;
      body?: string;
      description?: string;
    };
  }>;
  performance_context?: {
    total_impressions: number;
    total_clicks: number;
    ctr: number;
    engagement_rate: number;
  };
}

// Prompt do sistema para análise de carrossel
const SYSTEM_PROMPT = `Você é um especialista em marketing digital especializado em análise de carrosséis publicitários do Meta Ads (Facebook/Instagram).

Sua especialidade inclui:
- Análise de storytelling e fluxo narrativo em carrosséis
- Coerência visual e consistência de marca
- Análise individual de cada slide
- Sugestões de otimização de ordem e conteúdo

Sempre responda em português brasileiro com linguagem profissional mas acessível.
Retorne APENAS um JSON válido no formato especificado, sem texto adicional ou markdown.`;

function buildCarouselPrompt(slides: RequestPayload["slides"]): string {
  const slidesInfo = slides.map((s, i) => 
    `Slide ${s.slide_number}:\n${s.copy_data?.title ? `Título: "${s.copy_data.title}"` : ''}\n${s.copy_data?.body ? `Texto: "${s.copy_data.body}"` : ''}`
  ).join('\n\n');

  return `Analise este carrossel com ${slides.length} slides de forma DETALHADA e ESPECÍFICA.

${slidesInfo}

Análise solicitada:
1. STORYTELLING: Avalie o fluxo narrativo entre os slides
2. COERÊNCIA VISUAL: Avalie consistência de cores, tipografia e layout
3. ANÁLISE POR SLIDE: Avalie cada slide individualmente
4. OTIMIZAÇÕES: Sugira melhorias de ordem e conteúdo

Retorne JSON:
{
  "overall_score": <0-100>,
  "storytelling_score": <0-100>,
  "coherence_score": <0-100>,
  "storytelling": {
    "narrative_flow": "<análise>",
    "story_arc": "<análise>",
    "engagement_progression": "<análise>",
    "message_consistency": "<análise>",
    "emotional_journey": "<análise>",
    "drop_off_prediction": "<análise>"
  },
  "visual_coherence": {
    "color_consistency": "<análise>",
    "typography_consistency": "<análise>",
    "layout_consistency": "<análise>",
    "brand_consistency": "<análise>",
    "visual_rhythm": "<análise>",
    "contrast_balance": "<análise>"
  },
  "slides": [
    {
      "slide_number": <number>,
      "slide_score": <0-100>,
      "visual_analysis": {
        "composition_score": <0-100>,
        "color_usage": "<análise>",
        "text_visibility": "<análise>",
        "attention_grabbing": "<análise>",
        "key_visual_elements": ["elemento1", "elemento2"]
      },
      "copy_analysis": {
        "message_clarity": "<análise>",
        "call_to_action": "<análise>",
        "text_amount": "<ideal|pouco|muito>",
        "readability": "<análise>"
      },
      "insights": {
        "role_in_story": "<análise>",
        "strengths": ["ponto1", "ponto2"],
        "improvements": ["sugestão1", "sugestão2"],
        "optimal_position": <number ou null>
      }
    }
  ],
  "key_strengths": ["ponto1", "ponto2"],
  "improvement_areas": ["área1", "área2"],
  "slide_order_suggestions": ["sugestão1", "sugestão2"],
  "optimal_slide_count": "<análise>"
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

async function analyzeCarouselWithGPT4Vision(
  slides: RequestPayload["slides"],
  openaiApiKey: string
): Promise<{ analysis: any; tokensUsed: number }> {
  const userPrompt = buildCarouselPrompt(slides);
  
  // Baixa todas as imagens
  const imageContents = [];
  for (const slide of slides) {
    const { base64, mimeType } = await downloadImageAsBase64(slide.image_url);
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
    const { ad_id, meta_ad_account_id, slides } = payload;
    
    if (!ad_id || !meta_ad_account_id || !slides || slides.length === 0) {
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
    
    console.log("Starting carousel analysis...");
    const { analysis, tokensUsed } = await analyzeCarouselWithGPT4Vision(slides, openaiApiKey);
    console.log("Analysis completed");
    
    // Salva análise geral do carrossel
    const carouselRecord = {
      workspace_id: workspace.id,
      ad_id,
      meta_ad_account_id,
      overall_score: analysis.overall_score,
      storytelling_score: analysis.storytelling_score,
      coherence_score: analysis.coherence_score,
      slide_count: slides.length,
      analysis_data: {
        storytelling: analysis.storytelling,
        visual_coherence: analysis.visual_coherence,
        key_strengths: analysis.key_strengths,
        improvement_areas: analysis.improvement_areas,
        slide_order_suggestions: analysis.slide_order_suggestions,
        optimal_slide_count: analysis.optimal_slide_count,
      },
      model_used: "gpt-4o",
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString(),
    };
    
    const { data: savedCarousel, error: insertError } = await supabaseAdmin
      .from("carousel_analyses")
      .insert(carouselRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ 
          carousel_analysis: { ...carouselRecord, analyzed_at: carouselRecord.analyzed_at },
          slide_analyses: [],
          tokens_used: tokensUsed,
          saved: false,
          save_error: insertError.message 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Salva análises individuais dos slides
    const slideRecords = analysis.slides.map((slideAnalysis: any) => ({
      carousel_analysis_id: savedCarousel.id,
      workspace_id: workspace.id,
      slide_number: slideAnalysis.slide_number,
      image_url: slides.find(s => s.slide_number === slideAnalysis.slide_number)?.image_url,
      slide_score: slideAnalysis.slide_score,
      visual_analysis: slideAnalysis.visual_analysis,
      copy_analysis: slideAnalysis.copy_analysis,
      insights: slideAnalysis.insights,
    }));
    
    const { data: savedSlides } = await supabaseAdmin
      .from("carousel_slide_analyses")
      .insert(slideRecords)
      .select();
    
    return new Response(
      JSON.stringify({ 
        carousel_analysis: savedCarousel,
        slide_analyses: savedSlides || [],
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