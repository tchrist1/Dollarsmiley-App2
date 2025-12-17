import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { bookingId, amount, reason, disputeId } = await req.json();

    if (!bookingId || !amount || !reason) {
      throw new Error("Missing required fields");
    }

    const { data: booking } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.customer_id !== user.id) {
      throw new Error("Only customer can request refund");
    }

    if (booking.status === "Completed") {
      throw new Error("Cannot refund completed booking");
    }

    const { data: escrowHold } = await supabaseClient
      .from("escrow_holds")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "Held")
      .single();

    if (!escrowHold) {
      throw new Error("No active escrow hold found");
    }

    if (amount > escrowHold.amount) {
      throw new Error("Refund amount exceeds escrow hold");
    }

    const { data: refundRequest } = await supabaseClient
      .from("refunds")
      .insert({
        booking_id: bookingId,
        escrow_hold_id: escrowHold.id,
        dispute_id: disputeId || null,
        amount,
        reason,
        status: amount > 100 ? "Pending" : "Pending",
        requested_by: user.id,
      })
      .select()
      .single();

    await supabaseClient
      .from("bookings")
      .update({
        refund_requested: true,
      })
      .eq("id", bookingId);

    if (amount <= 100) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: escrowHold.stripe_payment_intent_id,
          amount: Math.round(amount * 100),
          reason: "requested_by_customer",
          metadata: {
            bookingId,
            refundRequestId: refundRequest.id,
          },
        });

        await supabaseClient
          .from("refunds")
          .update({
            status: "Completed",
            stripe_refund_id: refund.id,
            processed_at: new Date().toISOString(),
          })
          .eq("id", refundRequest.id);

        await supabaseClient
          .from("escrow_holds")
          .update({
            status: "Refunded",
            amount: escrowHold.amount - amount,
          })
          .eq("id", escrowHold.id);

        await supabaseClient
          .from("bookings")
          .update({
            escrow_status: "Refunded",
            status: "Cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        await supabaseClient
          .from("wallet_transactions")
          .insert({
            user_id: user.id,
            amount,
            transaction_type: "Refund",
            status: "Completed",
            description: `Refund for booking ${bookingId}`,
            related_booking_id: bookingId,
            refund_id: refundRequest.id,
          });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Refund processed successfully",
            refundId: refund.id,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (error) {
        await supabaseClient
          .from("refunds")
          .update({
            status: "Failed",
            notes: error.message,
          })
          .eq("id", refundRequest.id);

        throw new Error(`Refund failed: ${error.message}`);
      }
    } else {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Refund request submitted for admin approval",
          refundRequestId: refundRequest.id,
          requiresApproval: true,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});