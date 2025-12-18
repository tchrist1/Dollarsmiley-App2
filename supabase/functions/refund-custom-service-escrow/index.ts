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

    const { productionOrderId, paymentIntentId, amount, reason } = await req.json();

    if (!productionOrderId || !paymentIntentId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the order details
    const { data: order, error: orderError } = await supabase
      .from("production_orders")
      .select("*")
      .eq("id", productionOrderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.escrow_released_at) {
      return new Response(
        JSON.stringify({ error: "Cannot refund - escrow already released to provider" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the PaymentIntent to check status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Payment not in refundable state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the refund
    const refundAmount = amount || paymentIntent.amount;
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: "requested_by_customer",
      metadata: {
        production_order_id: productionOrderId,
        reason: reason || "Customer requested refund",
      },
    });

    // Record the refund transaction
    await supabase.from("wallet_transactions").insert({
      user_id: order.customer_id,
      type: "refund",
      amount: refundAmount / 100,
      status: "completed",
      description: `Escrow refund: ${reason || "Order cancelled"}`,
      reference_type: "production_order",
      reference_id: productionOrderId,
      metadata: {
        refund_id: refund.id,
        payment_intent_id: paymentIntentId,
        reason: reason,
      },
    });

    // Check if there are any additional price adjustment payments to refund
    const { data: priceAdjustments } = await supabase
      .from("price_adjustments")
      .select("*")
      .eq("production_order_id", productionOrderId)
      .eq("status", "approved")
      .eq("difference_captured", true);

    if (priceAdjustments && priceAdjustments.length > 0) {
      for (const adjustment of priceAdjustments) {
        if (adjustment.payment_intent_id) {
          try {
            await stripe.refunds.create({
              payment_intent: adjustment.payment_intent_id,
              reason: "requested_by_customer",
              metadata: {
                production_order_id: productionOrderId,
                type: "price_adjustment_refund",
              },
            });
          } catch (adjustmentRefundError) {
            console.error("Error refunding price adjustment:", adjustmentRefundError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundedAmount: refundAmount / 100,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error refunding escrow:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process refund" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});