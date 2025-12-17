import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateMockTrackingEvents(carrier: string, trackingNumber: string) {
  const now = new Date();
  const events = [];

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  events.push({
    timestamp: dayAgo.toISOString(),
    status: "InTransit",
    location: "Distribution Center",
    description: "Package in transit to next facility",
  });

  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  events.push({
    timestamp: twoDaysAgo.toISOString(),
    status: "InTransit",
    location: "Origin Facility",
    description: "Departed from origin facility",
  });

  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  events.push({
    timestamp: threeDaysAgo.toISOString(),
    status: "Pending",
    location: "Origin",
    description: "Shipment information received",
  });

  return events.reverse();
}

function estimateDeliveryDate(carrier: string): string {
  const now = new Date();
  now.setDate(now.getDate() + 3);
  return now.toISOString().split('T')[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { shipmentId, trackingNumber, carrier } = await req.json();

    if (!shipmentId || !trackingNumber || !carrier) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const trackingEvents = generateMockTrackingEvents(carrier, trackingNumber);
    const latestEvent = trackingEvents[trackingEvents.length - 1];
    const estimatedDelivery = estimateDeliveryDate(carrier);

    const { error: updateError } = await supabaseClient
      .from("shipments")
      .update({
        tracking_events: trackingEvents,
        status: latestEvent.status,
        estimated_delivery_date: estimatedDelivery,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shipmentId);

    if (updateError) {
      throw updateError;
    }

    if (latestEvent.status === "Delivered") {
      const { data: shipment } = await supabaseClient
        .from("shipments")
        .select("booking_id")
        .eq("id", shipmentId)
        .single();

      if (shipment) {
        await supabaseClient
          .from("bookings")
          .update({ delivery_confirmed_at: new Date().toISOString() })
          .eq("id", shipment.booking_id);

        const { data: booking } = await supabaseClient
          .from("bookings")
          .select("customer_id, provider_id, title")
          .eq("id", shipment.booking_id)
          .single();

        if (booking) {
          await supabaseClient.from("notifications").insert([
            {
              user_id: booking.customer_id,
              type: "DeliveryConfirmed",
              title: "Package Delivered",
              message: `Your package for \"${booking.title}\" has been delivered`,
              data: { booking_id: shipment.booking_id, shipment_id: shipmentId },
            },
            {
              user_id: booking.provider_id,
              type: "DeliveryConfirmed",
              title: "Package Delivered",
              message: `Package for \"${booking.title}\" has been delivered`,
              data: { booking_id: shipment.booking_id, shipment_id: shipmentId },
            },
          ]);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: latestEvent.status,
        events: trackingEvents,
        estimatedDelivery: estimatedDelivery,
        trackingNumber: trackingNumber,
        carrier: carrier,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error tracking shipment:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});