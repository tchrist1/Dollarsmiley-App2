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
      productionOrderId,
      paymentIntentId,
      amountToCapture
    } = await req.json();

    if (!productionOrderId || !paymentIntentId || !amountToCapture) {
      throw new Error("Missing required fields: productionOrderId, paymentIntentId, amountToCapture");
    }

    const { data: order, error: orderError } = await supabaseClient
      .from("production_orders")
      .select("provider_id, customer_id, status")
      .eq("id", productionOrderId)
      .single();

    if (orderError || !order) {
      throw new Error("Production order not found");
    }

    if (user.id !== order.provider_id) {
      throw new Error("Unauthorized: Only provider can capture payment");
    }

    if (order.status !== 'price_approved') {
      throw new Error("Order must have approved price before capture");
    }

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: Math.round(amountToCapture),
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment capture failed: ${paymentIntent.status}`);
    }

    const { data: provider } = await supabaseClient
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", order.provider_id)
      .single();

    if (provider?.stripe_connect_account_id) {
      const platformFee = Math.round(amountToCapture * 0.15);
      const providerAmount = amountToCapture - platformFee;

      await supabaseClient
        .from("payout_schedules")
        .insert({
          provider_id: order.provider_id,
          transaction_type: 'CustomService',
          amount: providerAmount / 100,
          platform_fee: platformFee / 100,
          scheduled_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Scheduled',
          related_booking_id: productionOrderId,
        });
    }

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: order.customer_id,
        amount: -(amountToCapture / 100),
        transaction_type: "Payment",
        status: "Completed",
        description: `Payment captured for custom service order`,
        stripe_payment_intent_id: paymentIntent.id,
        metadata: {
          production_order_id: productionOrderId,
          provider_id: order.provider_id,
        },
      });

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: order.provider_id,
        amount: (amountToCapture / 100),
        transaction_type: "Earning",
        status: "Pending",
        description: `Earnings from custom service order (14-day hold)`,
        stripe_payment_intent_id: paymentIntent.id,
        metadata: {
          production_order_id: productionOrderId,
          customer_id: order.customer_id,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        capturedAmount: amountToCapture / 100,
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
    console.error("Error capturing payment:", error);
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