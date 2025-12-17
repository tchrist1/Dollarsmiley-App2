import { supabase } from './supabase';

export interface RecurringPayment {
  id: string;
  recurring_booking_id: string;
  customer_id: string;
  payment_method_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  stripe_payment_intent_id?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  charged_at?: string;
  created_at: string;
}

export interface PaymentFailureNotification {
  customer_id: string;
  recurring_booking_id: string;
  amount: number;
  failure_reason: string;
  retry_count: number;
  next_retry_at?: string;
}

export async function createRecurringPayment(
  recurringBookingId: string,
  customerId: string,
  paymentMethodId: string,
  amount: number
): Promise<RecurringPayment | null> {
  try {
    const { data, error } = await supabase
      .from('recurring_payments')
      .insert({
        recurring_booking_id: recurringBookingId,
        customer_id: customerId,
        payment_method_id: paymentMethodId,
        amount,
        currency: 'usd',
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating recurring payment:', error);
    return null;
  }
}

export async function processRecurringPayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    if (payment.status !== 'pending') {
      return { success: false, error: 'Payment already processed' };
    }

    // Update status to processing
    await supabase
      .from('recurring_payments')
      .update({ status: 'processing' })
      .eq('id', paymentId);

    // Call Stripe edge function to charge payment
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/charge-recurring-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          payment_id: paymentId,
          payment_method_id: payment.payment_method_id,
          amount: payment.amount,
          currency: payment.currency,
          customer_id: payment.customer_id,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Payment failed');
    }

    // Update payment as succeeded
    await supabase
      .from('recurring_payments')
      .update({
        status: 'succeeded',
        stripe_payment_intent_id: result.payment_intent_id,
        charged_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // Create transaction record
    await createPaymentTransaction(payment, result.payment_intent_id);

    return { success: true };
  } catch (error: any) {
    console.error('Error processing recurring payment:', error);

    // Handle failure and retry logic
    await handlePaymentFailure(paymentId, error.message);

    return { success: false, error: error.message };
  }
}

async function handlePaymentFailure(paymentId: string, failureReason: string): Promise<void> {
  try {
    const { data: payment } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) return;

    const newRetryCount = payment.retry_count + 1;
    const shouldRetry = newRetryCount < payment.max_retries;

    if (shouldRetry) {
      // Calculate next retry time (exponential backoff: 1h, 4h, 24h)
      const hoursToAdd = Math.pow(4, newRetryCount - 1);
      const nextRetry = new Date();
      nextRetry.setHours(nextRetry.getHours() + hoursToAdd);

      await supabase
        .from('recurring_payments')
        .update({
          status: 'pending',
          failure_reason: failureReason,
          retry_count: newRetryCount,
          next_retry_at: nextRetry.toISOString(),
        })
        .eq('id', paymentId);

      // Notify customer about retry
      await notifyPaymentRetry(payment, newRetryCount, nextRetry.toISOString());
    } else {
      // Max retries reached, mark as failed
      await supabase
        .from('recurring_payments')
        .update({
          status: 'failed',
          failure_reason: failureReason,
        })
        .eq('id', paymentId);

      // Notify customer about failure
      await notifyPaymentFailed(payment, failureReason);

      // Pause the recurring booking
      await supabase
        .from('recurring_bookings')
        .update({ is_active: false })
        .eq('id', payment.recurring_booking_id);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function createPaymentTransaction(
  payment: RecurringPayment,
  paymentIntentId: string
): Promise<void> {
  try {
    await supabase.from('transactions').insert({
      user_id: payment.customer_id,
      type: 'payment',
      amount: -payment.amount,
      description: 'Recurring booking payment',
      status: 'completed',
      payment_method: 'card',
      stripe_payment_intent_id: paymentIntentId,
      recurring_payment_id: payment.id,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
  }
}

async function notifyPaymentRetry(
  payment: RecurringPayment,
  retryCount: number,
  nextRetryAt: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: payment.customer_id,
      title: 'Payment Retry Scheduled',
      message: `Your recurring payment failed. We'll retry automatically on ${new Date(
        nextRetryAt
      ).toLocaleDateString()}. Please ensure your payment method is valid.`,
      type: 'payment_failed',
      reference_id: payment.id,
    });
  } catch (error) {
    console.error('Error sending retry notification:', error);
  }
}

async function notifyPaymentFailed(
  payment: RecurringPayment,
  failureReason: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: payment.customer_id,
      title: 'Recurring Payment Failed',
      message: `Your recurring booking payment could not be processed after multiple attempts. Your recurring booking has been paused. Please update your payment method and resume the booking. Reason: ${failureReason}`,
      type: 'payment_failed',
      reference_id: payment.id,
    });
  } catch (error) {
    console.error('Error sending failure notification:', error);
  }
}

