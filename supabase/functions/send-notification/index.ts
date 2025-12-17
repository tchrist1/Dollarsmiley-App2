import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: "default" | "normal" | "high";
  channelId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, type, title, body, data, actionUrl, priority = "normal" } = await req.json();

    if (!userId || !type || !title || !body) {
      throw new Error("Missing required fields: userId, type, title, body");
    }

    const { data: preferences } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    const preferenceKey = type.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    const isEnabled = preferences?.push_enabled && preferences?.[preferenceKey] !== false;

    const { data: notificationRecord } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data: data || {},
        action_url: actionUrl,
        priority,
        is_read: false,
        is_sent: false,
      })
      .select()
      .single();

    if (!isEnabled || !preferences?.push_enabled) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Notification saved but not sent (user preferences)",
          notificationId: notificationRecord.id,
          sent: false,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: tokens } = await supabaseClient
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Notification saved but no active push tokens",
          notificationId: notificationRecord.id,
          sent: false,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const pushMessages: PushMessage[] = tokens.map(({ token }) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: {
        ...data,
        notificationId: notificationRecord.id,
        actionUrl,
        type,
      },
      priority: priority === "high" ? "high" : "default",
      channelId: "default",
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(pushMessages),
    });

    const pushResult = await pushResponse.json();

    const successCount = pushResult.data?.filter((r: any) => r.status === "ok").length || 0;
    const errorCount = pushResult.data?.filter((r: any) => r.status === "error").length || 0;

    await supabaseClient
      .from("notifications")
      .update({
        is_sent: successCount > 0,
        sent_at: new Date().toISOString(),
      })
      .eq("id", notificationRecord.id);

    if (successCount > 0) {
      await supabaseClient
        .from("push_tokens")
        .update({ last_used: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_active", true);
    }

    if (errorCount > 0 && pushResult.data) {
      for (let i = 0; i < pushResult.data.length; i++) {
        const result = pushResult.data[i];
        if (result.status === "error" && result.details?.error === "DeviceNotRegistered") {
          await supabaseClient
            .from("push_tokens")
            .update({ is_active: false })
            .eq("token", tokens[i].token);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Notification sent to ${successCount} device(s)`,
        notificationId: notificationRecord.id,
        sent: true,
        successCount,
        errorCount,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});