/**
 * Example Edge Function with Feature Flag Integration
 *
 * This demonstrates how to integrate feature flags into Edge Functions
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  withFeatureGuard,
  incrementFeatureUsage,
  featureDisabledResponse,
  rateLimitExceededResponse,
} from '../_shared/feature-flags.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check feature flag before proceeding
    const featureCheck = await withFeatureGuard(
      supabase,
      'ai_recommendations' // Replace with your feature key
    );

    // Return appropriate error if feature is disabled or rate limited
    if (!featureCheck.allowed) {
      if (featureCheck.reason?.includes('Rate limit')) {
        return rateLimitExceededResponse('ai_recommendations');
      }
      return featureDisabledResponse('ai_recommendations', featureCheck.reason);
    }

    // Get feature configuration
    const config = featureCheck.config;
    console.log('Feature config:', config);

    // Parse request body
    const body = await req.json();

    // Your business logic here
    // Use config values if needed
    const result = {
      message: 'Feature is enabled and working!',
      config,
      timestamp: new Date().toISOString(),
    };

    // Increment usage counter (with optional cost)
    await incrementFeatureUsage(
      supabase,
      'ai_recommendations',
      config.estimated_cost_per_use || 0
    );

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
