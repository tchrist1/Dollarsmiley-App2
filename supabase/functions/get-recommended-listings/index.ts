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

    const { user_id, latitude, longitude, limit = 20 } = await req.json();

    // Get user's viewing history and interactions
    const { data: userHistory } = await supabaseClient
      .from('user_behavior_tracking')
      .select('listing_id, category_id')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Extract category preferences
    const categoryIds = userHistory?.map(h => h.category_id).filter(Boolean) || [];
    const uniqueCategories = [...new Set(categoryIds)].slice(0, 5);

    let query = supabaseClient
      .from('service_listings')
      .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
      .eq('status', 'Active');

    // Prioritize listings in user's preferred categories
    if (uniqueCategories.length > 0) {
      query = query.in('category_id', uniqueCategories);
    }

    // If location provided, prioritize nearby
    if (latitude && longitude) {
      const { data: nearbyListings } = await supabaseClient.rpc('find_nearby_services', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_miles: 10,
        p_limit: limit,
      });

      if (nearbyListings && nearbyListings.length > 0) {
        const listingIds = nearbyListings.map((item: any) => item.id);
        query = query.in('id', listingIds);
      }
    }

    // Sort by rating and recent activity
    query = query
      .gte('profiles.rating_average', 4.0)
      .order('view_count', { ascending: false })
      .limit(limit);

    const { data: listings, error } = await query;

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
