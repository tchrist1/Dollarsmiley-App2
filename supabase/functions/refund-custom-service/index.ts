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
      amount,
      reason
    } = await req.json();

    if (!paymentIntentId) {
      throw new Error("Missing required field: paymentIntentId");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new Error("Cannot refund: Payment not captured");
    }

    if (!paymentIntent.metadata.production_order_id) {
      throw new Error("Invalid payment intent: missing production order ID");
    }

    const { data: order } = await supabaseClient
      .from("production_orders")
      .select("customer_id, provider_id, refund_policy, final_price")
      .eq("id", paymentIntent.metadata.production_order_id)
      .single();

    if (!order) {
      throw new Error("Production order not found");
    }

    const isAdmin = user.user_metadata?.user_type === 'admin';
    if (!isAdmin && user.id !== order.customer_id && user.id !== order.provider_id) {
      throw new Error("Unauthorized: Only customer, provider, or admin can request refund");
    }

    if (order.refund_policy === 'non_refundable') {
      throw new Error("Order is non-refundable based on current status");
    }

    const refundAmount = amount || paymentIntent.amount;

    if (refundAmount > paymentIntent.amount) {
      throw new Error("Refund amount exceeds payment amount");
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount),
      reason: 'requested_by_customer',
      metadata: {
        production_order_id: paymentIntent.metadata.production_order_id,
        reason: reason || 'Customer requested refund',
      },
    });

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: order.customer_id,
        amount: refundAmount / 100,
        transaction_type: "Refund",
        status: "Completed",
        description: `Refund for custom service order: ${reason || 'Order cancelled'}`,
        stripe_payment_intent_id: paymentIntentId,
        metadata: {
          production_order_id: paymentIntent.metadata.production_order_id,
          refund_id: refund.id,
          reason,
        },
      });

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: order.provider_id,
        amount: -(refundAmount / 100),
        transaction_type: "Adjustment",
        status: "Completed",
        description: `Refund deduction for custom service order`,
        stripe_payment_intent_id: paymentIntentId,
        metadata: {
          production_order_id: paymentIntent.metadata.production_order_id,
          refund_id: refund.id,
        },
      });

    await supabaseClient
      .from("payout_schedules")
      .update({
        status: 'Cancelled',
      })
      .eq("related_booking_id", paymentIntent.metadata.production_order_id)
      .eq("status", "Scheduled");

    await supabaseClient
      .from("production_timeline_events")
      .insert({
        production_order_id: paymentIntent.metadata.production_order_id,
        event_type: "order_refunded",
        description: `Refund processed: $${(refundAmount / 100).toFixed(2)}`,
        metadata: {
          refund_id: refund.id,
          amount: refundAmount / 100,
          reason,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundedAmount: refundAmount / 100,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing refund:", error);
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