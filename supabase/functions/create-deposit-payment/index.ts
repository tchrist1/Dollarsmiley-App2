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

    const { bookingId, depositAmount, balanceAmount, totalAmount, paymentMethod = "card" } = await req.json();

    if (!bookingId || !depositAmount || balanceAmount === undefined || !totalAmount) {
      throw new Error("Missing required fields: bookingId, depositAmount, balanceAmount, totalAmount");
    }

    const { data: booking } = await supabaseClient
      .from("bookings")
      .select("provider_id, scheduled_date")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    const { data: depositSettings } = await supabaseClient
      .from("deposit_settings")
      .select("*")
      .eq("provider_id", booking.provider_id)
      .single();

    const paymentIntentParams: any = {
      amount: Math.round(depositAmount * 100),
      currency: "usd",
      metadata: {
        bookingId,
        userId: user.id,
        providerId: booking.provider_id,
        paymentType: "deposit",
        totalAmount: totalAmount.toString(),
        balanceAmount: balanceAmount.toString(),
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

    let balanceDueDate = null;
    if (depositSettings && booking.scheduled_date) {
      const scheduledDate = new Date(booking.scheduled_date);
      
      if (depositSettings.balance_due_timing === "Before") {
        balanceDueDate = new Date(scheduledDate);
        balanceDueDate.setDate(balanceDueDate.getDate() - depositSettings.balance_due_days);
      } else if (depositSettings.balance_due_timing === "AtService") {
        balanceDueDate = scheduledDate;
      } else if (depositSettings.balance_due_timing === "After") {
        balanceDueDate = new Date(scheduledDate);
        balanceDueDate.setDate(balanceDueDate.getDate() + depositSettings.balance_due_days);
      }
    }

    let refundDeadline = null;
    if (depositSettings && depositSettings.refund_policy === "RefundableUntil" && booking.scheduled_date) {
      const scheduledDate = new Date(booking.scheduled_date);
      refundDeadline = new Date(scheduledDate);
      refundDeadline.setDate(refundDeadline.getDate() - depositSettings.refund_deadline_days);
    }

    const { data: depositPayment, error: depositError } = await supabaseClient
      .from("deposit_payments")
      .insert({
        booking_id: bookingId,
        customer_id: user.id,
        provider_id: booking.provider_id,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        deposit_status: "Pending",
        balance_status: balanceAmount > 0 ? "Pending" : "Paid",
        stripe_deposit_intent_id: paymentIntent.id,
        balance_due_date: balanceDueDate,
        refund_eligible: depositSettings?.refund_policy !== "NonRefundable",
        refund_deadline: refundDeadline,
      })
      .select()
      .single();

    if (depositError) {
      throw new Error("Failed to create deposit payment record");
    }

    await supabaseClient
      .from("bookings")
      .update({
        payment_type: balanceAmount > 0 ? "Deposit" : "Full",
        deposit_payment_id: depositPayment.id,
        requires_balance_payment: balanceAmount > 0,
        payment_method: paymentMethod,
      })
      .eq("id", bookingId);

    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: depositAmount,
        transaction_type: "Payment",
        status: "Pending",
        description: `Deposit payment for booking ${bookingId}`,
        payment_method: paymentMethod,
        stripe_payment_intent_id: paymentIntent.id,
        related_booking_id: bookingId,
      });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        depositPaymentId: depositPayment.id,
        depositAmount,
        balanceAmount,
        balanceDueDate,
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