import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    // Call the database function to check thresholds
    const { error } = await supabase.rpc("check_demo_listing_thresholds");

    if (error) {
      throw error;
    }

    // Get statistics after check
    const { data: metadata } = await supabase
      .from("demo_listings_metadata")
      .select("is_active");

    const { data: thresholds } = await supabase
      .from("demo_listing_thresholds")
      .select("demo_deactivated, subcategory_id, listing_type, current_real_count, threshold_count");

    const totalDemoListings = metadata?.length || 0;
    const activeDemoListings = metadata?.filter(m => m.is_active).length || 0;
    const deactivatedDemoListings = metadata?.filter(m => !m.is_active).length || 0;
    const thresholdsReached = thresholds?.filter(t => t.demo_deactivated).length || 0;

    // Get recently deactivated listings
    const { data: recentlyDeactivated } = await supabase
      .from("demo_listing_log")
      .select("*")
      .eq("event_type", "BulkDeactivation")
      .order("created_at", { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        success: true,
        statistics: {
          totalDemoListings,
          activeDemoListings,
          deactivatedDemoListings,
          thresholdsReached,
          totalThresholds: thresholds?.length || 0,
        },
        recentDeactivations: recentlyDeactivated || [],
        thresholds: thresholds || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking demo thresholds:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
