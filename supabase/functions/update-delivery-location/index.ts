import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json();
    const { shipment_id, latitude, longitude, accuracy, speed } = body;

    // Verify user is the provider for this shipment
    const { data: shipment } = await supabase
      .from('shipments')
      .select('*, bookings!inner(provider_id)')
      .eq('id', shipment_id)
      .single();

    if (!shipment || shipment.bookings.provider_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to update this shipment' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update shipment location using the RPC function
    await supabase.rpc('update_shipment_location', {
      shipment_id_param: shipment_id,
      lat: latitude,
      lng: longitude,
      accuracy: accuracy || null,
      speed: speed || null,
    });

    // Get updated tracking data
    const { data: tracking } = await supabase.rpc('get_shipment_tracking', {
      shipment_id_param: shipment_id,
    });

    // Get customer for notification
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', shipment.booking_id)
      .single();

    // Send real-time notification to customer about location update
    if (booking && tracking && tracking.length > 0) {
      const trackingData = tracking[0];
      
      // Only notify if ETA changed significantly (more than 5 minutes)
      if (trackingData.eta) {
        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title: 'Delivery Update',
          body: `Your delivery is on the way. ETA: ${new Date(trackingData.eta).toLocaleTimeString()}`,
          type: 'delivery_update',
          data: { shipment_id, eta: trackingData.eta },
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        tracking: tracking && tracking.length > 0 ? tracking[0] : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});