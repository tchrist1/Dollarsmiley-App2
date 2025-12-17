import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateVerificationRequest {
  type?: "document" | "id_number";
  return_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
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

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_verified")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already verified
    if (profile.is_verified) {
      return new Response(
        JSON.stringify({
          error: "User is already verified",
          is_verified: true,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get request body
    const body: CreateVerificationRequest = await req.json();
    const verificationType = body.type || "document";
    const returnUrl = body.return_url;

    // Create Stripe Identity Verification Session
    const verificationSession = await stripe.identity.verificationSessions.create(
      {
        type: verificationType,
        metadata: {
          user_id: user.id,
          user_email: profile.email,
          user_name: profile.full_name || "",
        },
        options: {
          document: {
            allowed_types: ["driving_license", "passport", "id_card"],
            require_id_number: false,
            require_live_capture: true,
            require_matching_selfie: true,
          },
        },
        return_url: returnUrl,
      }
    );

    // Calculate expiration (sessions expire after 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store verification record in database
    const { data: verificationRecord, error: dbError } = await supabase.rpc(
      "create_identity_verification_record",
      {
        stripe_session_id_param: verificationSession.id,
        client_secret_param: verificationSession.client_secret!,
        verification_url_param: verificationSession.url || "",
        expires_at_param: expiresAt.toISOString(),
      }
    );

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store verification record");
    }

    // Return verification session details
    return new Response(
      JSON.stringify({
        success: true,
        verification_id: verificationRecord,
        stripe_session_id: verificationSession.id,
        client_secret: verificationSession.client_secret,
        verification_url: verificationSession.url,
        status: verificationSession.status,
        expires_at: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating verification session:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create verification session",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
