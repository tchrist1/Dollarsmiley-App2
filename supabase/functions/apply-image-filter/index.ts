import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PhotoFilter = 'none' | 'clean' | 'warm' | 'cool' | 'soft' | 'professional';

interface ApplyFilterRequest {
  imageUrl: string;
  filter: PhotoFilter;
  imageBase64?: string;
}

interface ApplyFilterResponse {
  imageUrl: string;
  filter: PhotoFilter;
}

// Filter definitions using CSS filter equivalents
const FILTER_DEFINITIONS: Record<PhotoFilter, string> = {
  'none': '',
  'clean': 'brightness(1.1) contrast(1.15) saturate(1.2)',
  'warm': 'brightness(1.05) saturate(1.3) sepia(0.2)',
  'cool': 'brightness(1.05) saturate(1.1) hue-rotate(190deg)',
  'soft': 'brightness(1.05) contrast(0.9) saturate(0.95)',
  'professional': 'brightness(1.02) contrast(1.05) saturate(0.95)',
};

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

    const body: ApplyFilterRequest = await req.json();
    const { imageUrl, filter, imageBase64 } = body;

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image URL or base64 data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!filter || !(filter in FILTER_DEFINITIONS)) {
      return new Response(
        JSON.stringify({ error: "Valid filter type required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If 'none' filter, return original
    if (filter === 'none') {
      const result: ApplyFilterResponse = {
        imageUrl: imageUrl || `data:image/png;base64,${imageBase64}`,
        filter: 'none',
      };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For actual filter application, we'll use canvas-based image processing
    // Since we're in Deno, we'll use a library or return a modified base64

    let base64Data: string;
    if (imageBase64) {
      base64Data = imageBase64;
    } else {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      base64Data = base64;
    }

    // Apply filter parameters to image metadata (client-side will handle actual rendering)
    // For now, return the image with filter metadata
    const result: ApplyFilterResponse = {
      imageUrl: `data:image/jpeg;base64,${base64Data}`,
      filter: filter,
    };

    // Log AI action
    try {
      const serviceRoleClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await serviceRoleClient.from("ai_agent_actions").insert({
        agent_id: null,
        action_type: "image_filter_application",
        input_data: { filter },
        output_data: { filterApplied: filter },
        execution_time_ms: 0,
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
    console.error("Filter application error:", error);

    return new Response(
      JSON.stringify({ error: "Failed to apply filter. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
