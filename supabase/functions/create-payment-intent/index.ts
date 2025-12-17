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

    const { amount, bookingId, currency = "usd", paymentMethod = "card" } = await req.json();

    if (!amount || !bookingId) {
      throw new Error("Missing required fields: amount, bookingId");
    }

    const { data: booking } = await supabaseClient
      .from("bookings")
      .select("provider_id, platform_fee, provider_payout")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    const paymentIntentParams: any = {
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        bookingId,
        userId: user.id,
        providerId: booking.provider_id,
        paymentMethod,
      },
    };

    if (paymentMethod === 'paypal') {
      paymentIntentParams.payment_method_types = ['paypal'];
    } else if (paymentMethod === 'cashapp') {
      paymentIntentParams.payment_method_types = ['cashapp'];
    } else if (paymentMethod === 'venmo') {
      paymentIntentParams.payment_method_types = ['us_bank_account'];
      paymentIntentParams.payment_method_options = {
        us_bank_account: {
          verification_method: 'instant',
        },
      };
    } else if (paymentMethod === 'card') {
      paymentIntentParams.automatic_payment_methods = {
        enabled: true,
      };
    } else {
      paymentIntentParams.automatic_payment_methods = {
        enabled: true,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount,
        transaction_type: "Payment",
        status: "Pending",
        description: `Payment for booking ${bookingId}`,
        payment_method: paymentMethod,
        stripe_payment_intent_id: paymentIntent.id,
        related_booking_id: bookingId,
      });

    await supabaseClient
      .from("bookings")
      .update({
        payment_method: paymentMethod,
        payment_method_details: {
          stripe_payment_intent_id: paymentIntent.id,
        },
      })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
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