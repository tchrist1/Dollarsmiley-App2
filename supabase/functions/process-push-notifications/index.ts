import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushNotification {
  id: string;
  push_token: string;
  title: string;
  body: string;
  data: Record<string, any>;
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

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_pending_push_notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ limit_param: 100 }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending notifications');
    }

    const notifications: PushNotification[] = await response.json();

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = notifications.map(notif => ({
      to: notif.push_token,
      title: notif.title,
      body: notif.body,
      data: notif.data,
      sound: 'default',
      priority: 'high',
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const pushResults = await pushResponse.json();

    for (let i = 0; i < notifications.length; i++) {
      const notif = notifications[i];
      const result = pushResults.data?.[i];

      const success = result?.status === 'ok';
      const errorMessage = result?.message || result?.details?.error;

      await fetch(`${supabaseUrl}/rest/v1/rpc/mark_notification_sent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          queue_id_param: notif.id,
          success_param: success,
          error_message_param: errorMessage,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        processed: notifications.length,
        results: pushResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing push notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});