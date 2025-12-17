import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VerifyCodeRequest {
  verificationId: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { verificationId, code } = (await req.json()) as VerifyCodeRequest;

    if (!verificationId || !code) {
      return new Response(
        JSON.stringify({ error: 'Verification ID and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid code format. Code must be 6 digits.' }),
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

    // Get verification record
    const { data: verification, error: verificationError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('id', verificationId)
      .eq('user_id', user.id)
      .single();

    if (verificationError || !verification) {
      return new Response(
        JSON.stringify({ error: 'Verification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (verification.status === 'verified') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Phone number already verified',
          phoneNumber: verification.phone_number,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      await supabase
        .from('phone_verifications')
        .update({ status: 'expired' })
        .eq('id', verificationId);

      await supabase
        .from('phone_verification_logs')
        .insert({
          verification_id: verificationId,
          user_id: user.id,
          phone_number: verification.phone_number,
          action: 'verify_code',
          success: false,
          error_message: 'Code expired',
        });

      return new Response(
        JSON.stringify({ error: 'Verification code has expired. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if failed (too many attempts)
    if (verification.status === 'failed') {
      await supabase
        .from('phone_verification_logs')
        .insert({
          verification_id: verificationId,
          user_id: user.id,
          phone_number: verification.phone_number,
          action: 'verify_code',
          success: false,
          error_message: 'Max attempts exceeded',
        });

      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the code using the database function
    const { data: isValid, error: verifyError } = await supabase.rpc('verify_otp_code', {
      p_verification_id: verificationId,
      p_otp_code: code,
    });

    if (verifyError) {
      throw verifyError;
    }

    // Log the attempt
    await supabase
      .from('phone_verification_logs')
      .insert({
        verification_id: verificationId,
        user_id: user.id,
        phone_number: verification.phone_number,
        action: 'verify_code',
        success: isValid,
        error_message: isValid ? null : 'Invalid code',
      });

    if (!isValid) {
      // Get updated verification to check attempts
      const { data: updatedVerification } = await supabase
        .from('phone_verifications')
        .select('attempts, status')
        .eq('id', verificationId)
        .single();

      if (updatedVerification?.status === 'failed') {
        return new Response(
          JSON.stringify({
            error: 'Too many failed attempts. Please request a new code.',
            attemptsRemaining: 0,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const attemptsRemaining = 5 - (updatedVerification?.attempts || 0);
      return new Response(
        JSON.stringify({
          error: 'Invalid verification code',
          attemptsRemaining,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for successful verification
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'verification',
        title: 'Phone Verified',
        message: 'Your phone number has been successfully verified!',
        data: {
          phone_number: verification.phone_number,
          verified_at: new Date().toISOString(),
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Phone number verified successfully',
        phoneNumber: verification.phone_number,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in verify-phone-code:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
