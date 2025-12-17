import { supabase } from './supabase';

interface RefundEligibility {
  eligible: boolean;
  refund_percentage: number;
  refund_amount: number;
  original_amount: number;
  days_until_booking: number;
  policy: string;
  reason?: string;
}

interface RefundStatus {
  has_cancellation: boolean;
  cancelled_at?: string;
  cancelled_by_role?: string;
  refund_status?: string;
  refund_amount?: number;
  processing_status?: string;
  processing_attempts?: number;
  processing_error?: string;
}

/**
 * Calculate refund eligibility for a booking cancellation
 */
export async function calculateRefundEligibility(
  bookingId: string,
  cancelledByRole: 'Customer' | 'Provider'
): Promise<RefundEligibility> {
  try {
    const { data, error } = await supabase.rpc('calculate_refund_eligibility', {
      booking_id_param: bookingId,
      cancelled_by_role_param: cancelledByRole,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error calculating refund eligibility:', error);
    throw error;
  }
}

/**
 * Process automatic refund for a cancelled booking
 */
export async function processAutomaticRefund(
  bookingId: string,
  cancellationId: string,
  refundAmount: number,
  reason?: string
): Promise<{ success: boolean; refund_id?: string; error?: string }> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session');
    }

    // Call edge function to process refund
    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-automatic-refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          cancellation_id: cancellationId,
          refund_amount: refundAmount,
          reason: reason,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to process refund');
    }

    return result;
  } catch (error: any) {
    console.error('Error processing automatic refund:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get refund status for a booking
 */
export async function getBookingRefundStatus(
  bookingId: string
): Promise<RefundStatus> {
  try {
    const { data, error } = await supabase.rpc('get_booking_refund_status', {
      booking_id_param: bookingId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting refund status:', error);
    throw error;
  }
}

/**
 * Retry a failed refund
 */
export async function retryFailedRefund(
  refundQueueId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('retry_failed_refund', {
      refund_queue_id: refundQueueId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error retrying refund:', error);
    return false;
  }
}

/**
 * Get pending refunds (admin only)
 */
export async function getPendingRefunds(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('refund_processing_queue')
      .select(
        `
        *,
        booking:bookings(
          id,
          title,
          price,
          customer:profiles!bookings_customer_id_fkey(full_name, email)
        )
      `
      )
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting pending refunds:', error);
    return [];
  }
}

/**
 * Process all pending refunds (admin/system only)
 */
export async function processPendingRefunds(): Promise<{
  processed: number;
  failed: number;
}> {
  try {
    const { data, error } = await supabase.rpc('process_pending_refunds');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error processing pending refunds:', error);
    return { processed: 0, failed: 0 };
  }
}

/**
 * Format refund policy text for display
 */
export function getRefundPolicyText(
  daysUntilBooking: number,
  cancelledByRole: 'Customer' | 'Provider'
): string {
  if (cancelledByRole === 'Provider') {
    return 'Provider cancellations result in full refund to customer.';
  }

  if (daysUntilBooking >= 7) {
    return 'Full refund (100%) - Cancelling 7+ days before booking.';
  } else if (daysUntilBooking >= 3) {
    return 'Partial refund (50%) - Cancelling 3-6 days before booking.';
  } else if (daysUntilBooking >= 1) {
    return 'Partial refund (25%) - Cancelling 1-2 days before booking.';
  } else {
    return 'No refund - Cancelling within 24 hours of booking.';
  }
}

/**
 * Calculate days until booking
 */
export function calculateDaysUntilBooking(scheduledDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookingDate = new Date(scheduledDate);
  bookingDate.setHours(0, 0, 0, 0);

  const diffTime = bookingDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get refund percentage based on days until booking
 */
export function getRefundPercentage(
  daysUntilBooking: number,
  cancelledByRole: 'Customer' | 'Provider'
): number {
  if (cancelledByRole === 'Provider') {
    return 100;
  }

  if (daysUntilBooking >= 7) {
    return 100;
  } else if (daysUntilBooking >= 3) {
    return 50;
  } else if (daysUntilBooking >= 1) {
    return 25;
  } else {
    return 0;
  }
}
