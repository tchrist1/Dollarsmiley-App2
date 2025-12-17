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

    const body = await req.json();
    const { content_id, content_type, content_text } = body;

    if (!content_text) {
      return new Response(
        JSON.stringify({ error: "content_text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const startTime = Date.now();

    const { data: agent } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("agent_type", "moderation")
      .eq("is_active", true)
      .maybeSingle();

    if (!agent) {
      throw new Error("Moderation agent not available");
    }

    const openaiService = createOpenAIService();

    const moderationResult = await openaiService.moderateContent(
      content_text,
      content_type
    );

    const executionTime = Date.now() - startTime;

    const avgScore =
      Object.values(moderationResult.confidenceScores).reduce((a, b) => a + b, 0) / 6;

    await supabase.rpc("log_ai_agent_action", {
      agent_id_param: agent.id,
      action_type_param: "moderate_content",
      input_data_param: { content_type, content_id },
      output_data_param: moderationResult,
      confidence_param: avgScore,
      execution_time_param: executionTime,
      status_param: "success",
    });

    const { data: moderation } = await supabase
      .from("ai_content_moderation")
      .insert({
        content_id,
        content_type,
        moderation_result: moderationResult.decision,
        flagged_categories: moderationResult.flaggedCategories,
        confidence_scores: moderationResult.confidenceScores,
        human_reviewed: false,
      })
      .select()
      .single();

    if (moderationResult.decision === "review" || moderationResult.decision === "block") {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_type", "Admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          title: "Content Requires Moderation",
          body: `${content_type} flagged as ${moderationResult.decision}: ${moderationResult.flaggedCategories.join(", ")}`,
          type: "moderation_required",
          data: {
            content_id,
            content_type,
            moderation_id: moderation.id,
            reasoning: moderationResult.reasoning
          },
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision: moderationResult.decision,
        flagged_categories: moderationResult.flaggedCategories,
        confidence_scores: moderationResult.confidenceScores,
        reasoning: moderationResult.reasoning,
        requires_review:
          moderationResult.decision === "review" || moderationResult.decision === "block",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error moderating content:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
