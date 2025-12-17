import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userIds, title, body, data, batchType } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const notificationIds: string[] = [];

    for (const userId of userIds) {
      const { data: queueId, error } = await supabase.rpc('queue_push_notification', {
        user_id_param: userId,
        title_param: title,
        body_param: body,
        data_param: data || {},
        scheduled_for_param: new Date().toISOString(),
      });

      if (!error && queueId) {
        notificationIds.push(queueId);
      }
    }

    const batchSummary = `Sent to ${userIds.length} user${userIds.length > 1 ? 's' : ''}`;

    for (const userId of userIds) {
      await supabase.from('notification_batches').insert({
        user_id: userId,
        batch_type: batchType || 'general',
        notification_ids: notificationIds,
        title,
        summary: batchSummary,
        notification_count: notificationIds.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: notificationIds.length,
        batchSummary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending batch notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});