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

    // Get next queued message
    const { data: queueId, error: queueError } = await supabase.rpc('get_next_queued_whatsapp');

    if (queueError) {
      console.error('Queue error:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to get queued WhatsApp message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queueId) {
      return new Response(
        JSON.stringify({ message: 'No WhatsApp messages in queue' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get message details
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (messageError || !message) {
      return new Response(
        JSON.stringify({ error: 'Failed to get message details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp settings
    const { data: settings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('team_id', message.team_id)
      .single();

    if (settingsError || !settings) {
      await supabase
        .from('whatsapp_queue')
        .update({
          status: 'failed',
          error_message: 'WhatsApp settings not configured',
        })
        .eq('id', queueId);

      return new Response(
        JSON.stringify({ error: 'WhatsApp settings not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let whatsappMessageId: string | null = null;
    let sendError: string | null = null;

    try {
      // Build WhatsApp API request
      const whatsappUrl = `https://graph.facebook.com/v18.0/${settings.phone_number_id}/messages`;

      let messagePayload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to_number,
      };

      // Build message based on type
      switch (message.message_type) {
        case 'text':
          messagePayload.type = 'text';
          messagePayload.text = { body: message.content.text };
          break;

        case 'template':
          messagePayload.type = 'template';
          messagePayload.template = message.content;
          break;

        case 'image':
          messagePayload.type = 'image';
          messagePayload.image = {
            link: message.media_url,
            caption: message.content.caption,
          };
          break;

        case 'document':
          messagePayload.type = 'document';
          messagePayload.document = {
            link: message.media_url,
            filename: message.content.filename,
            caption: message.content.caption,
          };
          break;

        case 'video':
          messagePayload.type = 'video';
          messagePayload.video = {
            link: message.media_url,
            caption: message.content.caption,
          };
          break;

        case 'audio':
          messagePayload.type = 'audio';
          messagePayload.audio = {
            link: message.media_url,
          };
          break;

        case 'location':
          messagePayload.type = 'location';
          messagePayload.location = message.content;
          break;

        case 'interactive':
          messagePayload.type = 'interactive';
          messagePayload.interactive = message.content;
          break;

        default:
          throw new Error(`Unsupported message type: ${message.message_type}`);
      }

      // Send to WhatsApp
      const response = await fetch(whatsappUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `WhatsApp API error: ${errorData.error?.message || 'Unknown error'} (Code: ${errorData.error?.code || 'N/A'})`
        );
      }

      const result = await response.json();
      whatsappMessageId = result.messages?.[0]?.id;

      // Update queue status
      await supabase
        .from('whatsapp_queue')
        .update({ status: 'sent' })
        .eq('id', queueId);

      // Create log entry
      await supabase.from('whatsapp_logs').insert({
        team_id: message.team_id,
        queue_id: queueId,
        template_id: message.template_id,
        whatsapp_message_id: whatsappMessageId,
        to_number: message.to_number,
        from_number: settings.phone_number_id,
        message_type: message.message_type,
        content: message.content,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      // Increment message count
      await supabase.rpc('increment_whatsapp_count', {
        p_team_id: message.team_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          queue_id: queueId,
          whatsapp_message_id: whatsappMessageId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Send error:', error);
      sendError = error.message;

      // Extract error code if available
      let errorCode: string | null = null;
      const codeMatch = sendError.match(/Code:\s*(\d+)/);
      if (codeMatch) {
        errorCode = codeMatch[1];
      }

      // Update queue with error
      await supabase
        .from('whatsapp_queue')
        .update({
          status: message.attempts >= message.max_attempts ? 'failed' : 'queued',
          error_message: sendError,
        })
        .eq('id', queueId);

      // Create failed log entry
      await supabase.from('whatsapp_logs').insert({
        team_id: message.team_id,
        queue_id: queueId,
        template_id: message.template_id,
        to_number: message.to_number,
        from_number: settings.phone_number_id,
        message_type: message.message_type,
        content: message.content,
        status: 'failed',
        failure_reason: sendError,
        error_code: errorCode,
        failed_at: new Date().toISOString(),
      });

      throw error;
    }
  } catch (error) {
    console.error('WhatsApp service error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
