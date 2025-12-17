import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { limit = 20 } = await req.json();

    // Get listings with highest overall ratings and booking counts
    const { data: listings, error } = await supabaseClient
      .from('service_listings')
      .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
      .eq('status', 'Active')
      .gte('profiles.rating_average', 4.5)
      .gte('profiles.rating_count', 5) // At least 5 reviews
      .order('profiles.rating_count', { ascending: false })
      .order('profiles.rating_average', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return new Response(
      JSON.stringify({ listings: listings || [] }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
