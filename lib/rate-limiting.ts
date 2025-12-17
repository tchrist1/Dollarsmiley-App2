import { supabase } from './supabase';

export type RateLimitTier = 'anonymous' | 'authenticated' | 'premium' | 'admin';
export type RateLimitInterval = 'second' | 'minute' | 'hour' | 'day';

export interface RateLimitRule {
  id: string;
  endpoint_pattern: string;
  tier: RateLimitTier;
  max_requests: number;
  interval_type: RateLimitInterval;
  interval_value: number;
  burst_allowance: number;
  is_enabled: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitUsage {
  id: string;
  user_id?: string;
  ip_address?: string;
  endpoint: string;
  request_count: number;
  window_start: string;
  window_end: string;
  last_request_at: string;
}

export interface RateLimitViolation {
  id: string;
  user_id?: string;
  ip_address?: string;
  endpoint: string;
  rule_id?: string;
  requested_count: number;
  allowed_count: number;
  blocked: boolean;
  created_at: string;
}

export interface RateLimitBlock {
  id: string;
  user_id?: string;
  ip_address?: string;
  reason: string;
  block_until: string;
  violation_count: number;
  is_active: boolean;
  created_at: string;
}

export interface RateLimitCheck {
  allowed: boolean;
  blocked: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  retry_after?: number;
  reason?: string;
}

export interface RateLimitStats {
  total_requests: number;
  violations: number;
  active_blocks: number;
  endpoints: Record<string, number>;
}

// Rate Limit Rules
export async function getRateLimitRules(tier?: RateLimitTier): Promise<RateLimitRule[]> {
  try {
    let query = supabase
      .from('rate_limit_rules')
      .select('*')
      .eq('is_enabled', true)
      .order('tier')
      .order('endpoint_pattern');

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting rate limit rules:', error);
    return [];
  }
}

export async function getRateLimitRule(
  endpointPattern: string,
  tier: RateLimitTier
): Promise<RateLimitRule | null> {
  try {
    const { data, error } = await supabase
      .from('rate_limit_rules')
      .select('*')
      .eq('endpoint_pattern', endpointPattern)
      .eq('tier', tier)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting rate limit rule:', error);
    return null;
  }
}

export async function createRateLimitRule(rule: {
  endpoint_pattern: string;
  tier: RateLimitTier;
  max_requests: number;
  interval_type: RateLimitInterval;
  interval_value?: number;
  burst_allowance?: number;
  description?: string;
}): Promise<RateLimitRule | null> {
  try {
    const { data, error } = await supabase
      .from('rate_limit_rules')
      .insert(rule)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating rate limit rule:', error);
    return null;
  }
}

export async function updateRateLimitRule(
  ruleId: string,
  updates: Partial<RateLimitRule>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rate_limit_rules')
      .update(updates)
      .eq('id', ruleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating rate limit rule:', error);
    return false;
  }
}

export async function deleteRateLimitRule(ruleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rate_limit_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting rate limit rule:', error);
    return false;
  }
}

// Rate Limit Checking
export async function checkRateLimit(
  endpoint: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    tier?: RateLimitTier;
  }
): Promise<RateLimitCheck> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: options?.userId || null,
      p_ip_address: options?.ipAddress || null,
      p_endpoint: endpoint,
      p_tier: options?.tier || 'anonymous',
    });

    if (error) throw error;
    return data as RateLimitCheck;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return {
      allowed: true,
      blocked: false,
    };
  }
}

export async function recordRequest(
  endpoint: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    tier?: RateLimitTier;
  }
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('record_rate_limit_request', {
      p_user_id: options?.userId || null,
      p_ip_address: options?.ipAddress || null,
      p_endpoint: endpoint,
      p_tier: options?.tier || 'anonymous',
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error recording request:', error);
    return false;
  }
}

// Rate Limit Usage
export async function getRateLimitUsage(
  userId?: string,
  ipAddress?: string
): Promise<RateLimitUsage[]> {
  try {
    let query = supabase
      .from('rate_limit_usage')
      .select('*')
      .order('last_request_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting rate limit usage:', error);
    return [];
  }
}

