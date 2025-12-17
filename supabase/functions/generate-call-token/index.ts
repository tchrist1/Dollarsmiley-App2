import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hmac } from 'npm:@noble/hashes@1.3.3/hmac';
import { sha256 } from 'npm:@noble/hashes@1.3.3/sha256';

async function generateAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  privilegeExpiredTs: number
): Promise<string> {
  const version = '007';
  const randomInt = Math.floor(Math.random() * 0xFFFFFFFF);
  const salt = randomInt;

  const message = `${appId}${channelName}${uid}${salt}${privilegeExpiredTs}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  const certBytes = encoder.encode(appCertificate);

  const signature = hmac(sha256, certBytes, messageBytes);
  const signatureHex = Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const content = `${version}${appId}${salt}${privilegeExpiredTs}${signatureHex}`;
  const token = btoa(content);

  return token;
}

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

    const { callId, roomId } = await req.json();

    if (!callId || !roomId) {
      return new Response(
        JSON.stringify({ error: 'callId and roomId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: call, error: callError } = await supabase
      .from('video_calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return new Response(
        JSON.stringify({ error: 'Call not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isHost = call.host_id === user.id;
    const isParticipant = call.participant_ids?.includes(user.id);

    if (!isHost && !isParticipant) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to join this call' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID');
    const AGORA_APP_CERT = Deno.env.get('AGORA_APP_CERT');

    if (!AGORA_APP_ID || !AGORA_APP_CERT) {
      return new Response(
        JSON.stringify({ error: 'Agora credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const uid = Math.floor(Math.random() * 100000);
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const agoraToken = await generateAgoraToken(
      AGORA_APP_ID,
      AGORA_APP_CERT,
      call.room_id,
      uid,
      privilegeExpiredTs
    );

    const token = {
      roomId: call.room_id,
      userId: user.id,
      userName: user.email,
      role: isHost ? 'host' : 'participant',
      callId: call.id,
      uid,
      permissions: {
        audio: true,
        video: true,
        screenShare: call.screen_sharing_enabled,
        recording: call.recording_enabled && isHost,
      },
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    };

    const tokenString = agoraToken;

    return new Response(
      JSON.stringify({
        token: tokenString,
        roomId: call.room_id,
        callId: call.id,
        uid: token.uid,
        permissions: token.permissions,
        appId: AGORA_APP_ID,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating call token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});