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

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      throw new Error("Missing paymentIntentId");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment not successful");
    }

    const bookingId = paymentIntent.metadata.bookingId;
    const userId = paymentIntent.metadata.userId;
    const providerId = paymentIntent.metadata.providerId;

    const { data: booking } = await supabaseClient
      .from("bookings")
      .select("price, platform_fee, provider_payout")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    await supabaseClient
      .from("bookings")
      .update({
        payment_status: "Paid",
        status: "Confirmed",
        escrow_status: "Held",
        can_complete: true,
      })
      .eq("id", bookingId);

    await supabaseClient
      .from("wallet_transactions")
      .update({
        status: "Completed",
      })
      .eq("stripe_payment_intent_id", paymentIntentId);

    const { data: escrowHold } = await supabaseClient
      .from("escrow_holds")
      .insert({
        booking_id: bookingId,
        customer_id: userId,
        provider_id: providerId,
        amount: booking.price,
        platform_fee: booking.platform_fee,
        provider_payout: booking.provider_payout,
        stripe_payment_intent_id: paymentIntentId,
        status: "Held",
      })
      .select()
      .single();

    await supabaseClient
      .from("wallet_transactions")
      .update({
        escrow_hold_id: escrowHold.id,
      })
      .eq("stripe_payment_intent_id", paymentIntentId);

    const { data: bookingDetails } = await supabaseClient
      .from("bookings")
      .select("title, scheduled_date, price")
      .eq("id", bookingId)
      .single();

    const notificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;

    await fetch(notificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        userId,
        type: "BookingConfirmed",
        title: "Booking Confirmed!",
        body: `Your booking for "${bookingDetails?.title}" on ${bookingDetails?.scheduled_date} has been confirmed.`,
        data: {
          bookingId,
          amount: booking.price,
        },
        actionUrl: `/booking/${bookingId}`,
        priority: "high",
      }),
    });

    await fetch(notificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        userId: providerId,
        type: "PaymentHeldInEscrow",
        title: "New Booking Payment",
        body: `Payment of $${booking.price} for "${bookingDetails?.title}" is held in escrow. Complete the booking to receive payout.`,
        data: {
          bookingId,
          amount: booking.provider_payout,
          escrowHoldId: escrowHold.id,
        },
        actionUrl: `/booking/${bookingId}`,
        priority: "high",
      }),
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        escrowHoldId: escrowHold.id,
        message: "Payment held in escrow until booking completion"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
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