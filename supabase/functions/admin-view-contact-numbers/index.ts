import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.user_type !== "Admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Parse request
    const url = new URL(req.url);
    const providerId = url.searchParams.get("providerId");

    if (req.method === "GET") {
      // Get provider contact numbers
      if (providerId) {
        const { data: providerData, error: providerError } = await supabase
          .from("profiles")
          .select("id, full_name, email, provider_contact_numbers, original_bio_with_phones, bio")
          .eq("id", providerId)
          .single();

        if (providerError) {
          return new Response(
            JSON.stringify({ error: "Provider not found" }),
            {
              status: 404,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            provider: {
              id: providerData.id,
              full_name: providerData.full_name,
              email: providerData.email,
              contact_numbers: providerData.provider_contact_numbers || [],
              original_bio: providerData.original_bio_with_phones || null,
              public_bio: providerData.bio,
            },
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Get all providers with contact numbers
      const { data: providers, error: providersError } = await supabase
        .from("profiles")
        .select("id, full_name, email, provider_contact_numbers, created_at")
        .not("provider_contact_numbers", "is", null)
        .order("created_at", { ascending: false });

      if (providersError) {
        throw providersError;
      }

      return new Response(
        JSON.stringify({
          providers: providers.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            contact_numbers: p.provider_contact_numbers || [],
            created_at: p.created_at,
          })),
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get phone detection audit logs
    if (req.method === "POST") {
      const body = await req.json();
      const { recordType, limit = 100 } = body;

      let query = supabase
        .from("phone_sanitization_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (recordType) {
        query = query.eq("record_type", recordType);
      }

      const { data: auditLogs, error: auditError } = await query;

      if (auditError) {
        throw auditError;
      }

      return new Response(
        JSON.stringify({ audit_logs: auditLogs }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
