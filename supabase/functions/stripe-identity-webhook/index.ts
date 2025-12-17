import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_IDENTITY_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe configuration missing");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log("Received event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "identity.verification_session.verified": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("Verification verified:", session.id);

        // Extract verified data
        const verifiedData = {
          dob: session.verified_outputs?.dob,
          first_name: session.verified_outputs?.first_name,
          last_name: session.verified_outputs?.last_name,
          id_number: session.verified_outputs?.id_number,
          address: session.verified_outputs?.address,
        };

        // Update verification status in database
        const { error: updateError } = await supabase.rpc(
          "update_identity_verification_status",
          {
            session_id_param: session.id,
            status_param: "verified",
            report_id_param: session.last_verification_report || null,
            verified_data_param: verifiedData,
            last_error_param: null,
          }
        );

        if (updateError) {
          console.error("Error updating verification status:", updateError);
          throw updateError;
        }

        console.log("Verification status updated successfully");
        break;
      }

      case "identity.verification_session.requires_input": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("Verification requires input:", session.id);

        const { error: updateError } = await supabase.rpc(
          "update_identity_verification_status",
          {
            session_id_param: session.id,
            status_param: "requires_input",
            report_id_param: null,
            verified_data_param: null,
            last_error_param: session.last_error
              ? {
                  code: session.last_error.code,
                  reason: session.last_error.reason,
                }
              : null,
          }
        );

        if (updateError) {
          console.error("Error updating verification status:", updateError);
        }
        break;
      }

      case "identity.verification_session.processing": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("Verification processing:", session.id);

        const { error: updateError } = await supabase.rpc(
          "update_identity_verification_status",
          {
            session_id_param: session.id,
            status_param: "processing",
            report_id_param: null,
            verified_data_param: null,
            last_error_param: null,
          }
        );

        if (updateError) {
          console.error("Error updating verification status:", updateError);
        }
        break;
      }

      case "identity.verification_session.canceled": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        console.log("Verification canceled:", session.id);

        const { error: updateError } = await supabase.rpc(
          "update_identity_verification_status",
          {
            session_id_param: session.id,
            status_param: "canceled",
            report_id_param: null,
            verified_data_param: null,
            last_error_param: session.last_error
              ? {
                  code: session.last_error.code,
                  reason: session.last_error.reason,
                }
              : null,
          }
        );

        if (updateError) {
          console.error("Error updating verification status:", updateError);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
