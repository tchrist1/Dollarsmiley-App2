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

    const { productionOrderId, providerId, providerAmount } = await req.json();

    if (!productionOrderId || !providerId || !providerAmount) {
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
        JSON.stringify({ error: "Escrow already released" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get provider's Stripe Connect account
    const { data: provider } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", providerId)
      .single();

    if (provider?.stripe_connect_account_id) {
      // Transfer to provider's Connect account
      try {
        await stripe.transfers.create({
          amount: providerAmount,
          currency: "usd",
          destination: provider.stripe_connect_account_id,
          transfer_group: `order_${productionOrderId}`,
          metadata: {
            production_order_id: productionOrderId,
            provider_id: providerId,
            type: "escrow_release",
          },
        });
      } catch (transferError: any) {
        console.error("Transfer error:", transferError);
        // Continue with wallet credit even if Stripe transfer fails
      }
    }

    // Create wallet credit for provider
    await supabase.from("wallet_transactions").insert({
      user_id: providerId,
      type: "credit",
      amount: providerAmount / 100,
      status: "completed",
      description: "Custom service escrow released",
      reference_type: "production_order",
      reference_id: productionOrderId,
      metadata: {
        escrow_amount: order.escrow_amount,
        platform_fee: (order.escrow_amount || 0) * 0.15,
      },
    });

    // Update provider's wallet balance
    await supabase.rpc("increment_wallet_balance", {
      p_user_id: providerId,
      p_amount: providerAmount / 100,
    });

    // Schedule payout according to existing delivery/confirmation window
    const payoutDate = new Date();
    payoutDate.setDate(payoutDate.getDate() + 14); // 14-day hold for custom services

    await supabase.from("payout_schedules").insert({
      user_id: providerId,
      amount: providerAmount / 100,
      scheduled_date: payoutDate.toISOString(),
      status: "pending",
      reference_type: "production_order",
      reference_id: productionOrderId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        providerAmount: providerAmount / 100,
        payoutDate: payoutDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error releasing escrow:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to release escrow" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});