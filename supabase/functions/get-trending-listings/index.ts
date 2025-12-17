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

    // Get listings with highest engagement in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get view/save/booking counts from last 7 days
    const { data: engagementData } = await supabaseClient
      .from('user_behavior_tracking')
      .select('listing_id, event_type')
      .gte('created_at', sevenDaysAgo.toISOString())
      .in('event_type', ['view', 'save', 'booking_created']);

    // Calculate engagement scores
    const engagementScores: { [key: string]: number } = {};
    engagementData?.forEach((event) => {
      if (!engagementScores[event.listing_id]) {
        engagementScores[event.listing_id] = 0;
      }
      // Weight: booking = 5, save = 3, view = 1
      const weight = event.event_type === 'booking_created' ? 5 : event.event_type === 'save' ? 3 : 1;
      engagementScores[event.listing_id] += weight;
    });

    // Get top listing IDs by engagement
    const topListingIds = Object.entries(engagementScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit * 2) // Get more to filter by status
      .map(([id]) => id);

    if (topListingIds.length === 0) {
      // Fallback to recent high-rated listings
      const { data: fallbackListings } = await supabaseClient
        .from('service_listings')
        .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
        .eq('status', 'Active')
        .gte('profiles.rating_average', 4.2)
        .order('created_at', { ascending: false })
        .limit(limit);

      return new Response(
        JSON.stringify({ listings: fallbackListings || [] }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Fetch full listing data
    const { data: listings, error } = await supabaseClient
      .from('service_listings')
      .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
      .eq('status', 'Active')
      .in('id', topListingIds)
      .limit(limit);

    if (error) throw error;

    // Sort by engagement score
    const sortedListings = (listings || []).sort((a, b) => {
      return (engagementScores[b.id] || 0) - (engagementScores[a.id] || 0);
    });

    return new Response(
      JSON.stringify({ listings: sortedListings }),
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
