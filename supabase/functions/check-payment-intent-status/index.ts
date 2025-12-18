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

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      throw new Error("Missing required field: paymentIntentId");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.metadata.production_order_id) {
      throw new Error("Invalid payment intent: missing production order ID");
    }

    const { data: order } = await supabaseClient
      .from("production_orders")
      .select("customer_id, provider_id")
      .eq("id", paymentIntent.metadata.production_order_id)
      .single();

    if (!order) {
      throw new Error("Production order not found");
    }

    if (user.id !== order.customer_id && user.id !== order.provider_id) {
      throw new Error("Unauthorized: Only customer or provider can check status");
    }

    const isValid = paymentIntent.status === 'requires_capture';
    const isExpired = paymentIntent.status === 'canceled' || 
                      (paymentIntent.canceled_at !== null);
    
    let expiresAt = null;
    if (paymentIntent.created && paymentIntent.status === 'requires_capture') {
      expiresAt = paymentIntent.created + (7 * 24 * 60 * 60);
    }

    const statusDetails = {
      status: paymentIntent.status,
      isValid,
      isExpired,
      isCaptured: paymentIntent.status === 'succeeded',
      isCanceled: paymentIntent.status === 'canceled',
      expiresAt,
      authorizedAmount: paymentIntent.amount / 100,
      capturedAmount: paymentIntent.amount_capturable ? 0 : paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata,
    };

    const needsReauthorization = isExpired || 
      (expiresAt && expiresAt < (Date.now() / 1000)) ||
      (paymentIntent.status !== 'requires_capture' && paymentIntent.status !== 'succeeded');

    return new Response(
      JSON.stringify({
        success: true,
        ...statusDetails,
        needsReauthorization,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error checking payment intent status:", error);
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