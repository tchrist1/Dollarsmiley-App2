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

    const { immediately } = await req.json();

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'Active')
      .single();

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (!subscription.stripe_subscription_id) {
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription cancelled',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (immediately) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

      await supabase
        .from('user_subscriptions')
        .update({
          status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Free')
        .single();

      if (freePlan) {
        await supabase.from('user_subscriptions').insert({
          user_id: user.id,
          plan_id: freePlan.id,
          status: 'Active',
          current_period_start: new Date().toISOString(),
          current_period_end: null,
        });
      }

      await supabase
        .from('profiles')
        .update({ subscription_plan: 'Free' })
        .eq('id', user.id);
    } else {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
        })
        .eq('id', subscription.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: immediately
          ? 'Subscription cancelled immediately'
          : 'Subscription will cancel at period end',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Subscription cancellation error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to cancel subscription',
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
