import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting trending scores update...');

    const { error: listingsError } = await supabase.rpc('update_all_trending_scores');

    if (listingsError) {
      console.error('Error updating listing trending scores:', listingsError);
      throw listingsError;
    }

    console.log('Listing trending scores updated successfully');

    const { error: postsError } = await supabase.rpc('update_trending_posts');

    if (postsError) {
      console.error('Error updating post trending scores:', postsError);
      throw postsError;
    }

    console.log('Post trending scores updated successfully');

    const { data: stats, error: statsError } = await supabase.rpc('get_trending_stats');

    if (statsError) {
      console.error('Error getting trending stats:', statsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trending scores updated successfully',
        stats: stats?.[0] || null,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in update-trending-scores function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
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
