import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyOTPRequest {
  shipment_id: string;
  otp_code: string;
  driver_id?: string;
  proof_photos?: string[];
  signature_data?: string;
  location_lat?: number;
  location_lng?: number;
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: VerifyOTPRequest = await req.json();

    const { data: isValid, error: verifyError } = await supabase.rpc('verify_delivery_otp', {
      shipment_id_param: requestData.shipment_id,
      otp_code_param: requestData.otp_code,
      driver_id_param: requestData.driver_id || null,
    });

    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);
      throw new Error(`Failed to verify OTP: ${verifyError.message}`);
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired OTP code',
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

    const proofInserts = [];

    if (requestData.otp_code) {
      proofInserts.push({
        shipment_id: requestData.shipment_id,
        driver_id: requestData.driver_id,
        proof_type: 'otp',
        otp_code: requestData.otp_code,
        otp_verified_at: new Date().toISOString(),
        is_verified: true,
        captured_at: new Date().toISOString(),
      });
    }

    if (requestData.proof_photos && requestData.proof_photos.length > 0) {
      proofInserts.push({
        shipment_id: requestData.shipment_id,
        driver_id: requestData.driver_id,
        proof_type: 'photo',
        photo_urls: requestData.proof_photos,
        proof_location_lat: requestData.location_lat,
        proof_location_lng: requestData.location_lng,
        is_verified: true,
        captured_at: new Date().toISOString(),
      });
    }

    if (requestData.signature_data) {
      proofInserts.push({
        shipment_id: requestData.shipment_id,
        driver_id: requestData.driver_id,
        proof_type: 'signature',
        signature_data: requestData.signature_data,
        is_verified: true,
        captured_at: new Date().toISOString(),
      });
    }

    if (proofInserts.length > 0) {
      const { error: proofError } = await supabase
        .from('delivery_proofs')
        .insert(proofInserts);

      if (proofError) {
        console.error('Error inserting delivery proofs:', proofError);
      }
    }

    const { error: shipmentUpdateError } = await supabase
      .from('shipments')
      .update({
        status: 'delivered',
        actual_delivery_at: new Date().toISOString(),
      })
      .eq('id', requestData.shipment_id);

    if (shipmentUpdateError) {
      console.error('Error updating shipment status:', shipmentUpdateError);
    }

    await supabase.from('delivery_events').insert({
      shipment_id: requestData.shipment_id,
      event_type: 'delivered',
      event_title: 'Package Delivered',
      event_description: 'Package successfully delivered and verified with OTP',
      triggered_by: user.id,
      driver_id: requestData.driver_id,
      new_status: 'delivered',
      event_location_lat: requestData.location_lat,
      event_location_lng: requestData.location_lng,
      occurred_at: new Date().toISOString(),
    });

    const { data: shipment } = await supabase
      .from('shipments')
      .select('booking_id, bookings!inner(customer_id)')
      .eq('id', requestData.shipment_id)
      .single();

    if (shipment) {
      await supabase.from('notifications').insert({
        user_id: shipment.bookings.customer_id,
        type: 'delivery_completed',
        title: 'Delivery Completed',
        body: 'Your package has been successfully delivered',
        data: {
          shipment_id: requestData.shipment_id,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        delivery_completed: true,
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
    console.error('Error in verify-delivery-otp:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
