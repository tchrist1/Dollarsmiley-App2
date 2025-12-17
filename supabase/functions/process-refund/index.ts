import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import Stripe from 'npm:stripe@17.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProcessRefundRequest {
  refundId: string;
  approvedBy: string;
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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: ProcessRefundRequest = await req.json();
    const { refundId, approvedBy } = body;

    if (!refundId || !approvedBy) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: refundData, error: refundFetchError } = await supabase
      .from('refunds')
      .select('*, escrow_holds(*)')
      .eq('id', refundId)
      .single();

    if (refundFetchError || !refundData) {
      return new Response(
        JSON.stringify({ error: 'Refund not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (refundData.status !== 'Pending') {
      return new Response(
        JSON.stringify({ error: `Refund already ${refundData.status.toLowerCase()}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const escrowHold = refundData.escrow_holds;
    let stripeRefundId;

    if (escrowHold?.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: escrowHold.stripe_payment_intent_id,
          amount: Math.round(refundData.amount * 100),
        });
        stripeRefundId = refund.id;
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
      }
    }

    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'Completed',
        approved_by: approvedBy,
        stripe_refund_id: stripeRefundId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (updateError) {
      throw updateError;
    }

    if (escrowHold) {
      await supabase
        .from('escrow_holds')
        .update({ status: 'Refunded' })
        .eq('id', escrowHold.id);

      await supabase
        .from('bookings')
        .update({
          escrow_status: 'Refunded',
          payment_status: 'Refunded',
        })
        .eq('id', refundData.booking_id);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id, available_balance')
        .eq('user_id', escrowHold.customer_id)
        .single();

      if (wallet) {
        await supabase.from('transactions').insert({
          wallet_id: wallet.id,
          transaction_type: 'Refund',
          amount: refundData.amount,
          status: 'Completed',
          description: `Refund for booking #${refundData.booking_id.slice(0, 8)}`,
          booking_id: refundData.booking_id,
          refund_id: refundId,
          escrow_hold_id: escrowHold.id,
        });

        const newBalance = (wallet.available_balance || 0) + refundData.amount;
        await supabase
          .from('wallets')
          .update({ available_balance: newBalance })
          .eq('id', wallet.id);
      }

      await supabase.from('notifications').insert([
        {
          user_id: escrowHold.customer_id,
          type: 'refund_processed',
          title: 'Refund Processed',
          message: `Your refund of $${refundData.amount.toFixed(2)} has been processed`,
          data: {
            booking_id: refundData.booking_id,
            amount: refundData.amount,
            refund_id: refundId,
          },
        },
        {
          user_id: escrowHold.provider_id,
          type: 'refund_issued',
          title: 'Refund Issued',
          message: `A refund of $${refundData.amount.toFixed(2)} was issued for booking #${refundData.booking_id.slice(0, 8)}`,
          data: {
            booking_id: refundData.booking_id,
            amount: refundData.amount,
            refund_id: refundId,
          },
        },
      ]);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund processed successfully',
        amount: refundData.amount,
        stripeRefundId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
