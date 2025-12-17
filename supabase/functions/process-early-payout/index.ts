import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const { scheduleId } = await req.json();

    if (!scheduleId) {
      return new Response(
        JSON.stringify({ error: "Schedule ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: schedule, error: fetchError } = await supabaseClient
      .from("payout_schedules")
      .select(`
        *,
        bookings:booking_id (
          customer_id,
          provider_id,
          status
        ),
        escrow_holds:escrow_hold_id (
          id,
          status,
          provider_payout
        )
      `)
      .eq("id", scheduleId)
      .single();

    if (fetchError || !schedule) {
      return new Response(
        JSON.stringify({ error: "Payout schedule not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (schedule.payout_status !== "Processing") {
      return new Response(
        JSON.stringify({
          error: "Payout is not in processing status",
          status: schedule.payout_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    const earlyEligible = new Date(schedule.early_payout_eligible_at);

    if (now < earlyEligible) {
      return new Response(
        JSON.stringify({
          error: "Not yet eligible for early payout",
          eligible_at: schedule.early_payout_eligible_at,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: disputes } = await supabaseClient
      .from("disputes")
      .select("id, status")
      .eq("booking_id", schedule.booking_id)
      .in("status", ["Open", "UnderReview"]);

    if (disputes && disputes.length > 0) {
      await supabaseClient
        .from("payout_schedules")
        .update({
          payout_status: "Pending",
          early_payout_requested: false,
        })
        .eq("id", scheduleId);

      return new Response(
        JSON.stringify({
          error: "Cannot process early payout: active disputes exist",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const escrowHold = schedule.escrow_holds;
    if (!escrowHold || escrowHold.status !== "Held") {
      return new Response(
        JSON.stringify({
          error: "Escrow not in held status",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: escrowError } = await supabaseClient
      .from("escrow_holds")
      .update({
        status: "Released",
        released_at: new Date().toISOString(),
      })
      .eq("id", escrowHold.id);

    if (escrowError) {
      throw escrowError;
    }

    const { error: payoutError } = await supabaseClient
      .from("payout_schedules")
      .update({
        payout_status: "Completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", scheduleId);

    if (payoutError) {
      throw payoutError;
    }

    const { data: wallet } = await supabaseClient
      .from("wallets")
      .select("id")
      .eq("user_id", schedule.provider_id)
      .single();

    if (wallet) {
      await supabaseClient.from("transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "Payout",
        amount: schedule.payout_amount,
        status: "Completed",
        description: `Early payout for ${schedule.transaction_type} #${schedule.booking_id.slice(0, 8)}`,
        booking_id: schedule.booking_id,
        escrow_hold_id: escrowHold.id,
      });

      await supabaseClient.rpc("update_wallet_balance", {
        p_wallet_id: wallet.id,
        p_amount: schedule.payout_amount,
      });
    }

    await supabaseClient
      .from("bookings")
      .update({ escrow_status: "Released" })
      .eq("id", schedule.booking_id);

    await supabaseClient.from("notifications").insert({
      user_id: schedule.provider_id,
      type: "EarlyPayoutCompleted",
      title: "Early Payout Processed",
      message: `Your early payout of $${schedule.payout_amount.toFixed(2)} has been processed`,
      data: {
        booking_id: schedule.booking_id,
        payout_id: schedule.id,
        amount: schedule.payout_amount,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Early payout processed successfully",
        payout_amount: schedule.payout_amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing early payout:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});