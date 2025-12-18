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

    const {
      paymentIntentId,
      reason
    } = await req.json();

    if (!paymentIntentId) {
      throw new Error("Missing required field: paymentIntentId");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.metadata.production_order_id) {
      throw new Error("Invalid payment intent: missing production order ID");
    }

    const { data: order } = await supabaseClient
      .from("production_orders")
      .select("customer_id, provider_id, authorization_amount")
      .eq("id", paymentIntent.metadata.production_order_id)
      .single();

    if (!order) {
      throw new Error("Production order not found");
    }

    if (user.id !== order.customer_id && user.id !== order.provider_id) {
      throw new Error("Unauthorized: Only customer or provider can cancel");
    }

    if (paymentIntent.status === 'succeeded') {
      throw new Error("Cannot cancel: Payment already captured");
    }

    const canceledIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer',
    });

    await supabaseClient
      .from("wallet_transactions")
      .update({
        status: "Cancelled",
        description: `Authorization hold cancelled: ${reason || 'Order cancelled'}`,
      })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("transaction_type", "Authorization");

    await supabaseClient
      .from("production_timeline_events")
      .insert({
        production_order_id: paymentIntent.metadata.production_order_id,
        event_type: "authorization_cancelled",
        description: `Authorization hold released: ${reason || 'Order cancelled'}`,
        metadata: {
          payment_intent_id: paymentIntentId,
          cancelled_by: user.id,
          reason,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Authorization cancelled and hold released",
        paymentIntentId: canceledIntent.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error cancelling authorization:", error);
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