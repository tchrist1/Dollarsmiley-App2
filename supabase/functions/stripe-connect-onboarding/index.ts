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

    const { action, accountId } = await req.json();

    if (action === "create") {
      const { data: existingAccount } = await supabaseClient
        .from("stripe_connect_accounts")
        .select("stripe_account_id")
        .eq("user_id", user.id)
        .single();

      if (existingAccount?.stripe_account_id) {
        return new Response(
          JSON.stringify({
            accountId: existingAccount.stripe_account_id,
            message: "Account already exists",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
      });

      await supabaseClient
        .from("stripe_connect_accounts")
        .insert({
          user_id: user.id,
          stripe_account_id: account.id,
          account_status: "Pending",
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
        });

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${Deno.env.get("APP_URL")}/wallet?refresh=true`,
        return_url: `${Deno.env.get("APP_URL")}/wallet?success=true`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({
          accountId: account.id,
          onboardingUrl: accountLink.url,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "refresh") {
      if (!accountId) {
        throw new Error("Account ID required");
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${Deno.env.get("APP_URL")}/wallet?refresh=true`,
        return_url: `${Deno.env.get("APP_URL")}/wallet?success=true`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({ onboardingUrl: accountLink.url }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "status") {
      const { data: connectAccount } = await supabaseClient
        .from("stripe_connect_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!connectAccount?.stripe_account_id) {
        return new Response(
          JSON.stringify({ status: "not_created" }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);

      await supabaseClient
        .from("stripe_connect_accounts")
        .update({
          onboarding_completed: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          account_status: account.charges_enabled ? "Active" : "Pending",
          details_submitted: account.details_submitted,
          requirements: account.requirements,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({
          accountId: account.id,
          onboardingCompleted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirements: account.requirements,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("Invalid action");
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