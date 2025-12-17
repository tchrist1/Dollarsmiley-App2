import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PendingReviewPrompt {
  id: string;
  booking_id: string;
  booking_title: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  provider_id: string;
  provider_name: string;
  prompt_sent_at: string;
  hours_since_prompt: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting review reminder job...");

    // Get pending review prompts (>24h old, no reminder sent)
    const { data: pendingPrompts, error: fetchError } = await supabase.rpc(
      "get_pending_review_prompts"
    );

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingPrompts?.length || 0} pending review prompts for reminders`);

    let remindersSent = 0;
    let remindersFailed = 0;
    let remindersSkipped = 0;

    for (const prompt of (pendingPrompts as PendingReviewPrompt[]) || []) {
      console.log(
        `Processing review prompt for booking ${prompt.booking_id} (${prompt.hours_since_prompt}h since prompt)`
      );

      try {
        // Check if customer wants review reminders
        const { data: preferences } = await supabase
          .from("profiles")
          .select("review_prompt_preferences")
          .eq("id", prompt.customer_id)
          .single();

        const prefs = preferences?.review_prompt_preferences || {
          enabled: true,
          reminder_enabled: true,
        };

        if (!prefs.enabled || !prefs.reminder_enabled) {
          console.log(`⊘ Skipped reminder (user preferences): ${prompt.customer_name}`);
          remindersSkipped++;
          continue;
        }

        // Send reminder using database function
        const { data: sent, error: sendError } = await supabase.rpc("send_review_reminder", {
          prompt_id_param: prompt.id,
        });

        if (sendError) {
          console.error("Failed to send reminder:", sendError);
          remindersFailed++;
        } else if (sent) {
          remindersSent++;
          console.log(`✓ Sent review reminder to: ${prompt.customer_name}`);
        } else {
          remindersFailed++;
          console.log(`✗ Failed to send reminder to: ${prompt.customer_name}`);
        }
      } catch (promptError) {
        console.error(`Error processing prompt ${prompt.id}:`, promptError);
        remindersFailed++;
      }
    }

    // Expire old prompts (>7 days)
    console.log("Expiring old review prompts...");
    const { data: expiredCount, error: expireError } = await supabase.rpc(
      "expire_old_review_prompts"
    );

    if (expireError) {
      console.error("Error expiring prompts:", expireError);
    } else {
      console.log(`Expired ${expiredCount || 0} old prompts`);
    }

    const result = {
      success: true,
      message: `Sent ${remindersSent} review reminders`,
      details: {
        prompts_checked: pendingPrompts?.length || 0,
        reminders_sent: remindersSent,
        reminders_failed: remindersFailed,
        reminders_skipped: remindersSkipped,
        prompts_expired: expiredCount || 0,
      },
    };

    console.log("Review reminder job completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in review reminders job:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
