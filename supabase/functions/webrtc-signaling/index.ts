import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const activeSessions = new Map<string, any>();

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
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { type, roomId, signalData, targetUserId } = await req.json();

    if (!type || !roomId) {
      return new Response(
        JSON.stringify({ error: 'type and roomId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    switch (type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const channel = supabase.channel(`room:${roomId}`);
        
        await channel.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type,
            from: user.id,
            to: targetUserId,
            data: signalData,
          },
        });

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'join': {
        if (!activeSessions.has(roomId)) {
          activeSessions.set(roomId, new Set());
        }
        activeSessions.get(roomId).add(user.id);

        const participants = Array.from(activeSessions.get(roomId) || []);

        return new Response(
          JSON.stringify({
            success: true,
            participants,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      case 'leave': {
        if (activeSessions.has(roomId)) {
          activeSessions.get(roomId).delete(user.id);
          if (activeSessions.get(roomId).size === 0) {
            activeSessions.delete(roomId);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid signal type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }
  } catch (error) {
    console.error('Error in WebRTC signaling:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});