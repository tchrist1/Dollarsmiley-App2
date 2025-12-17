import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReleaseEscrowRequest {
  escrowHoldId: string;
  bookingId: string;
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
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const body: ReleaseEscrowRequest = await req.json();
    const { escrowHoldId, bookingId } = body;

    if (!escrowHoldId || !bookingId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: escrowHold, error: fetchError } = await supabase
      .from('escrow_holds')
      .select('*')
      .eq('id', escrowHoldId)
      .single();

    if (fetchError || !escrowHold) {
      return new Response(
        JSON.stringify({ error: 'Escrow hold not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (escrowHold.status !== 'Held') {
      return new Response(
        JSON.stringify({ error: `Escrow already ${escrowHold.status.toLowerCase()}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { error: updateError } = await supabase
      .from('escrow_holds')
      .update({
        status: 'Released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowHoldId);

    if (updateError) {
      throw updateError;
    }

    await supabase
      .from('bookings')
      .update({
        escrow_status: 'Released',
        payment_status: 'Completed',
      })
      .eq('id', bookingId);

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', escrowHold.provider_id)
      .single();

    if (wallet) {
      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        transaction_type: 'Payout',
        amount: escrowHold.provider_payout,
        status: 'Completed',
        description: `Payout from booking #${bookingId.slice(0, 8)}`,
        booking_id: bookingId,
        escrow_hold_id: escrowHoldId,
      });

      const { data: walletData } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('id', wallet.id)
        .single();

      if (walletData) {
        const newBalance = (walletData.available_balance || 0) + escrowHold.provider_payout;
        await supabase
          .from('wallets')
          .update({ available_balance: newBalance })
          .eq('id', wallet.id);
      }
    }

    await supabase.from('notifications').insert({
      user_id: escrowHold.provider_id,
      type: 'payout_received',
      title: 'Payment Received',
      message: `You've received $${escrowHold.provider_payout.toFixed(2)} from booking #${bookingId.slice(0, 8)}`,
      data: {
        booking_id: bookingId,
        amount: escrowHold.provider_payout,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Escrow released successfully',
        amount: escrowHold.provider_payout,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error releasing escrow:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
