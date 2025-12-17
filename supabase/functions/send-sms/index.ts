import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

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

    // Get next queued SMS
    const { data: queueId, error: queueError } = await supabase.rpc('get_next_queued_sms');

    if (queueError) {
      console.error('Queue error:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to get queued SMS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queueId) {
      return new Response(
        JSON.stringify({ message: 'No SMS in queue' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SMS details
    const { data: sms, error: smsError } = await supabase
      .from('sms_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (smsError || !sms) {
      return new Response(
        JSON.stringify({ error: 'Failed to get SMS details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SMS settings
    const { data: settings, error: settingsError } = await supabase
      .from('sms_settings')
      .select('*')
      .eq('team_id', sms.team_id)
      .single();

    if (settingsError || !settings) {
      await supabase
        .from('sms_queue')
        .update({
          status: 'failed',
          error_message: 'SMS settings not configured',
        })
        .eq('id', queueId);

      return new Response(
        JSON.stringify({ error: 'SMS settings not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let twilioSid: string | null = null;
    let sendError: string | null = null;
    let segments = 1;
    let price: number | null = null;

    try {
      // Calculate segments
      const length = sms.message.length;
      const hasUnicode = /[^\x00-\x7F]/.test(sms.message);

      if (hasUnicode) {
        segments = length <= 70 ? 1 : Math.ceil(length / 67);
      } else {
        segments = length <= 160 ? 1 : Math.ceil(length / 153);
      }

      // Send via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.account_sid}/Messages.json`;
      const auth = btoa(`${settings.account_sid}:${settings.auth_token}`);

      const formData = new URLSearchParams();
      formData.append('To', sms.to_number);
      formData.append('From', sms.from_number || settings.from_number);
      formData.append('Body', sms.message);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Twilio error: ${errorData.message || 'Unknown error'} (Code: ${errorData.code || 'N/A'})`
        );
      }

      const result = await response.json();
      twilioSid = result.sid;
      price = parseFloat(result.price) || null;

      // Update queue status
      await supabase
        .from('sms_queue')
        .update({ status: 'sent' })
        .eq('id', queueId);

      // Create log entry
      await supabase.from('sms_logs').insert({
        team_id: sms.team_id,
        queue_id: queueId,
        template_id: sms.template_id,
        twilio_sid: twilioSid,
        to_number: sms.to_number,
        from_number: sms.from_number || settings.from_number,
        message: sms.message,
        status: 'sent',
        segments: segments,
        price: price,
        price_unit: result.price_unit || 'USD',
        sent_at: new Date().toISOString(),
      });

      // Increment SMS count
      await supabase.rpc('increment_sms_count', {
        p_team_id: sms.team_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          queue_id: queueId,
          twilio_sid: twilioSid,
          segments: segments,
          price: price,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Send error:', error);
      sendError = error.message;

      // Extract Twilio error code if available
      let errorCode: string | null = null;
      const codeMatch = sendError.match(/Code:\s*(\d+)/);
      if (codeMatch) {
        errorCode = codeMatch[1];
      }

      // Update queue with error
      await supabase
        .from('sms_queue')
        .update({
          status: sms.attempts >= sms.max_attempts ? 'failed' : 'queued',
          error_message: sendError,
        })
        .eq('id', queueId);

      // Create failed log entry
      await supabase.from('sms_logs').insert({
        team_id: sms.team_id,
        queue_id: queueId,
        template_id: sms.template_id,
        to_number: sms.to_number,
        from_number: sms.from_number || settings.from_number,
        message: sms.message,
        status: 'failed',
        segments: segments,
        failure_reason: sendError,
        error_code: errorCode,
        failed_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      });

      throw error;
    }
  } catch (error) {
    console.error('SMS service error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
