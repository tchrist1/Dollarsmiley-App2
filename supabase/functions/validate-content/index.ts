import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { detectPhoneNumbers, sanitizePhoneNumbers } from "./_shared/phone-sanitization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidationRequest {
  text: string;
  fieldName?: string;
  autoSanitize?: boolean;
}

interface ValidationResponse {
  valid: boolean;
  hasPhoneNumbers: boolean;
  sanitizedText?: string;
  message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, fieldName = "content", autoSanitize = false }: ValidationRequest = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({
          error: "Invalid request: text field is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const hasPhoneNumbers = detectPhoneNumbers(text);

    const response: ValidationResponse = {
      valid: !hasPhoneNumbers,
      hasPhoneNumbers,
    };

    if (hasPhoneNumbers) {
      response.message = `Phone numbers detected in ${fieldName}. Contact information is not allowed in public content.`;

      if (autoSanitize) {
        response.sanitizedText = sanitizePhoneNumbers(text);
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Validation error:", error);

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
