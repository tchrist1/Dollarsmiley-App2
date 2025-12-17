import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BookingReminder {
  booking_id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  price: number;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  provider_id: string;
  provider_name: string;
  provider_email: string;
  hours_until: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting 1-hour booking reminder job...");

    // Get bookings needing 1-hour reminders
    const { data: bookingsNeedingReminders, error: fetchError } = await supabase.rpc(
      "get_bookings_needing_reminders",
      {
        reminder_type_param: "1_hour",
      }
    );

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${bookingsNeedingReminders?.length || 0} bookings needing 1-hour reminders`);

    let customerReminders = 0;
    let providerReminders = 0;
    let skippedReminders = 0;
    let failedReminders = 0;

    for (const booking of (bookingsNeedingReminders as BookingReminder[]) || []) {
      console.log(
        `Processing booking ${booking.booking_id}: ${booking.title} (${booking.hours_until}h until)`
      );

      try {
        // Check if customer wants 1-hour reminders
        const { data: customerPrefs } = await supabase.rpc("should_send_reminder", {
          user_id_param: booking.customer_id,
          reminder_type_param: "1_hour_reminder",
        });

        // Send customer reminder
        if (customerPrefs !== false) {
          const minsUntil = Math.round(booking.hours_until * 60);
          const timeText = minsUntil >= 60 ? "1 hour" : `${minsUntil} minutes`;

          const customerNotification = {
            user_id: booking.customer_id,
            type: "booking_reminder",
            title: "Booking Starting Soon",
            message: `Reminder: Your ${booking.title} booking starts in ${timeText} at ${booking.scheduled_time}`,
            data: {
              booking_id: booking.booking_id,
              scheduled_date: booking.scheduled_date,
              scheduled_time: booking.scheduled_time,
              location: booking.location,
              provider_name: booking.provider_name,
              hours_until: booking.hours_until,
              action_url: `/booking/${booking.booking_id}`,
            },
          };

          const { data: customerNotif, error: customerNotifError } = await supabase
            .from("notifications")
            .insert(customerNotification)
            .select()
            .single();

          if (customerNotifError) {
            console.error("Failed to send customer notification:", customerNotifError);
            failedReminders++;
          } else {
            // Track reminder
            await supabase.from("booking_reminders").insert({
              booking_id: booking.booking_id,
              reminder_type: "1_hour",
              sent_to: booking.customer_id,
              notification_id: customerNotif.id,
              delivery_status: "Sent",
            });

            customerReminders++;
            console.log(`✓ Sent 1-hour reminder to customer: ${booking.customer_name}`);
          }
        } else {
          skippedReminders++;
          console.log(`⊘ Skipped customer reminder (preferences): ${booking.customer_name}`);
        }

        // Check if provider wants 1-hour reminders
        const { data: providerPrefs } = await supabase.rpc("should_send_reminder", {
          user_id_param: booking.provider_id,
          reminder_type_param: "1_hour_reminder",
        });

        // Send provider reminder
        if (providerPrefs !== false) {
          const minsUntil = Math.round(booking.hours_until * 60);
          const timeText = minsUntil >= 60 ? "1 hour" : `${minsUntil} minutes`;

          const providerNotification = {
            user_id: booking.provider_id,
            type: "booking_reminder",
            title: "Service Starting Soon",
            message: `Reminder: Service for ${booking.customer_name} starts in ${timeText} at ${booking.scheduled_time}`,
            data: {
              booking_id: booking.booking_id,
              customer_name: booking.customer_name,
              scheduled_date: booking.scheduled_date,
              scheduled_time: booking.scheduled_time,
              location: booking.location,
              price: booking.price,
              hours_until: booking.hours_until,
              action_url: `/provider/booking-details?bookingId=${booking.booking_id}`,
            },
          };

          const { data: providerNotif, error: providerNotifError } = await supabase
            .from("notifications")
            .insert(providerNotification)
            .select()
            .single();

          if (providerNotifError) {
            console.error("Failed to send provider notification:", providerNotifError);
            failedReminders++;
          } else {
            // Track reminder
            await supabase.from("booking_reminders").insert({
              booking_id: booking.booking_id,
              reminder_type: "1_hour",
              sent_to: booking.provider_id,
              notification_id: providerNotif.id,
              delivery_status: "Sent",
            });

            providerReminders++;
            console.log(`✓ Sent 1-hour reminder to provider: ${booking.provider_name}`);
          }
        } else {
          skippedReminders++;
          console.log(`⊘ Skipped provider reminder (preferences): ${booking.provider_name}`);
        }
      } catch (bookingError) {
        console.error(`Error processing booking ${booking.booking_id}:`, bookingError);
        failedReminders += 2; // Failed for both customer and provider
      }
    }

    const totalSent = customerReminders + providerReminders;
    const result = {
      success: true,
      message: `Sent ${totalSent} 1-hour booking reminders`,
      details: {
        bookings_checked: bookingsNeedingReminders?.length || 0,
        customer_reminders: customerReminders,
        provider_reminders: providerReminders,
        total_sent: totalSent,
        skipped: skippedReminders,
        failed: failedReminders,
      },
    };

    console.log("1-hour reminder job completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in 1-hour booking reminders job:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
