import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RateLimitCheck {
  allowed: boolean;
  blocked: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  retry_after?: number;
  reason?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { endpoint, tier } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Endpoint is required' },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    const { data: check, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_endpoint: endpoint,
      p_tier: tier || (userId ? 'authenticated' : 'anonymous'),
    });

    if (error) throw error;

    const rateLimitCheck = check as RateLimitCheck;

    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(rateLimitCheck.limit && { 'X-RateLimit-Limit': rateLimitCheck.limit.toString() }),
      ...(rateLimitCheck.remaining !== undefined && { 'X-RateLimit-Remaining': rateLimitCheck.remaining.toString() }),
      ...(rateLimitCheck.reset && { 'X-RateLimit-Reset': Math.floor(rateLimitCheck.reset).toString() }),
      ...(rateLimitCheck.retry_after && { 'Retry-After': Math.ceil(rateLimitCheck.retry_after).toString() }),
    };

    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: rateLimitCheck.blocked ? 'BLOCKED' : 'RATE_LIMIT_EXCEEDED',
            message: rateLimitCheck.reason || 'Rate limit exceeded',
          },
          data: rateLimitCheck,
        }),
        {
          status: rateLimitCheck.blocked ? 403 : 429,
          headers,
        }
      );
    }

    await supabase.rpc('record_rate_limit_request', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_endpoint: endpoint,
      p_tier: tier || (userId ? 'authenticated' : 'anonymous'),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: rateLimitCheck,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error('Rate limit check error:', error);

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
