import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RefundRequest {
  booking_id: string;
  cancellation_id: string;
  refund_amount: number;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { booking_id, cancellation_id, refund_amount, reason }: RefundRequest =
      await req.json();

    console.log("Processing automatic refund:", {
      booking_id,
      cancellation_id,
      refund_amount,
    });

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        customer:profiles!bookings_customer_id_fkey(id, full_name, email),
        provider:profiles!bookings_provider_id_fkey(id, full_name, email)
      `
      )
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Check if booking has a payment intent
    if (!booking.payment_intent_id) {
      throw new Error("No payment intent found for this booking");
    }

    // Calculate refund amount (ensure it's in cents)
    const refundAmountCents = Math.round(refund_amount * 100);

    console.log("Creating Stripe refund:", {
      payment_intent: booking.payment_intent_id,
      amount_cents: refundAmountCents,
    });

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      amount: refundAmountCents,
      reason: reason || "requested_by_customer",
      metadata: {
        booking_id: booking_id,
        cancellation_id: cancellation_id,
        customer_id: booking.customer_id,
        provider_id: booking.provider_id,
      },
    });

    console.log("Stripe refund created:", refund.id);

    // Update cancellation record
    const { error: updateError } = await supabase
      .from("booking_cancellations")
      .update({
        refund_status: "Completed",
        refund_amount: refund_amount,
      })
      .eq("id", cancellation_id);

    if (updateError) {
      console.error("Error updating cancellation:", updateError);
    }

    // Update booking payment status
    await supabase
      .from("bookings")
      .update({
        payment_status: refund_amount >= booking.price ? "Refunded" : "PartiallyRefunded",
      })
      .eq("id", booking_id);

    // Create wallet transaction for tracking
    await supabase.from("wallet_transactions").insert({
      user_id: booking.customer_id,
      amount: refund_amount,
      transaction_type: "Refund",
      status: "Completed",
      reference_type: "Booking",
      reference_id: booking_id,
      description: `Refund for cancelled booking: ${booking.title}`,
      metadata: {
        refund_id: refund.id,
        cancellation_id: cancellation_id,
        original_amount: booking.price,
      },
    });

    // Send notification to customer
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Refund Processed",
      message: `Your refund of $${refund_amount.toFixed(
        2
      )} has been processed for "${booking.title}". It will appear in your account within 5-7 business days.`,
      type: "payment",
      data: {
        booking_id: booking_id,
        refund_id: refund.id,
        amount: refund_amount,
      },
    });

    // Send notification to provider
    await supabase.from("notifications").insert({
      user_id: booking.provider_id,
      title: "Booking Refunded",
      message: `A refund of $${refund_amount.toFixed(2)} has been processed for cancelled booking "${
        booking.title
      }".`,
      type: "booking",
      data: {
        booking_id: booking_id,
        refund_id: refund.id,
        amount: refund_amount,
      },
    });

    console.log("Refund processed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: refund.id,
        amount: refund_amount,
        status: refund.status,
        message: "Refund processed successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error processing refund:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
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
