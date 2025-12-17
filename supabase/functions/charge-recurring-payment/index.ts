import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PaymentRequest {
  payment_id: string;
  payment_method_id: string;
  amount: number;
  currency: string;
  customer_id: string;
}

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
      apiVersion: "2023-10-16",
    });

    const {
      payment_id,
      payment_method_id,
      amount,
      currency,
      customer_id,
    }: PaymentRequest = await req.json();

    // Validate input
    if (!payment_id || !payment_method_id || !amount || !currency || !customer_id) {
      throw new Error("Missing required fields");
    }

    // Get or create Stripe customer
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // Get user's Stripe customer ID
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${customer_id}`, {
      headers: {
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    });

    const users = await userResponse.json();
    let stripeCustomerId = users[0]?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: {
          supabase_user_id: customer_id,
        },
      });

      stripeCustomerId = customer.id;

      // Update user profile with Stripe customer ID
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${customer_id}`, {
        method: "PATCH",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          stripe_customer_id: stripeCustomerId,
        }),
      });
    }

    // Attach payment method to customer if not already attached
    try {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: stripeCustomerId,
      });
    } catch (error: any) {
      // Payment method might already be attached, continue
      if (error.code !== "resource_missing") {
        console.log("Payment method already attached or error:", error.message);
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      payment_method: payment_method_id,
      off_session: true, // Indicates customer is not present
      confirm: true, // Automatically confirm
      metadata: {
        payment_id,
        customer_id,
        type: "recurring_booking",
      },
    });

    // Check payment status
    if (paymentIntent.status === "succeeded") {
      // Update payment record in database
      await fetch(
        `${supabaseUrl}/rest/v1/rpc/handle_recurring_payment_success`,
        {
          method: "POST",
          headers: {
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_payment_id: payment_id,
            p_payment_intent_id: paymentIntent.id,
          }),
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else if (
      paymentIntent.status === "requires_action" ||
      paymentIntent.status === "requires_payment_method"
    ) {
      // Payment requires additional action (e.g., 3D Secure)
      throw new Error(
        "Payment requires additional authentication. Please use a different payment method or complete authentication."
      );
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }
  } catch (error: any) {
    console.error("Error processing recurring payment:", error);

    // Extract error message
    let errorMessage = error.message || "Unknown error occurred";
    if (error.type === "StripeCardError") {
      errorMessage = error.message;
    }

    // Update payment as failed in database
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const body = await req.clone().json();

      if (supabaseUrl && supabaseServiceKey && body.payment_id) {
        await fetch(
          `${supabaseUrl}/rest/v1/rpc/handle_recurring_payment_failure`,
          {
            method: "POST",
            headers: {
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              p_payment_id: body.payment_id,
              p_failure_reason: errorMessage,
            }),
          }
        );
      }
    } catch (dbError) {
      console.error("Error updating database:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
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
