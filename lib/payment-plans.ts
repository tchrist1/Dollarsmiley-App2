import { supabase } from './supabase';

export type InstallmentFrequency = 'Weekly' | 'Biweekly' | 'Monthly';
export type PaymentPlanStatus = 'Active' | 'Completed' | 'Defaulted' | 'Cancelled';
export type InstallmentStatus = 'Pending' | 'Paid' | 'Failed' | 'Skipped' | 'Cancelled';

export interface PaymentPlan {
  id: string;
  name: string;
  description: string | null;
  installments_count: number;
  installment_frequency: InstallmentFrequency;
  down_payment_percentage: number;
  min_booking_amount: number;
  max_booking_amount: number | null;
  active: boolean;
  created_at: string;
}

export interface BookingPaymentPlan {
  id: string;
  booking_id: string;
  payment_plan_id: string;
  total_amount: number;
  down_payment_amount: number;
  installment_amount: number;
  installments_count: number;
  installments_paid: number;
  status: PaymentPlanStatus;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
  payment_plan?: PaymentPlan;
  booking?: {
    id: string;
    title: string;
    scheduled_date: string;
  };
}

export interface PaymentInstallment {
  id: string;
  booking_payment_plan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: InstallmentStatus;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  failure_reason: string | null;
  retry_count: number;
  created_at: string;
}

/**
 * Get all active payment plans
 */
export async function getActivePaymentPlans(): Promise<PaymentPlan[]> {
  try {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('active', true)
      .order('installments_count', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payment plans:', error);
    return [];
  }
}

/**
 * Get eligible payment plans for a booking amount
 */
export async function getEligiblePaymentPlans(
  bookingAmount: number
): Promise<PaymentPlan[]> {
  try {
    const plans = await getActivePaymentPlans();
    return plans.filter((plan) => {
      const meetsMin = bookingAmount >= plan.min_booking_amount;
      const meetsMax =
        !plan.max_booking_amount || bookingAmount <= plan.max_booking_amount;
      return meetsMin && meetsMax;
    });
  } catch (error) {
    console.error('Error filtering eligible plans:', error);
    return [];
  }
}

/**
 * Calculate payment plan details
 */
export function calculatePaymentPlanDetails(
  plan: PaymentPlan,
  totalAmount: number
): {
  down_payment: number;
  remaining_amount: number;
  installment_amount: number;
  total_installments: number;
  first_installment_date: string;
  final_installment_date: string;
} {
  const downPayment = totalAmount * (plan.down_payment_percentage / 100);
  const remainingAmount = totalAmount - downPayment;
  const installmentAmount = remainingAmount / plan.installments_count;

  const today = new Date();
  const firstDate = new Date(today);
  firstDate.setDate(firstDate.getDate() + 7);

  const finalDate = new Date(firstDate);
  const weeksToAdd =
    plan.installment_frequency === 'Weekly'
      ? plan.installments_count - 1
      : plan.installment_frequency === 'Biweekly'
      ? (plan.installments_count - 1) * 2
      : (plan.installments_count - 1) * 4;
  finalDate.setDate(finalDate.getDate() + weeksToAdd * 7);

  return {
    down_payment: downPayment,
    remaining_amount: remainingAmount,
    installment_amount: installmentAmount,
    total_installments: plan.installments_count,
    first_installment_date: firstDate.toISOString().split('T')[0],
    final_installment_date: finalDate.toISOString().split('T')[0],
  };
}

/**
 * Create payment plan for booking
 */
export async function createBookingPaymentPlan(
  bookingId: string,
  paymentPlanId: string
): Promise<{ success: boolean; payment_plan_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_payment_installments', {
      payment_plan_id_param: paymentPlanId,
      booking_id_param: bookingId,
    });

    if (error) throw error;

    return {
      success: true,
      payment_plan_id: data,
    };
  } catch (error: any) {
    console.error('Error creating payment plan:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment plan',
    };
  }
}

/**
 * Get payment plan for booking
 */
export async function getBookingPaymentPlan(
  bookingId: string
): Promise<BookingPaymentPlan | null> {
  try {
    const { data, error } = await supabase
      .from('booking_payment_plans')
      .select(`
        *,
        payment_plan:payment_plans(*),
        booking:bookings(id, title, scheduled_date)
      `)
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching booking payment plan:', error);
    return null;
  }
}

/**
 * Get user's payment plans
 */
export async function getUserPaymentPlans(
  userId: string
): Promise<BookingPaymentPlan[]> {
  try {
    const { data, error } = await supabase
      .from('booking_payment_plans')
      .select(`
        *,
        payment_plan:payment_plans(*),
        booking:bookings!inner(id, title, scheduled_date, customer_id)
      `)
      .eq('booking.customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user payment plans:', error);
    return [];
  }
}

/**
 * Get installments for payment plan
 */
export async function getPaymentInstallments(
  paymentPlanId: string
): Promise<PaymentInstallment[]> {
  try {
    const { data, error } = await supabase
      .from('payment_installments')
      .select('*')
      .eq('booking_payment_plan_id', paymentPlanId)
      .order('installment_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching installments:', error);
    return [];
  }
}

/**
 * Get upcoming installments for user
 */
