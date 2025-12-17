import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { featuredId, paymentIntentId } = await req.json();

    if (!featuredId || !paymentIntentId) {
      throw new Error('Missing required parameters');
    }

    // Verify featured listing belongs to user
    const { data: featured } = await supabase
      .from('featured_listings')
      .select('*')
      .eq('id', featuredId)
      .eq('user_id', user.id)
      .single();

    if (!featured) {
      throw new Error('Featured listing not found or access denied');
    }

    // Update featured listing to active
    const { error: updateError } = await supabase
      .from('featured_listings')
      .update({
        status: 'active',
        payment_intent_id: paymentIntentId,
      })
      .eq('id', featuredId);

    if (updateError) throw updateError;

    // Track usage
    const { error: usageError } = await supabase.rpc('track_usage', {
      p_user_id: user.id,
      p_metric: 'featured_listings',
      p_amount: 1,
    });

    if (usageError) {
      console.error('Error tracking usage:', usageError);
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'featured_active',
      title: 'Listing Now Featured!',
      message: 'Your listing is now featured and will appear at the top of search results.',
      data: {
        featured_id: featuredId,
        listing_id: featured.listing_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Featured listing activated successfully',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Featured activation error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to activate featured listing',
      }),
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
