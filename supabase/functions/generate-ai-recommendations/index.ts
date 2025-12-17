import { createClient } from "npm:@supabase/supabase-js@2";
import { createOpenAIService } from "../_shared/openai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { limit = 10 } = body;

    const startTime = Date.now();

    const { data: recentSearches } = await supabase
      .from("search_queries")
      .select("query_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("listings(category, subcategory)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: savedListings } = await supabase
      .from("saved_listings")
      .select("listings(category, subcategory)")
      .eq("user_id", user.id)
      .limit(5);

    const { data: availableListings } = await supabase
      .from("service_listings")
      .select("id, title, category, subcategory, description, rating, price")
      .eq("status", "active")
      .limit(50);

    if (!availableListings || availableListings.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userBehavior = {
      recentSearches: (recentSearches || []).map((s: any) => s.query_text),
      recentBookings: (recentBookings || [])
        .filter((b: any) => b.listings)
        .map((b: any) => ({
          category: b.listings.category,
          subcategory: b.listings.subcategory,
        })),
      savedListings: (savedListings || [])
        .filter((s: any) => s.listings)
        .map((s: any) => ({
          category: s.listings.category,
          subcategory: s.listings.subcategory,
        })),
    };

    const openaiService = createOpenAIService();

    const recommendations = await openaiService.generateRecommendations(
      user.id,
      userBehavior,
      availableListings
    );

    const executionTime = Date.now() - startTime;

    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id")
      .eq("agent_type", "recommendation")
      .eq("is_active", true)
      .maybeSingle();

    if (agent) {
      await supabase.rpc("log_ai_agent_action", {
        agent_id_param: agent.id,
        action_type_param: "generate_recommendations",
        input_data_param: { user_id: user.id, behavior_summary: userBehavior },
        output_data_param: { count: recommendations.length },
        execution_time_param: executionTime,
        status_param: "success",
      });
    }

    for (const rec of recommendations.slice(0, limit)) {
      await supabase.from("ai_recommendations").insert({
        user_id: user.id,
        recommendation_type: "listing",
        recommended_item_id: rec.listingId,
        recommended_item_type: "service_listing",
        reasoning: rec.reasoning,
        confidence_score: rec.score,
        metadata: { generated_by: "gpt-4o-mini" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: recommendations.slice(0, limit),
        count: recommendations.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});