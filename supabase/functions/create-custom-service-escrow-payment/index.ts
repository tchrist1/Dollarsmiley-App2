import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const {
      productionOrderId,
      customerId,
      providerId,
      amount,
      description,
      consultationRequested,
      metadata,
    } = await req.json();

    if (!productionOrderId || !customerId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", customerId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const { data: userData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", customerId)
        .single();

      const customer = await stripe.customers.create({
        email: userData?.email,
        name: userData?.full_name,
        metadata: { user_id: customerId },
      });

      stripeCustomerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", customerId);
    }

    // Create PaymentIntent with immediate capture (escrow model)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      customer: stripeCustomerId,
      capture_method: "automatic", // Capture immediately for escrow
      description: description || "Custom Service Order",
      metadata: {
        ...metadata,
        production_order_id: productionOrderId,
        customer_id: customerId,
        provider_id: providerId,
        order_type: "custom_service",
        payment_model: "escrow",
        consultation_requested: consultationRequested ? "true" : "false",
      },
    });

    // Create wallet transaction for escrow hold
    await supabase.from("wallet_transactions").insert({
      user_id: customerId,
      type: "escrow_hold",
      amount: amount / 100,
      status: "completed",
      description: `Escrow hold for custom service order`,
      reference_type: "production_order",
      reference_id: productionOrderId,
      metadata: {
        payment_intent_id: paymentIntent.id,
        provider_id: providerId,
      },
    });

    return new Response(
      JSON.stringify({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating escrow payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create escrow payment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});