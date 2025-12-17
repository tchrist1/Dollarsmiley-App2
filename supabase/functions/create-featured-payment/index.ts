import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
});

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

    const { listingId, duration, amount } = await req.json();

    if (!listingId || !duration || !amount) {
      throw new Error('Missing required parameters');
    }

    // Verify listing belongs to user
    const { data: listing } = await supabase
      .from('service_listings')
      .select('id, user_id, title')
      .eq('id', listingId)
      .eq('user_id', user.id)
      .single();

    if (!listing) {
      throw new Error('Listing not found or access denied');
    }

    // Calculate dates
    const now = new Date();
    const durationDays = parseInt(duration);
    const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create featured listing record (pending payment)
    const { data: featured, error: featuredError } = await supabase
      .from('featured_listings')
      .insert({
        listing_id: listingId,
        user_id: user.id,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'pending',
        amount_paid: amount,
      })
      .select()
      .single();

    if (featuredError) throw featuredError;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        type: 'featured_listing',
        featured_id: featured.id,
        listing_id: listingId,
        user_id: user.id,
        duration: duration,
      },
      description: `Feature listing: ${listing.title} for ${duration} days`,
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        featuredId: featured.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Featured payment creation error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create featured payment',
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
