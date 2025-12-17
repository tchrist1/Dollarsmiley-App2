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

    const now = new Date();

    const { data: pendingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        title,
        provider_id,
        provider_response_deadline,
        customer:profiles!bookings_customer_id_fkey(full_name)
      `
      )
      .eq('status', 'PendingApproval')
      .not('provider_response_deadline', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    let notificationsCreated = 0;
    let bookingsExpired = 0;

    for (const booking of pendingBookings || []) {
      const deadline = new Date(booking.provider_response_deadline);
      const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

      if (hoursRemaining <= 0) {
        await supabase
          .from('bookings')
          .update({
            status: 'Cancelled',
            cancellation_reason: 'Provider did not respond within deadline',
            cancelled_at: now.toISOString(),
          })
          .eq('id', booking.id);

        await supabase.from('notifications').insert({
          user_id: booking.provider_id,
          type: 'booking_expired',
          title: 'Booking Request Expired',
          message: `The booking request from ${booking.customer.full_name} has expired due to no response`,
          data: {
            booking_id: booking.id,
            action_url: `/provider/booking-details?bookingId=${booking.id}`,
          },
        });

        bookingsExpired++;
      } else if (hoursRemaining <= 2) {
        await supabase.from('notifications').insert({
          user_id: booking.provider_id,
          type: 'booking_response_deadline',
          title: 'Urgent: Response Required',
          message: `Please respond to ${booking.customer.full_name}'s booking request. ${hoursRemaining} hours remaining.`,
          data: {
            booking_id: booking.id,
            hours_remaining: hoursRemaining,
            action_url: `/provider/booking-details?bookingId=${booking.id}`,
            priority: 'high',
          },
        });

        notificationsCreated++;
      } else if (hoursRemaining === 12 || hoursRemaining === 24) {
        await supabase.from('notifications').insert({
          user_id: booking.provider_id,
          type: 'booking_response_deadline',
          title: 'Response Required',
          message: `Please respond to ${booking.customer.full_name}'s booking request for ${booking.title}. ${hoursRemaining} hours remaining.`,
          data: {
            booking_id: booking.id,
            hours_remaining: hoursRemaining,
            action_url: `/provider/booking-details?bookingId=${booking.id}`,
          },
        });

        notificationsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking deadlines checked',
        notifications_sent: notificationsCreated,
        bookings_expired: bookingsExpired,
        bookings_checked: pendingBookings?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error checking booking deadlines:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