export async function getCurrentUsage(
  endpoint: string,
  userId?: string,
  ipAddress?: string
): Promise<RateLimitUsage | null> {
  try {
    let query = supabase
      .from('rate_limit_usage')
      .select('*')
      .eq('endpoint', endpoint)
      .gt('window_end', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting current usage:', error);
    return null;
  }
}

// Rate Limit Violations
export async function getRateLimitViolations(
  userId?: string,
  options?: { limit?: number }
): Promise<RateLimitViolation[]> {
  try {
    let query = supabase
      .from('rate_limit_violations')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting rate limit violations:', error);
    return [];
  }
}

// Rate Limit Blocks
export async function getRateLimitBlocks(
  userId?: string,
  activeOnly: boolean = true
): Promise<RateLimitBlock[]> {
  try {
    let query = supabase
      .from('rate_limit_blocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (activeOnly) {
      query = query
        .eq('is_active', true)
        .gt('block_until', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting rate limit blocks:', error);
    return [];
  }
}

export async function createBlock(
  reason: string,
  durationMinutes: number = 60,
  userId?: string,
  ipAddress?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('create_rate_limit_block', {
      p_user_id: userId || null,
      p_ip_address: ipAddress || null,
      p_reason: reason,
      p_duration_minutes: durationMinutes,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating block:', error);
    return null;
  }
}

export async function isBlocked(userId?: string, ipAddress?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('rate_limit_blocks')
      .select('id')
      .eq('is_active', true)
      .gt('block_until', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (ipAddress) {
      query = query.eq('ip_address', ipAddress);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data !== null;
  } catch (error) {
    console.error('Error checking if blocked:', error);
    return false;
  }
}

// Rate Limit Statistics
export async function getRateLimitStats(userId: string): Promise<RateLimitStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_rate_limit_stats', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting rate limit stats:', error);
    return null;
  }
}

// Cleanup
export async function cleanupRateLimitData(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_rate_limit_data');

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error cleaning up rate limit data:', error);
    return 0;
  }
}

// Utility Functions
export function getTierName(tier: RateLimitTier): string {
  const names: Record<RateLimitTier, string> = {
    anonymous: 'Anonymous',
    authenticated: 'Authenticated',
    premium: 'Premium',
    admin: 'Admin',
  };
  return names[tier];
}

export function getIntervalName(interval: RateLimitInterval): string {
  const names: Record<RateLimitInterval, string> = {
    second: 'Second',
    minute: 'Minute',
    hour: 'Hour',
    day: 'Day',
  };
  return names[interval];
}

export function formatRateLimit(
  maxRequests: number,
  intervalType: RateLimitInterval,
  intervalValue: number
): string {
  const interval = intervalValue > 1 ? `${intervalValue} ${intervalType}s` : intervalType;
  return `${maxRequests} requests per ${interval}`;
}

export function calculateResetTime(resetTimestamp?: number): string {
  if (!resetTimestamp) return 'Unknown';

  const now = Date.now() / 1000;
  const diff = resetTimestamp - now;

  if (diff <= 0) return 'Now';

  if (diff < 60) return `${Math.ceil(diff)}s`;
  if (diff < 3600) return `${Math.ceil(diff / 60)}m`;
  if (diff < 86400) return `${Math.ceil(diff / 3600)}h`;
  return `${Math.ceil(diff / 86400)}d`;
}

export function shouldRetry(retryAfter?: number): boolean {
  if (!retryAfter) return true;
  return retryAfter < 300; // Don't retry if wait is more than 5 minutes
}

export function getUserTier(user?: any): RateLimitTier {
  if (!user) return 'anonymous';
  if (user.role === 'admin') return 'admin';
  if (user.subscription_tier === 'premium') return 'premium';
  return 'authenticated';
}

export function getRateLimitHeaders(check: RateLimitCheck): Record<string, string> {
  const headers: Record<string, string> = {};

  if (check.limit !== undefined) {
    headers['X-RateLimit-Limit'] = check.limit.toString();
  }

  if (check.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = check.remaining.toString();
  }

  if (check.reset !== undefined) {
    headers['X-RateLimit-Reset'] = Math.floor(check.reset).toString();
  }

  if (check.retry_after !== undefined) {
    headers['Retry-After'] = Math.ceil(check.retry_after).toString();
  }

  return headers;
}

// Middleware-style rate limit check
export async function rateLimitMiddleware(
  endpoint: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    tier?: RateLimitTier;
  }
): Promise<{ allowed: boolean; headers: Record<string, string>; error?: string }> {
  const check = await checkRateLimit(endpoint, options);

  const headers = getRateLimitHeaders(check);

  if (!check.allowed) {
    if (check.blocked) {
      return {
        allowed: false,
        headers,
        error: check.reason || 'Access blocked',
      };
    }

    return {
      allowed: false,
      headers,
      error: `Rate limit exceeded. Try again in ${calculateResetTime(check.reset)}`,
    };
  }

  // Record the request
  await recordRequest(endpoint, options);

  return {
    allowed: true,
    headers,
  };
}

// Batch check multiple endpoints
export async function checkMultipleEndpoints(
  endpoints: string[],
  options?: {
    userId?: string;
    ipAddress?: string;
    tier?: RateLimitTier;
  }
): Promise<Record<string, RateLimitCheck>> {
  const checks = await Promise.all(
    endpoints.map((endpoint) => checkRateLimit(endpoint, options))
  );

  return endpoints.reduce(
    (acc, endpoint, index) => {
      acc[endpoint] = checks[index];
      return acc;
    },
    {} as Record<string, RateLimitCheck>
  );
}
