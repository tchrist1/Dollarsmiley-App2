import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { connection_id } = await req.json();

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: 'connection_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get current connection
    const { data: connection, error: fetchError } = await supabase
      .from('xero_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (fetchError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Refresh token
    const tokenUrl = 'https://identity.xero.com/connect/token';
    const auth = btoa(`${xeroClientId}:${xeroClientSecret}`);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token refresh failed:', errorData);

      // If refresh token is invalid, mark connection as inactive
      await supabase
        .from('xero_connections')
        .update({
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', connection_id);

      return new Response(
        JSON.stringify({ error: 'Failed to refresh token, connection disabled' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tokens: XeroTokenResponse = await tokenResponse.json();

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Update connection
    const { error: updateError } = await supabase
      .from('xero_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', connection_id);

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        expires_at: expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Xero token refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
