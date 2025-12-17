import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
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
    const xeroClientId = Deno.env.get('XERO_CLIENT_ID')!;
    const xeroClientSecret = Deno.env.get('XERO_CLIENT_SECRET')!;
    const xeroRedirectUri = Deno.env.get('XERO_REDIRECT_URI')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        JSON.stringify({ error: 'OAuth authorization failed', details: error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Decode state to get team_id, user_id, and code_verifier
    const stateData = JSON.parse(atob(state));
    const { team_id, user_id, code_verifier } = stateData;

    // Exchange code for tokens
    const tokenUrl = 'https://identity.xero.com/connect/token';
    const auth = btoa(`${xeroClientId}:${xeroClientSecret}`);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: xeroRedirectUri,
        code_verifier: code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tokens: XeroTokenResponse = await tokenResponse.json();

    // Get tenant connections
    const connectionsUrl = 'https://api.xero.com/connections';
    const connectionsResponse = await fetch(connectionsUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!connectionsResponse.ok) {
      console.error('Failed to fetch connections');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Xero connections' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tenants: XeroTenant[] = await connectionsResponse.json();

    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No Xero organisations found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use first tenant (in production, you might want to let user choose)
    const tenant = tenants[0];

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Store connection
    const { error: dbError } = await supabase.from('xero_connections').upsert({
      team_id,
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName,
      tenant_type: tenant.tenantType,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      id_token: tokens.id_token,
      scopes: [
        'offline_access',
        'openid',
        'profile',
        'email',
        'accounting.transactions',
        'accounting.contacts',
        'accounting.settings',
      ],
      is_active: true,
      connected_by: user_id,
      sync_enabled: true,
    }, {
      onConflict: 'team_id',
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store connection' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant_name: tenant.tenantName,
        tenant_id: tenant.tenantId,
        tenant_type: tenant.tenantType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Xero OAuth callback error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
