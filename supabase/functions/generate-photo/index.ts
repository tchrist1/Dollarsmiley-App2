import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "npm:openai@4.67.3";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeneratePhotoRequest {
  prompt: string;
  context?: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536";
  count?: number;
}

interface GeneratePhotoResponse {
  images: Array<{
    imageUrl: string;
    revisedPrompt: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("ai_assist_enabled")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.ai_assist_enabled) {
      return new Response(
        JSON.stringify({ error: "AI Assist is disabled. Enable it in Settings to use this feature." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI Photo Assist is temporarily unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GeneratePhotoRequest = await req.json();
    const { prompt, context, size = "1024x1024", count = 1 } = body;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a description for the photo you want to generate." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageCount = Math.min(Math.max(1, count), 5);

    const openai = new OpenAI({ apiKey: openaiApiKey });

    let enhancedPrompt = prompt.trim();
    if (context) {
      enhancedPrompt = `${context}. ${enhancedPrompt}`;
    }

    const systemPrompt = `You are a professional photographer and image creator. Generate high-quality, realistic photographs based on user descriptions. Focus on:
- Professional composition and lighting
- Clean, crisp imagery
- Realistic style unless otherwise specified
- Good visual balance and framing`;

    const userPrompt = `Generate a professional photograph: ${enhancedPrompt}

Requirements:
- High quality, realistic image
- Good lighting and composition
- Clean background unless context requires otherwise
- Professional appearance suitable for a service marketplace listing`;

    const images: Array<{ imageUrl: string; revisedPrompt: string }> = [];

    for (let i = 0; i < imageCount; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        modalities: ["text", "image"],
        max_tokens: 1000,
      });

      const message = response.choices[0]?.message;

      if (message?.content) {
        const content = message.content;

        if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === "image_url" && part.image_url?.url) {
              images.push({
                imageUrl: part.image_url.url,
                revisedPrompt: enhancedPrompt,
              });
            }
          }
        } else if (typeof content === "string" && content.startsWith("data:image")) {
          images.push({
            imageUrl: content,
            revisedPrompt: enhancedPrompt,
          });
        }
      }

      if (message && "audio" in message) {
        continue;
      }

      const rawMessage = message as any;
      if (rawMessage?.image_url) {
        images.push({
          imageUrl: rawMessage.image_url,
          revisedPrompt: enhancedPrompt,
        });
      }
    }

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to generate photo. Please try a different description." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: GeneratePhotoResponse = { images };

    const serviceRoleClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceRoleClient.from("ai_agent_actions").insert({
      agent_id: null,
      action_type: "photo_generation_gpt4o",
      input_data: { prompt, context, size, count: imageCount },
      output_data: { imageCount: images.length, model: "gpt-4o" },
      execution_time_ms: 0,
      tokens_used: 0,
      confidence_score: 1.0,
      status: "completed",
      created_by: user.id,
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Photo generation error:", error);

    let errorMessage = "AI Photo Assist is temporarily unavailable. Please try again.";
    let statusCode = 500;

    if (error.message?.includes("content_policy_violation") || error.code === "content_policy_violation") {
      errorMessage = "This description was blocked by content safety filters. Please try different wording.";
      statusCode = 400;
    } else if (error.message?.includes("billing") || error.message?.includes("quota")) {
      errorMessage = "AI Photo Assist is temporarily unavailable due to high demand. Please try again later.";
      statusCode = 503;
    } else if (error.message?.includes("invalid_api_key")) {
      errorMessage = "AI Photo Assist is temporarily unavailable. Please try again later.";
      statusCode = 503;
    } else if (error.message?.includes("modalities") || error.message?.includes("image generation")) {
      errorMessage = "AI Photo Assist is temporarily unavailable. Please try again later.";
      statusCode = 503;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});