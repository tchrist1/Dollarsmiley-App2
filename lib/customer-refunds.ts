import { supabase } from './supabase';

export type CustomerRefundStatus = 'Pending' | 'Completed' | 'Failed';

export interface CustomerRefund {
  id: string;
  booking_id: string;
  amount: number;
  reason: string;
  status: CustomerRefundStatus;
  notes: string | null;
  requested_by: string;
  approved_by: string | null;
  processed_at: string | null;
  created_at: string;
  booking?: {
    id: string;
    title: string;
    price: number;
    scheduled_date: string;
    status: string;
  };
}

export interface RefundEligibility {
  eligible: boolean;
  refund_percentage: number;
  refund_amount: number;
  original_amount: number;
  days_until_booking: number;
  policy: string;
  reason?: string;
}

export interface RefundRequestData {
  booking_id: string;
  amount: number;
  reason: string;
  notes?: string;
}

/**
 * Get customer's refund requests
 */
export async function getCustomerRefunds(userId: string): Promise<CustomerRefund[]> {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          scheduled_date,
          status
        )
      `)
      .eq('requested_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching customer refunds:', error);
    return [];
  }
}

/**
 * Get refund for a specific booking
 */
export async function getBookingRefund(
  bookingId: string,
  userId: string
): Promise<CustomerRefund | null> {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          scheduled_date,
          status
        )
      `)
      .eq('booking_id', bookingId)
      .eq('requested_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching booking refund:', error);
    return null;
  }
}

/**
 * Check refund eligibility for a booking
 */
export async function checkRefundEligibility(
  bookingId: string
): Promise<RefundEligibility | null> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, price, scheduled_date, status, customer_id, provider_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        eligible: false,
        refund_percentage: 0,
        refund_amount: 0,
        original_amount: 0,
        days_until_booking: 0,
        policy: 'Booking not found',
        reason: 'Booking not found',
      };
    }

    // Calculate days until booking
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.scheduled_date);
    bookingDate.setHours(0, 0, 0, 0);
    const diffTime = bookingDate.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Check if booking is eligible for refund
    if (booking.status === 'Completed') {
      return {
        eligible: false,
        refund_percentage: 0,
        refund_amount: 0,
        original_amount: booking.price,
        days_until_booking: daysUntil,
        policy: 'Completed bookings cannot be refunded',
        reason: 'Booking already completed',
      };
    }

    if (booking.status === 'Cancelled') {
      return {
        eligible: false,
        refund_percentage: 0,
        refund_amount: 0,
        original_amount: booking.price,
        days_until_booking: daysUntil,
        policy: 'Booking already cancelled',
        reason: 'Booking already cancelled',
      };
    }

    // Check if refund already exists
    const { data: existingRefund } = await supabase
      .from('refunds')
      .select('id, status')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingRefund) {
      return {
        eligible: false,
        refund_percentage: 0,
        refund_amount: 0,
        original_amount: booking.price,
        days_until_booking: daysUntil,
        policy: 'Refund already requested',
        reason: `Refund already ${existingRefund.status.toLowerCase()}`,
      };
    }

    // Calculate refund percentage based on cancellation policy
    let refundPercentage = 0;
    let policy = '';

    if (daysUntil >= 7) {
      refundPercentage = 100;
      policy = 'Full refund (100%) - Cancelling 7+ days before booking';
    } else if (daysUntil >= 3) {
      refundPercentage = 50;
      policy = 'Partial refund (50%) - Cancelling 3-6 days before booking';
    } else if (daysUntil >= 1) {
      refundPercentage = 25;
      policy = 'Partial refund (25%) - Cancelling 1-2 days before booking';
    } else {
      refundPercentage = 0;
      policy = 'No refund - Cancelling within 24 hours of booking';
    }

    const refundAmount = (booking.price * refundPercentage) / 100;

    return {
      eligible: refundPercentage > 0,
      refund_percentage: refundPercentage,
      refund_amount: refundAmount,
      original_amount: booking.price,
      days_until_booking: daysUntil,
      policy,
    };
  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    return null;
  }
}

/**
 * Submit refund request
 */
