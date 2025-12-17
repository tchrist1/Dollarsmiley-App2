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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date().toISOString().split('T')[0];

    const { data: pendingPayouts, error: fetchError } = await supabaseClient
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
      .eq("payout_status", "Pending")
      .lte("scheduled_payout_date", today)
      .lte("eligible_for_payout_at", new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const payout of pendingPayouts || []) {
      try {
        const { data: disputes } = await supabaseClient
          .from("disputes")
          .select("id, status")
          .eq("booking_id", payout.booking_id)
          .in("status", ["Open", "UnderReview"]);

        if (disputes && disputes.length > 0) {
          results.errors.push(
            `Payout ${payout.id} has active disputes, skipping`
          );
          continue;
        }

        const escrowHold = payout.escrow_holds;
        if (!escrowHold || escrowHold.status !== "Held") {
          results.errors.push(
            `Payout ${payout.id} escrow not in held status, skipping`
          );
          continue;
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
          .eq("id", payout.id);

        if (payoutError) {
          throw payoutError;
        }

        const { data: wallet } = await supabaseClient
          .from("wallets")
          .select("id")
          .eq("user_id", payout.provider_id)
          .single();

        if (wallet) {
          await supabaseClient.from("transactions").insert({
            wallet_id: wallet.id,
            transaction_type: "Payout",
            amount: payout.payout_amount,
            status: "Completed",
            description: `Automatic payout for ${payout.transaction_type} #${payout.booking_id.slice(0, 8)}`,
            booking_id: payout.booking_id,
            escrow_hold_id: escrowHold.id,
          });

          await supabaseClient.rpc("update_wallet_balance", {
            p_wallet_id: wallet.id,
            p_amount: payout.payout_amount,
          });
        }

        await supabaseClient
          .from("bookings")
          .update({ escrow_status: "Released" })
          .eq("id", payout.booking_id);

        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: payout.provider_id,
            type: "PayoutCompleted",
            title: "Payout Processed",
            message: `Your payout of $${payout.payout_amount.toFixed(2)} has been processed`,
            data: {
              booking_id: payout.booking_id,
              payout_id: payout.id,
              amount: payout.payout_amount,
            },
          });

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }

        results.processed++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Failed to process payout ${payout.id}: ${error.message}`
        );
        console.error(`Error processing payout ${payout.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} payouts, ${results.failed} failed`,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in scheduled payout processing:", error);
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