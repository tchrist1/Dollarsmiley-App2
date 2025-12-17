import { supabase } from './supabase';

/**
 * Quote Acceptance Service
 * Handles the complete flow of accepting a quote including:
 * - Booking confirmation
 * - Job status updates
 * - Other quote cancellation
 * - Provider notifications
 * - Payment intent creation
 * - Escrow setup
 */

export interface AcceptQuoteParams {
  quoteId: string;
  jobId: string;
  customerId: string;
  providerId: string;
  price: number;
  jobTitle: string;
  requiresDeposit?: boolean;
  depositAmount?: number;
}

export interface AcceptQuoteResult {
  success: boolean;
  bookingId: string;
  escrowId?: string;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Accept a quote and set up the booking
 */
export async function acceptQuote(params: AcceptQuoteParams): Promise<AcceptQuoteResult> {
  const {
    quoteId,
    jobId,
    customerId,
    providerId,
    price,
    jobTitle,
    requiresDeposit,
    depositAmount,
  } = params;

  try {
    // Step 1: Update booking status to Confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'Confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
      return {
        success: false,
        bookingId: quoteId,
        error: 'Failed to confirm booking',
      };
    }

    // Step 2: Update job status to Booked and assign provider
    const { error: jobError } = await supabase
      .from('jobs')
      .update({
        status: 'Booked',
        provider_id: providerId,
        booked_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (jobError) {
      console.error('Error updating job:', jobError);
      // Don't return error - job update is not critical
    }

    // Step 3: Cancel all other quotes for this job
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Another provider was selected',
      })
      .eq('job_id', jobId)
      .neq('id', quoteId)
      .eq('status', 'Requested');

    if (cancelError) {
      console.error('Error cancelling other quotes:', cancelError);
      // Don't return error - cancellation is not critical
    }

    // Step 4: Send notification to selected provider
    await supabase.from('notifications').insert({
      user_id: providerId,
      type: 'quote_accepted',
      title: 'Quote Accepted!',
      message: `Great news! Your quote for "${jobTitle}" has been accepted.`,
      data: {
        booking_id: quoteId,
        job_id: jobId,
        price: price,
      },
    });

    // Step 5: Send notifications to rejected providers
    const { data: rejectedQuotes } = await supabase
      .from('bookings')
      .select('provider_id')
      .eq('job_id', jobId)
      .eq('status', 'Cancelled')
      .neq('provider_id', providerId);

    if (rejectedQuotes && rejectedQuotes.length > 0) {
      const rejectedNotifications = rejectedQuotes.map((quote) => ({
        user_id: quote.provider_id,
        type: 'quote_rejected',
        title: 'Quote Not Selected',
        message: `Thank you for your quote for "${jobTitle}". The customer has chosen another provider.`,
        data: {
          job_id: jobId,
        },
      }));

      await supabase.from('notifications').insert(rejectedNotifications);
    }

    // Step 6: Create escrow hold for payment
    let escrowId: string | undefined;
    try {
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_holds')
        .insert({
          booking_id: quoteId,
          amount: price,
          status: 'pending',
        })
        .select()
        .single();

      if (!escrowError && escrowData) {
        escrowId = escrowData.id;
      }
    } catch (error) {
      console.error('Error creating escrow:', error);
      // Don't fail the entire flow if escrow fails
    }

    // Step 7: Record in booking history
    await supabase.from('booking_history').insert({
      booking_id: quoteId,
      action: 'quote_accepted',
      actor_id: customerId,
      details: {
        provider_id: providerId,
        price: price,
        job_title: jobTitle,
      },
    });

    return {
      success: true,
      bookingId: quoteId,
      escrowId,
    };
  } catch (error) {
    console.error('Error in acceptQuote:', error);
    return {
      success: false,
      bookingId: quoteId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get booking details after acceptance
 */
export async function getAcceptedBookingDetails(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      price,
      service_date,
      service_time,
      confirmed_at,
      provider:profiles!bookings_provider_id_fkey(
        id,
        full_name,
        email,
        phone,
        avatar_url,
        rating_average
      ),
      customer:profiles!bookings_customer_id_fkey(
        id,
        full_name,
        email,
        phone
      ),
      job:jobs!bookings_job_id_fkey(
        id,
        title,
        description,
        location,
        execution_date_start
      )
    `
    )
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Error fetching booking details:', error);
    return null;
  }

  return data;
}

/**
 * Cancel an accepted quote (within cancellation window)
 */
export async function cancelAcceptedQuote(
  bookingId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, job:jobs!bookings_job_id_fkey(*)')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Check if within cancellation window (24 hours)
    const confirmedAt = new Date(booking.confirmed_at);
    const now = new Date();
    const hoursSinceConfirmation = (now.getTime() - confirmedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceConfirmation > 24) {
      return {
        success: false,
        error: 'Cancellation window has passed. Please contact support.',
      };
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason,
      })
      .eq('id', bookingId);

    if (updateError) {
      return { success: false, error: 'Failed to cancel booking' };
    }

    // Update job status back to Open
    await supabase
      .from('jobs')
      .update({
        status: 'Open',
        provider_id: null,
      })
      .eq('id', booking.job_id);

    // Release escrow hold
    await supabase
      .from('escrow_holds')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId);

    // Send cancellation notifications
    const notifyUserId = userId === booking.customer_id ? booking.provider_id : booking.customer_id;
    await supabase.from('notifications').insert({
      user_id: notifyUserId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `The booking for "${booking.job?.title}" has been cancelled. Reason: ${reason}`,
      data: { booking_id: bookingId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validate quote before acceptance
 */
export async function validateQuoteForAcceptance(quoteId: string): Promise<{
  valid: boolean;
  error?: string;
  quote?: any;
}> {
  try {
    const { data: quote, error } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        price,
        valid_until,
        job:jobs!bookings_job_id_fkey(
          id,
          status,
          title
        ),
        provider:profiles!bookings_provider_id_fkey(
          id,
          full_name
        )
      `
      )
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      return { valid: false, error: 'Quote not found' };
    }

    // Check if quote is still in Requested status
    if (quote.status !== 'Requested') {
      return { valid: false, error: 'Quote is no longer available' };
    }

    // Check if quote is expired
    if (quote.valid_until) {
      const expiryDate = new Date(quote.valid_until);
      if (expiryDate < new Date()) {
        return { valid: false, error: 'Quote has expired' };
      }
    }

    // Check if job is still open
    if (quote.job?.status !== 'Open') {
      return { valid: false, error: 'Job is no longer available' };
    }

    return { valid: true, quote };
  } catch (error) {
    console.error('Error validating quote:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation error',
    };
  }
}

/**
 * Get quote acceptance statistics
 */
export async function getQuoteAcceptanceStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('status, created_at, confirmed_at')
      .eq('customer_id', userId);

    if (error || !data) {
      return null;
    }

    const total = data.length;
    const accepted = data.filter((b) => b.status === 'Confirmed').length;
    const cancelled = data.filter((b) => b.status === 'Cancelled').length;
    const pending = data.filter((b) => b.status === 'Requested').length;

    // Calculate average time to accept
    const acceptedBookings = data.filter((b) => b.confirmed_at && b.created_at);
    const avgTimeToAccept =
      acceptedBookings.reduce((acc, b) => {
        const created = new Date(b.created_at).getTime();
        const confirmed = new Date(b.confirmed_at!).getTime();
        return acc + (confirmed - created);
      }, 0) / acceptedBookings.length;

    return {
      total,
      accepted,
      cancelled,
      pending,
      acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      avgTimeToAcceptHours: avgTimeToAccept / (1000 * 60 * 60),
    };
  } catch (error) {
    console.error('Error getting acceptance stats:', error);
    return null;
  }
}
