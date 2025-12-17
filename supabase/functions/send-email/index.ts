import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SendGridRequest {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    subject: string;
  }>;
  from: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  content: Array<{ type: string; value: string }>;
  tracking_settings?: {
    click_tracking?: { enable: boolean };
    open_tracking?: { enable: boolean };
  };
}

interface MailgunData {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  'o:tracking-opens'?: string;
  'o:tracking-clicks'?: string;
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

    // Get next queued email
    const { data: queueId, error: queueError } = await supabase.rpc('get_next_queued_email');

    if (queueError) {
      console.error('Queue error:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to get queued email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queueId) {
      return new Response(
        JSON.stringify({ message: 'No emails in queue' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get email details
    const { data: email, error: emailError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (emailError || !email) {
      return new Response(
        JSON.stringify({ error: 'Failed to get email details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get email settings
    const { data: settings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('team_id', email.team_id)
      .single();

    if (settingsError || !settings) {
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          error_message: 'Email settings not configured',
        })
        .eq('id', queueId);

      return new Response(
        JSON.stringify({ error: 'Email settings not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let providerMessageId: string | null = null;
    let sendError: string | null = null;

    try {
      if (settings.provider === 'sendgrid') {
        // Send via SendGrid
        const sendGridRequest: SendGridRequest = {
          personalizations: [
            {
              to: [{ email: email.to_email, name: email.to_name }],
              subject: email.subject,
            },
          ],
          from: {
            email: email.from_email || settings.from_email,
            name: email.from_name || settings.from_name,
          },
          content: [
            { type: 'text/html', value: email.html_body },
            ...(email.text_body ? [{ type: 'text/plain', value: email.text_body }] : []),
          ],
          tracking_settings: {
            click_tracking: { enable: settings.track_clicks },
            open_tracking: { enable: settings.track_opens },
          },
        };

        if (email.reply_to_email || settings.reply_to_email) {
          sendGridRequest.reply_to = {
            email: email.reply_to_email || settings.reply_to_email!,
          };
        }

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendGridRequest),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`SendGrid error: ${errorData}`);
        }

        providerMessageId = response.headers.get('x-message-id');
      } else if (settings.provider === 'mailgun') {
        // Send via Mailgun
        const domain = settings.metadata?.domain || 'mg.example.com';
        const formData = new URLSearchParams();

        formData.append('from', `${email.from_name || settings.from_name || ''} <${email.from_email || settings.from_email}>`);
        formData.append('to', email.to_name ? `${email.to_name} <${email.to_email}>` : email.to_email);
        formData.append('subject', email.subject);
        formData.append('html', email.html_body);

        if (email.text_body) {
          formData.append('text', email.text_body);
        }

        if (email.reply_to_email || settings.reply_to_email) {
          formData.append('h:Reply-To', email.reply_to_email || settings.reply_to_email!);
        }

        if (settings.track_opens) {
          formData.append('o:tracking-opens', 'yes');
        }

        if (settings.track_clicks) {
          formData.append('o:tracking-clicks', 'yes');
        }

        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${settings.api_key}`)}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Mailgun error: ${errorData}`);
        }

        const result = await response.json();
        providerMessageId = result.id;
      } else {
        throw new Error(`Unsupported provider: ${settings.provider}`);
      }

      // Update queue status
      await supabase
        .from('email_queue')
        .update({ status: 'sent' })
        .eq('id', queueId);

      // Create log entry
      await supabase.from('email_logs').insert({
        team_id: email.team_id,
        queue_id: queueId,
        template_id: email.template_id,
        provider: settings.provider,
        provider_message_id: providerMessageId,
        to_email: email.to_email,
        to_name: email.to_name,
        from_email: email.from_email || settings.from_email,
        from_name: email.from_name || settings.from_name,
        subject: email.subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      // Increment email count
      await supabase.rpc('increment_email_count', {
        p_team_id: email.team_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          queue_id: queueId,
          provider_message_id: providerMessageId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Send error:', error);
      sendError = error.message;

      // Update queue with error
      await supabase
        .from('email_queue')
        .update({
          status: email.attempts >= email.max_attempts ? 'failed' : 'queued',
          error_message: sendError,
        })
        .eq('id', queueId);

      // Create failed log entry
      await supabase.from('email_logs').insert({
        team_id: email.team_id,
        queue_id: queueId,
        template_id: email.template_id,
        provider: settings.provider,
        to_email: email.to_email,
        to_name: email.to_name,
        from_email: email.from_email || settings.from_email,
        from_name: email.from_name || settings.from_name,
        subject: email.subject,
        status: 'failed',
        failure_reason: sendError,
        failed_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      });

      throw error;
    }
  } catch (error) {
    console.error('Email service error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
