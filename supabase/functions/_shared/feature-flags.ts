/**
 * Feature Flag Utilities for Edge Functions
 *
 * Use this in Edge Functions to check feature flags before executing
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

interface FeatureCheckResult {
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Check if feature is enabled
 */
export async function isFeatureEnabled(
  supabase: any,
  featureKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_feature_enabled', {
      p_feature_key: featureKey,
    });

    if (error) {
      console.error(`Error checking feature ${featureKey}:`, error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error(`Error checking feature ${featureKey}:`, error);
    return false;
  }
}

/**
 * Get feature configuration
 */
export async function getFeatureConfig(
  supabase: any,
  featureKey: string
): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase.rpc('get_feature_config', {
      p_feature_key: featureKey,
    });

    if (error) {
      console.error(`Error getting config for ${featureKey}:`, error);
      return {};
    }

    return data || {};
  } catch (error) {
    console.error(`Error getting config for ${featureKey}:`, error);
    return {};
  }
}

/**
 * Check feature and get config
 */
export async function checkFeature(
  supabase: any,
  featureKey: string
): Promise<FeatureCheckResult> {
  const enabled = await isFeatureEnabled(supabase, featureKey);
  if (!enabled) {
    return { enabled: false, config: {} };
  }

  const config = await getFeatureConfig(supabase, featureKey);
  return { enabled: true, config };
}

/**
 * Increment feature usage
 */
export async function incrementFeatureUsage(
  supabase: any,
  featureKey: string,
  cost: number = 0
): Promise<void> {
  try {
    await supabase.rpc('increment_feature_usage', {
      p_feature_key: featureKey,
      p_cost: cost,
    });
  } catch (error) {
    console.error(`Error incrementing usage for ${featureKey}:`, error);
  }
}

/**
 * Check rate limit
 */
export async function checkRateLimit(
  supabase: any,
  featureKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_feature_rate_limit', {
      p_feature_key: featureKey,
    });

    if (error) {
      console.error(`Error checking rate limit for ${featureKey}:`, error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error(`Error checking rate limit for ${featureKey}:`, error);
    return false;
  }
}

/**
 * Guard function that checks feature and rate limit
 */
export async function withFeatureGuard(
  supabase: any,
  featureKey: string
): Promise<{ allowed: boolean; config: Record<string, any>; reason?: string }> {
  // Check if feature is enabled
  const { enabled, config } = await checkFeature(supabase, featureKey);

  if (!enabled) {
    return {
      allowed: false,
      config: {},
      reason: `Feature ${featureKey} is not enabled`,
    };
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(supabase, featureKey);

  if (!withinLimit) {
    return {
      allowed: false,
      config,
      reason: `Rate limit exceeded for feature ${featureKey}`,
    };
  }

  return {
    allowed: true,
    config,
  };
}

/**
 * Feature flag response helper
 */
export function featureDisabledResponse(featureKey: string, reason?: string) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: reason || `Feature ${featureKey} is not currently available`,
        feature: featureKey,
      },
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Rate limit exceeded response
 */
export function rateLimitExceededResponse(featureKey: string) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded for ${featureKey}. Please try again later.`,
        feature: featureKey,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '3600', // 1 hour
      },
    }
  );
}
