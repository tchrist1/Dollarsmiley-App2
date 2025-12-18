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
      customerId,
      providerId,
      amount,
      description,
      metadata = {}
    } = await req.json();

    if (!productionOrderId || !customerId || !providerId || !amount) {
      throw new Error("Missing required fields: productionOrderId, customerId, providerId, amount");
    }

    if (user.id !== customerId) {
      throw new Error("Unauthorized: Customer ID mismatch");
    }

    const { data: provider } = await supabaseClient
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", providerId)
      .single();

    if (!provider?.stripe_connect_account_id) {
      throw new Error("Provider Stripe account not connected");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: "usd",
      capture_method: "manual",
      metadata: {
        production_order_id: productionOrderId,
        customer_id: customerId,
        provider_id: providerId,
        order_type: "custom_service",
        ...metadata,
      },
      description: description || `Custom service order ${productionOrderId}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: customerId,
        amount: amount / 100,
        transaction_type: "Authorization",
        status: "Pending",
        description: `Authorization hold for custom service order`,
        stripe_payment_intent_id: paymentIntent.id,
        metadata: {
          production_order_id: productionOrderId,
          provider_id: providerId,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating authorization hold:", error);
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