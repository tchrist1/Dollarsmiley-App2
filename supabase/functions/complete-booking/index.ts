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

    const { bookingId, completedBy } = await req.json();

    if (!bookingId) {
      throw new Error("Missing bookingId");
    }

    const { data: booking } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.provider_id !== user.id && booking.customer_id !== user.id) {
      throw new Error("Unauthorized to complete this booking");
    }

    if (booking.status === "Completed") {
      throw new Error("Booking already completed");
    }

    if (booking.escrow_status !== "Held") {
      throw new Error("No escrow hold found for this booking");
    }

    const { data: escrowHold } = await supabaseClient
      .from("escrow_holds")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("status", "Held")
      .single();

    if (!escrowHold) {
      throw new Error("Escrow hold not found");
    }

    const { data: activeDispute } = await supabaseClient
      .from("disputes")
      .select("id")
      .eq("booking_id", bookingId)
      .in("status", ["Open", "UnderReview"])
      .single();

    if (activeDispute) {
      throw new Error("Cannot complete booking with active dispute");
    }

    await supabaseClient
      .from("bookings")
      .update({
        status: "Completed",
        escrow_status: "Released",
        completed_at: new Date().toISOString(),
        can_review: true,
      })
      .eq("id", bookingId);

    await supabaseClient
      .from("escrow_holds")
      .update({
        status: "Released",
        released_at: new Date().toISOString(),
      })
      .eq("id", escrowHold.id);

    const { data: providerConnect } = await supabaseClient
      .from("stripe_connect_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("user_id", booking.provider_id)
      .single();

    if (providerConnect?.payouts_enabled && providerConnect.stripe_account_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(escrowHold.provider_payout * 100),
          currency: "usd",
          destination: providerConnect.stripe_account_id,
          description: `Payout for booking ${bookingId}`,
          metadata: {
            bookingId,
            escrowHoldId: escrowHold.id,
          },
        });

        await supabaseClient
          .from("wallet_transactions")
          .insert({
            user_id: booking.provider_id,
            amount: escrowHold.provider_payout,
            transaction_type: "Payout",
            status: "Completed",
            description: `Payout for booking ${bookingId}`,
            payment_method: "stripe_connect",
            related_booking_id: bookingId,
            escrow_hold_id: escrowHold.id,
          });

        const notificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`;

        await fetch(notificationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            userId: booking.customer_id,
            type: "BookingCompleted",
            title: "Booking Completed",
            body: `Your booking "${booking.title}" has been completed. Please leave a review!`,
            data: {
              bookingId,
            },
            actionUrl: `/review/${bookingId}`,
            priority: "high",
          }),
        });

        await fetch(notificationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            userId: booking.provider_id,
            type: "PayoutProcessed",
            title: "Payout Processed",
            body: `Your payout of $${escrowHold.provider_payout} for "${booking.title}" has been transferred.`,
            data: {
              bookingId,
              amount: escrowHold.provider_payout,
            },
            actionUrl: `/wallet`,
            priority: "high",
          }),
        });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Booking completed and payout transferred",
            transferId: transfer.id,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (error) {
        await supabaseClient
          .from("wallet_transactions")
          .insert({
            user_id: booking.provider_id,
            amount: escrowHold.provider_payout,
            transaction_type: "Payout",
            status: "Pending",
            description: `Payout for booking ${bookingId} - pending manual processing`,
            related_booking_id: bookingId,
            escrow_hold_id: escrowHold.id,
          });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Booking completed. Payout pending manual processing.",
            error: error.message,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } else {
      await supabaseClient
        .from("wallet_transactions")
        .insert({
          user_id: booking.provider_id,
          amount: escrowHold.provider_payout,
          transaction_type: "Payout",
          status: "Pending",
          description: `Payout for booking ${bookingId} - Stripe Connect not set up`,
          related_booking_id: bookingId,
          escrow_hold_id: escrowHold.id,
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Booking completed. Provider needs to set up Stripe Connect for payouts.",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
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