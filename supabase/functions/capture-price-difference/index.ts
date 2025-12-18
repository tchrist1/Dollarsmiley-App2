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

    const { productionOrderId, customerId, amount, description } = await req.json();

    if (!productionOrderId || !customerId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get customer's Stripe ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", customerId)
      .single();

    if (!profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Customer payment profile not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    const defaultPaymentMethod = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

    if (!defaultPaymentMethod) {
      return new Response(
        JSON.stringify({ error: "No default payment method found", requiresPaymentMethod: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create PaymentIntent for the price difference with automatic capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      customer: profile.stripe_customer_id,
      payment_method: defaultPaymentMethod as string,
      off_session: true,
      confirm: true,
      capture_method: "automatic",
      description: description || "Price adjustment for custom service order",
      metadata: {
        production_order_id: productionOrderId,
        customer_id: customerId,
        type: "price_adjustment",
        payment_model: "escrow",
      },
    });

    // Record the additional escrow transaction
    await supabase.from("wallet_transactions").insert({
      user_id: customerId,
      type: "escrow_hold",
      amount: amount / 100,
      status: "completed",
      description: "Additional escrow for price adjustment",
      reference_type: "production_order",
      reference_id: productionOrderId,
      metadata: {
        payment_intent_id: paymentIntent.id,
        type: "price_adjustment",
      },
    });

    return new Response(
      JSON.stringify({
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        success: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error capturing price difference:", error);
    
    // Handle specific Stripe errors
    if (error.code === "authentication_required") {
      return new Response(
        JSON.stringify({ 
          error: "Payment requires authentication", 
          requiresAction: true,
          clientSecret: error.raw?.payment_intent?.client_secret 
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Failed to capture price difference" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});