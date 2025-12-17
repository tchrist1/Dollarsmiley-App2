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

    const { depositPaymentId, paymentMethod = "card" } = await req.json();

    if (!depositPaymentId) {
      throw new Error("Missing required field: depositPaymentId");
    }

    const { data: depositPayment } = await supabaseClient
      .from("deposit_payments")
      .select("*, bookings!deposit_payments_booking_id_fkey(*)")
      .eq("id", depositPaymentId)
      .eq("customer_id", user.id)
      .single();

    if (!depositPayment) {
      throw new Error("Deposit payment not found or unauthorized");
    }

    if (depositPayment.balance_status !== "Pending") {
      throw new Error("Balance payment already processed");
    }

    if (depositPayment.balance_amount <= 0) {
      throw new Error("No balance amount due");
    }

    const paymentIntentParams: any = {
      amount: Math.round(depositPayment.balance_amount * 100),
      currency: "usd",
      metadata: {
        depositPaymentId,
        bookingId: depositPayment.booking_id,
        userId: user.id,
        providerId: depositPayment.provider_id,
        paymentType: "balance",
      },
    };

    if (paymentMethod === "paypal") {
      paymentIntentParams.payment_method_types = ["paypal"];
    } else if (paymentMethod === "cashapp") {
      paymentIntentParams.payment_method_types = ["cashapp"];
    } else {
      paymentIntentParams.automatic_payment_methods = {
        enabled: true,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    await supabaseClient
      .from("deposit_payments")
      .update({
        stripe_balance_intent_id: paymentIntent.id,
      })
      .eq("id", depositPaymentId);

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: depositPayment.balance_amount,
        transaction_type: "Payment",
        status: "Pending",
        description: `Balance payment for booking ${depositPayment.booking_id}`,
        payment_method: paymentMethod,
        stripe_payment_intent_id: paymentIntent.id,
        related_booking_id: depositPayment.booking_id,
      });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        balanceAmount: depositPayment.balance_amount,
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