export async function getUpcomingInstallments(
  userId: string
): Promise<(PaymentInstallment & { booking_payment_plan: BookingPaymentPlan })[]> {
  try {
    const { data, error } = await supabase
      .from('payment_installments')
      .select(`
        *,
        booking_payment_plan:booking_payment_plans!inner(
          *,
          booking:bookings!inner(id, title, customer_id)
        )
      `)
      .eq('booking_payment_plan.booking.customer_id', userId)
      .eq('status', 'Pending')
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming installments:', error);
    return [];
  }
}

/**
 * Get overdue installments for user
 */
export async function getOverdueInstallments(
  userId: string
): Promise<PaymentInstallment[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('payment_installments')
      .select(`
        *,
        booking_payment_plan:booking_payment_plans!inner(
          *,
          booking:bookings!inner(id, customer_id)
        )
      `)
      .eq('booking_payment_plan.booking.customer_id', userId)
      .eq('status', 'Pending')
      .lt('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching overdue installments:', error);
    return [];
  }
}

/**
 * Mark installment as paid
 */
export async function markInstallmentPaid(
  installmentId: string,
  stripePaymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('mark_installment_paid', {
      installment_id_param: installmentId,
      stripe_payment_intent_id_param: stripePaymentIntentId,
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error marking installment paid:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark installment as paid',
    };
  }
}

/**
 * Subscribe to payment plan updates
 */
export function subscribeToPaymentPlanUpdates(
  userId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('payment-plan-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'booking_payment_plans',
      },
      async (payload) => {
        // Check if this payment plan belongs to the user
        if (payload.new) {
          const { data } = await supabase
            .from('bookings')
            .select('customer_id')
            .eq('id', payload.new.booking_id)
            .single();

          if (data?.customer_id === userId) {
            callback(payload);
          }
        }
      }
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
export function getPaymentPlanStatusColor(status: PaymentPlanStatus): string {
  const colors: Record<PaymentPlanStatus, string> = {
    Active: '#3B82F6',
    Completed: '#10B981',
    Defaulted: '#EF4444',
    Cancelled: '#6B7280',
  };
  return colors[status];
}

/**
 * Get installment status color
 */
export function getInstallmentStatusColor(status: InstallmentStatus): string {
  const colors: Record<InstallmentStatus, string> = {
    Pending: '#F59E0B',
    Paid: '#10B981',
    Failed: '#EF4444',
    Skipped: '#6B7280',
    Cancelled: '#6B7280',
  };
  return colors[status];
}

/**
 * Get frequency display text
 */
export function getFrequencyDisplay(frequency: InstallmentFrequency): string {
  const map: Record<InstallmentFrequency, string> = {
    Weekly: 'Every week',
    Biweekly: 'Every 2 weeks',
    Monthly: 'Every month',
  };
  return map[frequency];
}

/**
 * Calculate days until due
 */
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if installment is overdue
 */
export function isInstallmentOverdue(installment: PaymentInstallment): boolean {
  if (installment.status !== 'Pending') return false;
  return getDaysUntilDue(installment.due_date) < 0;
}

/**
 * Get progress percentage
 */
export function getPaymentPlanProgress(plan: BookingPaymentPlan): number {
  if (plan.installments_count === 0) return 0;
  return (plan.installments_paid / plan.installments_count) * 100;
}

/**
 * Calculate total paid amount
 */
export function getTotalPaidAmount(plan: BookingPaymentPlan): number {
  return plan.down_payment_amount + plan.installment_amount * plan.installments_paid;
}

/**
 * Calculate remaining balance
 */
export function getRemainingBalance(plan: BookingPaymentPlan): number {
  return plan.total_amount - getTotalPaidAmount(plan);
}

/**
 * Validate payment plan eligibility
 */
export function validatePaymentPlanEligibility(
  plan: PaymentPlan,
  bookingAmount: number
): { eligible: boolean; reason?: string } {
  if (bookingAmount < plan.min_booking_amount) {
    return {
      eligible: false,
      reason: `Booking amount must be at least ${formatCurrency(
        plan.min_booking_amount
      )}`,
    };
  }

  if (plan.max_booking_amount && bookingAmount > plan.max_booking_amount) {
    return {
      eligible: false,
      reason: `Booking amount must not exceed ${formatCurrency(
        plan.max_booking_amount
      )}`,
    };
  }

  return { eligible: true };
}

/**
 * Get payment schedule summary
 */
export function getPaymentScheduleSummary(
  plan: PaymentPlan,
  totalAmount: number
): string[] {
  const details = calculatePaymentPlanDetails(plan, totalAmount);
  const schedule: string[] = [];

  if (details.down_payment > 0) {
    schedule.push(`Down payment: ${formatCurrency(details.down_payment)} (today)`);
  }

  schedule.push(
    `${plan.installments_count} payments of ${formatCurrency(
      details.installment_amount
    )} ${getFrequencyDisplay(plan.installment_frequency).toLowerCase()}`
  );

  schedule.push(`First payment: ${new Date(details.first_installment_date).toLocaleDateString()}`);
  schedule.push(`Final payment: ${new Date(details.final_installment_date).toLocaleDateString()}`);

  return schedule;
}
