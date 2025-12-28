import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OpenAI } from "npm:openai@4.67.3";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SourceContext {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  locationType?: string;
  fulfillmentType?: string[];
  listingType?: 'Service' | 'CustomService';
  jobType?: 'quote_based' | 'fixed_price';
}

interface GeneratePhotoRequest {
  prompt: string;
  sourceContext?: SourceContext;
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

    // TESTING MODE: AI Assist always enabled - no checks

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI Photo Assist is temporarily unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: GeneratePhotoRequest = await req.json();
    const { prompt, sourceContext, size = "1024x1024", count = 1 } = body;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide a description for the photo you want to generate." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageCount = Math.min(Math.max(1, count), 5);

    const openai = new OpenAI({ apiKey: openaiApiKey });

    let contextDescription = '';
    if (sourceContext) {
      const parts: string[] = [];
      if (sourceContext.title) parts.push(`Title: "${sourceContext.title}"`);
      if (sourceContext.description) parts.push(`Description: "${sourceContext.description}"`);
      if (sourceContext.category) parts.push(`Category: ${sourceContext.category}`);
      if (sourceContext.subcategory) parts.push(`Subcategory: ${sourceContext.subcategory}`);
      if (sourceContext.listingType === 'CustomService') parts.push('Type: Custom product/service with fulfillment');
      if (sourceContext.jobType) parts.push(`Job Type: ${sourceContext.jobType === 'fixed_price' ? 'Fixed price job' : 'Quote-based job'}`);
      if (sourceContext.fulfillmentType && sourceContext.fulfillmentType.length > 0) {
        parts.push(`Fulfillment: ${sourceContext.fulfillmentType.join(', ')}`);
      }
      contextDescription = parts.join('\n');
    }

    const enhancementPrompt = `You are an expert prompt engineer for image generation. Transform the user's description into a detailed, optimized prompt for an AI image generator.

${contextDescription ? `Source Context:\n${contextDescription}\n\n` : ''}User's Photo Description: "${prompt.trim()}"

Create an enhanced prompt that:
1. Reflects the service or job purpose from the context
2. Incorporates the environment and visual expectations
3. Adds professional photography details (lighting, composition, style)
4. Specifies quality and aesthetic characteristics
5. Includes relevant technical details (camera angle, depth of field, etc.)
6. Keeps it concise (max 150 words)

Return ONLY the enhanced prompt text, nothing else.`;

    const enhancementResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: enhancementPrompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    const enhancedPrompt = enhancementResponse.choices[0].message.content?.trim() || prompt.trim();

    const imageGenerationPromises = Array.from({ length: imageCount }, async (_, i) => {
      try {
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt: enhancedPrompt,
          n: 1,
          size: size === "1536x1024" ? "1536x1024" : size === "1024x1536" ? "1024x1536" : "1024x1024",
          quality: "auto",
        });

        if (response.data && response.data.length > 0) {
          const imageData = response.data[0];
          if (imageData.b64_json) {
            return {
              imageUrl: `data:image/png;base64,${imageData.b64_json}`,
              revisedPrompt: enhancedPrompt,
            };
          } else if (imageData.url) {
            return {
              imageUrl: imageData.url,
              revisedPrompt: enhancedPrompt,
            };
          }
        }
        return null;
      } catch (imgError: any) {
        console.error(`Image generation attempt ${i + 1} failed:`, imgError.message);
        if (i === 0) {
          throw imgError;
        }
        return null;
      }
    });

    const settledResults = await Promise.allSettled(imageGenerationPromises);
    const images: Array<{ imageUrl: string; revisedPrompt: string }> = settledResults
      .filter((result) => result.status === 'fulfilled' && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to generate photo. Please try a different description." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: GeneratePhotoResponse = { images };

    try {
      const serviceRoleClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await serviceRoleClient.from("ai_agent_actions").insert({
        agent_id: null,
        action_type: "photo_generation_gpt_image",
        input_data: {
          prompt,
          sourceContext: sourceContext ? {
            title: sourceContext.title,
            description: sourceContext.description?.substring(0, 200),
            category: sourceContext.category,
            subcategory: sourceContext.subcategory,
            listingType: sourceContext.listingType,
            jobType: sourceContext.jobType,
          } : null,
          size,
          count: imageCount
        },
        output_data: {
          imageCount: images.length,
          enhancementModel: "gpt-4o-mini",
          imageModel: "gpt-image-1",
          enhancedPrompt: enhancedPrompt.substring(0, 500),
          contextUsed: !!sourceContext
        },
        execution_time_ms: 0,
        tokens_used: enhancementResponse.usage?.total_tokens || 0,
        confidence_score: 1.0,
        status: "completed",
        created_by: user.id,
      });
    } catch (logError) {
      console.error("Failed to log AI action:", logError);
    }

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
    } else if (error.message?.includes("model") && error.message?.includes("not found")) {
      errorMessage = "AI Photo Assist is temporarily unavailable. Please try again later.";
      statusCode = 503;
    } else if (error.status === 404) {
      errorMessage = "AI Photo Assist is temporarily unavailable. Please try again later.";
      statusCode = 503;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});