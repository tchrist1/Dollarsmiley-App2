import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending payments that are due
    const { data: payments, error: fetchError } = await supabase
      .from("recurring_payments")
      .select("*")
      .eq("status", "pending")
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw fetchError;
    }

    if (!payments || payments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending payments to process",
          processed: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Processing ${payments.length} pending payments`);

    const results = {
      total: payments.length,
      succeeded: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each payment
    for (const payment of payments) {
      try {
        console.log(`Processing payment ${payment.id}`);

        // Call charge function
        const chargeResponse = await fetch(
          `${supabaseUrl}/functions/v1/charge-recurring-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              payment_id: payment.id,
              payment_method_id: payment.payment_method_id,
              amount: payment.amount,
              currency: payment.currency,
              customer_id: payment.customer_id,
            }),
          }
        );

        const chargeResult = await chargeResponse.json();

        if (chargeResult.success) {
          results.succeeded++;
          console.log(`Payment ${payment.id} succeeded`);
        } else {
          results.failed++;
          console.log(`Payment ${payment.id} failed: ${chargeResult.error}`);
          results.errors.push({
            payment_id: payment.id,
            error: chargeResult.error,
          });
        }
      } catch (error: any) {
        results.failed++;
        console.error(`Error processing payment ${payment.id}:`, error);
        results.errors.push({
          payment_id: payment.id,
          error: error.message,
        });

        // Continue processing other payments
        continue;
      }
    }

    console.log(
      `Completed processing: ${results.succeeded} succeeded, ${results.failed} failed`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.total} payments`,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in process-recurring-payments:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
