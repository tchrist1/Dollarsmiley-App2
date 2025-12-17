import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendSMSRequest {
  phoneNumber: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phoneNumber } = (await req.json()) as SendSMSRequest;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate E.164 format (e.g., +12345678900)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format. Use E.164 format (e.g., +12345678900)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const { data: rateLimitOk, error: rateLimitError } = await supabase
      .rpc('check_phone_verification_rate_limit', {
        p_phone_number: phoneNumber,
        p_user_id: user.id,
      });

    if (rateLimitError || !rateLimitOk) {
      await supabase
        .from('phone_verification_logs')
        .insert({
          user_id: user.id,
          phone_number: phoneNumber,
          action: 'send_code',
          success: false,
          error_message: 'Rate limit exceeded',
        });

      return new Response(
        JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP code
    const { data: otpCode } = await supabase.rpc('generate_otp_code');

    // Hash OTP code
    const { data: otpHash } = await supabase.rpc('hash_otp_code', {
      otp: otpCode,
    });

    // Create verification record
    const { data: verification, error: verificationError } = await supabase
      .from('phone_verifications')
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        otp_code: otpCode,
        otp_hash: otpHash,
      })
      .select()
      .single();

    if (verificationError) {
      throw verificationError;
    }

    // Send SMS using Twilio (you'll need to set up Twilio credentials)
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    let smsSent = false;
    let smsError = null;

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      try {
        // Send SMS via Twilio
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const body = new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Body: `Your Dollarsmiley verification code is: ${otpCode}. This code expires in 10 minutes.`,
        });

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (twilioResponse.ok) {
          smsSent = true;
        } else {
          const error = await twilioResponse.text();
          smsError = `Twilio error: ${error}`;
          console.error('Twilio error:', error);
        }
      } catch (error: any) {
        smsError = `SMS error: ${error.message}`;
        console.error('Error sending SMS:', error);
      }
    } else {
      // Development mode: Log OTP to console
      console.log(`[DEV MODE] OTP Code for ${phoneNumber}: ${otpCode}`);
      smsSent = true; // Simulate success in dev mode
    }

    // Log the attempt
    await supabase
      .from('phone_verification_logs')
      .insert({
        verification_id: verification.id,
        user_id: user.id,
        phone_number: phoneNumber,
        action: 'send_code',
        success: smsSent,
        error_message: smsError,
      });

    if (!smsSent) {
      return new Response(
        JSON.stringify({
          error: 'Failed to send verification SMS',
          details: smsError,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationId: verification.id,
        expiresAt: verification.expires_at,
        message: 'Verification code sent successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-verification-sms:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