export async function getPendingRecurringPayments(): Promise<RecurringPayment[]> {
  try {
    const { data, error } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('status', 'pending')
      .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting pending payments:', error);
    return [];
  }
}

export async function getRecurringPaymentsByBooking(
  recurringBookingId: string
): Promise<RecurringPayment[]> {
  try {
    const { data, error } = await supabase
      .from('recurring_payments')
      .select('*')
      .eq('recurring_booking_id', recurringBookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting payments by booking:', error);
    return [];
  }
}

export async function cancelRecurringPayment(paymentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('recurring_payments')
      .update({ status: 'cancelled' })
      .eq('id', paymentId)
      .eq('status', 'pending');

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return false;
  }
}

export async function retryFailedPayment(paymentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('recurring_payments')
      .update({
        status: 'pending',
        retry_count: 0,
        next_retry_at: null,
      })
      .eq('id', paymentId);

    if (error) throw error;

    // Process immediately
    await processRecurringPayment(paymentId);

    return true;
  } catch (error) {
    console.error('Error retrying payment:', error);
    return false;
  }
}

export async function updatePaymentMethod(
  recurringBookingId: string,
  newPaymentMethodId: string
): Promise<boolean> {
  try {
    // Update recurring booking's default payment method
    const { error: bookingError } = await supabase
      .from('recurring_bookings')
      .update({ payment_method_id: newPaymentMethodId })
      .eq('id', recurringBookingId);

    if (bookingError) throw bookingError;

    // Update pending payments to use new payment method
    const { error: paymentsError } = await supabase
      .from('recurring_payments')
      .update({ payment_method_id: newPaymentMethodId })
      .eq('recurring_booking_id', recurringBookingId)
      .eq('status', 'pending');

    if (paymentsError) throw paymentsError;

    return true;
  } catch (error) {
    console.error('Error updating payment method:', error);
    return false;
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'succeeded':
      return '#10B981'; // green
    case 'processing':
      return '#3B82F6'; // blue
    case 'pending':
      return '#F59E0B'; // orange
    case 'failed':
      return '#EF4444'; // red
    case 'cancelled':
      return '#6B7280'; // gray
    default:
      return '#6B7280';
  }
}

export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'Paid';
    case 'processing':
      return 'Processing';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function calculateNextPaymentDate(
  lastPaymentDate: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
): string {
  const date = new Date(lastPaymentDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

export async function getPaymentStats(
  customerId: string
): Promise<{
  totalPaid: number;
  totalPending: number;
  totalFailed: number;
  successRate: number;
}> {
  try {
    const { data: payments } = await supabase
      .from('recurring_payments')
      .select('amount, status')
      .eq('customer_id', customerId);

    if (!payments || payments.length === 0) {
      return { totalPaid: 0, totalPending: 0, totalFailed: 0, successRate: 0 };
    }

    const totalPaid = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalFailed = payments
      .filter(p => p.status === 'failed')
      .reduce((sum, p) => sum + p.amount, 0);

    const successCount = payments.filter(p => p.status === 'succeeded').length;
    const totalAttempts = payments.filter(p => ['succeeded', 'failed'].includes(p.status)).length;
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    return { totalPaid, totalPending, totalFailed, successRate };
  } catch (error) {
    console.error('Error getting payment stats:', error);
    return { totalPaid: 0, totalPending: 0, totalFailed: 0, successRate: 0 };
  }
}
