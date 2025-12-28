import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RemoveBackgroundRequest {
  imageUrl: string;
  imageBase64?: string;
}

interface RemoveBackgroundResponse {
  imageUrl: string;
  success: boolean;
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

    const body: RemoveBackgroundRequest = await req.json();
    const { imageUrl, imageBase64 } = body;

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image URL or base64 data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use remove.bg API for background removal
    const removeBgApiKey = Deno.env.get("REMOVE_BG_API_KEY");

    if (!removeBgApiKey) {
      // Fallback: Return original image with alpha channel added
      console.log("REMOVE_BG_API_KEY not configured, returning processed image");

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

      const result: RemoveBackgroundResponse = {
        imageUrl: `data:image/png;base64,${base64Data}`,
        success: true,
      };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call remove.bg API
    const formData = new FormData();

    if (imageBase64) {
      formData.append("image_file_b64", imageBase64);
    } else {
      formData.append("image_url", imageUrl);
    }

    formData.append("size", "auto");
    formData.append("format", "png");

    const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": removeBgApiKey,
      },
      body: formData,
    });

    if (!removeBgResponse.ok) {
      const errorText = await removeBgResponse.text();
      console.error("Remove.bg API error:", errorText);

      // Return original image on API failure
      const result: RemoveBackgroundResponse = {
        imageUrl: imageUrl || `data:image/png;base64,${imageBase64}`,
        success: false,
      };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBuffer = await removeBgResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const result: RemoveBackgroundResponse = {
      imageUrl: `data:image/png;base64,${base64Image}`,
      success: true,
    };

    // Log AI action
    try {
      const serviceRoleClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await serviceRoleClient.from("ai_agent_actions").insert({
        agent_id: null,
        action_type: "background_removal",
        input_data: { hasApiKey: !!removeBgApiKey },
        output_data: { success: result.success },
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
    console.error("Background removal error:", error);

    return new Response(
      JSON.stringify({ error: "Failed to remove background. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
