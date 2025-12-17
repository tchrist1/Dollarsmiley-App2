import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateOTPRequest {
  shipment_id: string;
  otp_type?: '6_digit' | '4_digit' | 'alphanumeric';
  expiry_minutes?: number;
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

    const requestData: GenerateOTPRequest = await req.json();

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*, bookings!inner(customer_id, provider_id)')
      .eq('id', requestData.shipment_id)
      .single();

    if (shipmentError || !shipment) {
      throw new Error('Shipment not found');
    }

    const booking = shipment.bookings;
    if (booking.customer_id !== user.id && booking.provider_id !== user.id) {
      throw new Error('Not authorized to generate OTP for this shipment');
    }

    const { data: otpCode, error: otpError } = await supabase.rpc('generate_delivery_otp', {
      shipment_id_param: requestData.shipment_id,
      customer_id_param: booking.customer_id,
      otp_type_param: requestData.otp_type || '6_digit',
      expiry_minutes: requestData.expiry_minutes || 60,
    });

    if (otpError) {
      console.error('Error generating OTP:', otpError);
      throw new Error(`Failed to generate OTP: ${otpError.message}`);
    }

    await supabase.from('notifications').insert({
      user_id: booking.customer_id,
      type: 'delivery_otp_generated',
      title: 'Delivery Verification Code',
      body: `Your delivery verification code is: ${otpCode}`,
      data: {
        shipment_id: requestData.shipment_id,
        otp_code: otpCode,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        otp_code: otpCode,
        expires_in_minutes: requestData.expiry_minutes || 60,
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
    console.error('Error in generate-delivery-otp:', error);

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