export async function submitRefundRequest(
  refundData: RefundRequestData,
  userId: string
): Promise<{ success: boolean; refund_id?: string; error?: string }> {
  try {
    // Check eligibility first
    const eligibility = await checkRefundEligibility(refundData.booking_id);

    if (!eligibility) {
      return {
        success: false,
        error: 'Unable to check refund eligibility',
      };
    }

    if (!eligibility.eligible) {
      return {
        success: false,
        error: eligibility.reason || 'Booking is not eligible for refund',
      };
    }

    // Create refund request
    const { data, error } = await supabase
      .from('refunds')
      .insert([
        {
          booking_id: refundData.booking_id,
          amount: refundData.amount,
          reason: refundData.reason,
          notes: refundData.notes,
          requested_by: userId,
          status: 'Pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Update booking status
    await supabase
      .from('bookings')
      .update({
        refund_requested: true,
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: refundData.reason,
      })
      .eq('id', refundData.booking_id);

    return {
      success: true,
      refund_id: data.id,
    };
  } catch (error: any) {
    console.error('Error submitting refund request:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit refund request',
    };
  }
}

/**
 * Cancel refund request (only if pending)
 */
export async function cancelRefundRequest(
  refundId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if refund exists and is pending
    const { data: refund, error: fetchError } = await supabase
      .from('refunds')
      .select('status, requested_by')
      .eq('id', refundId)
      .single();

    if (fetchError || !refund) {
      return {
        success: false,
        error: 'Refund not found',
      };
    }

    if (refund.requested_by !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (refund.status !== 'Pending') {
      return {
        success: false,
        error: 'Can only cancel pending refund requests',
      };
    }

    // Update refund status to failed (cancelled by user)
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'Failed',
        notes: 'Cancelled by customer',
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling refund request:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel refund request',
    };
  }
}

/**
 * Get refund statistics for customer
 */
export async function getCustomerRefundStats(userId: string): Promise<{
  total_refunds: number;
  pending_refunds: number;
  completed_refunds: number;
  total_refunded_amount: number;
}> {
  try {
    const refunds = await getCustomerRefunds(userId);

    const pending = refunds.filter((r) => r.status === 'Pending').length;
    const completed = refunds.filter((r) => r.status === 'Completed').length;
    const totalAmount = refunds
      .filter((r) => r.status === 'Completed')
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      total_refunds: refunds.length,
      pending_refunds: pending,
      completed_refunds: completed,
      total_refunded_amount: totalAmount,
    };
  } catch (error) {
    console.error('Error getting refund stats:', error);
    return {
      total_refunds: 0,
      pending_refunds: 0,
      completed_refunds: 0,
      total_refunded_amount: 0,
    };
  }
}

/**
 * Subscribe to refund updates
 */
export function subscribeToRefundUpdates(
  userId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('refund-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'refunds',
        filter: `requested_by=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get status color
 */
export function getRefundStatusColor(status: CustomerRefundStatus): string {
  const colors: Record<CustomerRefundStatus, string> = {
    Pending: '#F59E0B',
    Completed: '#10B981',
    Failed: '#EF4444',
  };
  return colors[status];
}

/**
 * Get status display text
 */
export function getRefundStatusText(status: CustomerRefundStatus): string {
  const text: Record<CustomerRefundStatus, string> = {
    Pending: 'Under Review',
    Completed: 'Refunded',
    Failed: 'Declined',
  };
  return text[status];
}

/**
 * Get refund reason display text
 */
export function getRefundReasonDisplay(reason: string): string {
  const reasonMap: Record<string, string> = {
    Cancelled: 'I need to cancel this booking',
    ScheduleConflict: 'Schedule conflict',
    ServiceNotNeeded: 'Service no longer needed',
    FoundAlternative: 'Found alternative service',
    PriceIssue: 'Price concerns',
    Other: 'Other reason',
  };
  return reasonMap[reason] || reason;
}

/**
 * Get refund policy summary
 */
export function getRefundPolicySummary(): string[] {
  return [
    '7+ days before: 100% refund',
    '3-6 days before: 50% refund',
    '1-2 days before: 25% refund',
    'Within 24 hours: No refund',
  ];
}

/**
 * Calculate expected refund amount
 */
export function calculateExpectedRefund(
  originalAmount: number,
  daysUntilBooking: number
): { amount: number; percentage: number } {
  let percentage = 0;

  if (daysUntilBooking >= 7) {
    percentage = 100;
  } else if (daysUntilBooking >= 3) {
    percentage = 50;
  } else if (daysUntilBooking >= 1) {
    percentage = 25;
  } else {
    percentage = 0;
  }

  return {
    amount: (originalAmount * percentage) / 100,
    percentage,
  };
}

/**
 * Validate refund reason
 */
export function validateRefundReason(reason: string, notes?: string): {
  valid: boolean;
  error?: string;
} {
  if (!reason || reason.trim() === '') {
    return {
      valid: false,
      error: 'Please select a reason for your refund request',
    };
  }

  if (reason === 'Other' && (!notes || notes.trim() === '')) {
    return {
      valid: false,
      error: 'Please provide additional details for your refund request',
    };
  }

  return { valid: true };
}

/**
 * Check if refund is still processing
 */
export function isRefundProcessing(refund: CustomerRefund): boolean {
  if (refund.status !== 'Pending') {
    return false;
  }

  const createdDate = new Date(refund.created_at);
  const now = new Date();
  const hoursSinceCreated =
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

  return hoursSinceCreated < 72;
}

/**
 * Get estimated processing time
 */
export function getEstimatedProcessingTime(refund: CustomerRefund): string {
  if (refund.status !== 'Pending') {
    return '';
  }

  const createdDate = new Date(refund.created_at);
  const now = new Date();
  const hoursSinceCreated =
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, 72 - hoursSinceCreated);

  if (hoursRemaining < 24) {
    return `Usually processed within ${Math.ceil(hoursRemaining)} hours`;
  }

  const daysRemaining = Math.ceil(hoursRemaining / 24);
  return `Usually processed within ${daysRemaining} day${
    daysRemaining > 1 ? 's' : ''
  }`;
}
