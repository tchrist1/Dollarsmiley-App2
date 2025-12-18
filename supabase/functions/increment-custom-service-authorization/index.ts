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
      incrementAmount,
      reason
    } = await req.json();

    if (!paymentIntentId || !incrementAmount) {
      throw new Error("Missing required fields: paymentIntentId, incrementAmount");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.metadata.production_order_id) {
      throw new Error("Invalid payment intent: missing production order ID");
    }

    const { data: order } = await supabaseClient
      .from("production_orders")
      .select("customer_id")
      .eq("id", paymentIntent.metadata.production_order_id)
      .single();

    if (!order || user.id !== order.customer_id) {
      throw new Error("Unauthorized: Only customer can approve price increase");
    }

    try {
      await stripe.paymentIntents.incrementAuthorization(paymentIntentId, {
        amount: Math.round(incrementAmount),
        description: reason || "Price increase approved by customer",
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Authorization incremented successfully",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (stripeError: any) {
      if (stripeError.code === 'amount_too_large' || stripeError.code === 'payment_intent_incompatible_payment_method') {
        return new Response(
          JSON.stringify({
            success: false,
            requiresNewAuthorization: true,
            error: "Cannot increment authorization. New authorization required.",
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
      throw stripeError;
    }
  } catch (error) {
    console.error("Error incrementing authorization:", error);
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