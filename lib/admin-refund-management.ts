import { supabase } from './supabase';

export type RefundStatus = 'Pending' | 'Completed' | 'Failed';
export type RefundReason =
  | 'Cancelled'
  | 'Disputed'
  | 'ServiceNotProvided'
  | 'QualityIssue'
  | 'NoShow'
  | 'Other';

export interface AdminRefund {
  id: string;
  booking_id: string;
  escrow_hold_id: string | null;
  dispute_id: string | null;
  amount: number;
  reason: string;
  stripe_refund_id: string | null;
  status: RefundStatus;
  requested_by: string;
  approved_by: string | null;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  booking?: {
    id: string;
    title: string;
    price: number;
    scheduled_date: string;
    customer_id: string;
    provider_id: string;
  };
  requester?: {
    id: string;
    full_name: string;
    email: string;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface RefundQueueItem {
  id: string;
  booking_id: string;
  cancellation_id: string;
  refund_amount: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  booking?: {
    id: string;
    title: string;
    price: number;
    customer: {
      full_name: string;
      email: string;
    };
  };
}

export interface RefundMetrics {
  total_refunds: number;
  pending_refunds: number;
  completed_refunds: number;
  failed_refunds: number;
  total_refunded_amount: number;
  avg_refund_amount: number;
  refunds_this_month: number;
  refund_amount_this_month: number;
}

export interface DisputeWithRefund {
  id: string;
  booking_id: string;
  dispute_type: string;
  status: string;
  resolution_type: string | null;
  refund_amount: number;
  created_at: string;
  resolved_at: string | null;
  has_refund: boolean;
  refund_status: RefundStatus | null;
}

/**
 * Get all refunds with filtering (admin only)
 */
export async function getAllRefunds(filters?: {
  status?: RefundStatus;
  from_date?: string;
  to_date?: string;
  search?: string;
}): Promise<AdminRefund[]> {
  try {
    let query = supabase
      .from('refunds')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          scheduled_date,
          customer_id,
          provider_id
        ),
        requester:profiles!refunds_requested_by_fkey(id, full_name, email),
        approver:profiles!refunds_approved_by_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.from_date) {
      query = query.gte('created_at', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Apply search filter client-side if provided
    let results = data || [];
    if (filters?.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (refund: any) =>
          refund.booking?.title?.toLowerCase().includes(searchLower) ||
          refund.requester?.full_name?.toLowerCase().includes(searchLower) ||
          refund.requester?.email?.toLowerCase().includes(searchLower) ||
          refund.reason?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  } catch (error) {
    console.error('Error fetching refunds:', error);
    return [];
  }
}

/**
 * Get refund processing queue (admin only)
 */
export async function getRefundQueue(filters?: {
  status?: 'Pending' | 'Processing' | 'Completed' | 'Failed';
}): Promise<RefundQueueItem[]> {
  try {
    let query = supabase
      .from('refund_processing_queue')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          customer:profiles!bookings_customer_id_fkey(full_name, email)
        )
      `)
      .order('created_at', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching refund queue:', error);
    return [];
  }
}

/**
 * Get refund metrics (admin only)
 */
export async function getRefundMetrics(): Promise<RefundMetrics> {
  try {
    // Get all refunds
    const { data: allRefunds } = await supabase
      .from('refunds')
      .select('amount, status, created_at');

    const total = allRefunds?.length || 0;
    const pending = allRefunds?.filter((r) => r.status === 'Pending').length || 0;
    const completed = allRefunds?.filter((r) => r.status === 'Completed').length || 0;
    const failed = allRefunds?.filter((r) => r.status === 'Failed').length || 0;

    const totalAmount = allRefunds?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const avgAmount = total > 0 ? totalAmount / total : 0;

    // Get this month's refunds
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthRefunds =
      allRefunds?.filter((r) => new Date(r.created_at) >= monthStart) || [];
    const thisMonthAmount = thisMonthRefunds.reduce(
      (sum, r) => sum + (r.amount || 0),
      0
    );

    return {
      total_refunds: total,
      pending_refunds: pending,
      completed_refunds: completed,
      failed_refunds: failed,
      total_refunded_amount: totalAmount,
      avg_refund_amount: avgAmount,
      refunds_this_month: thisMonthRefunds.length,
      refund_amount_this_month: thisMonthAmount,
    };
  } catch (error) {
    console.error('Error fetching refund metrics:', error);
    return {
      total_refunds: 0,
      pending_refunds: 0,
      completed_refunds: 0,
      failed_refunds: 0,
      total_refunded_amount: 0,
      avg_refund_amount: 0,
      refunds_this_month: 0,
      refund_amount_this_month: 0,
    };
  }
}

/**
 * Approve a refund request (admin only)
 */
export async function approveRefund(
  refundId: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('refunds')
      .update({
        approved_by: adminId,
        notes: notes,
        status: 'Completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error approving refund:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a refund request (admin only)
 */
export async function rejectRefund(
  refundId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('refunds')
      .update({
        approved_by: adminId,
        notes: `Rejected: ${reason}`,
        status: 'Failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting refund:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process refund manually (admin only)
 */
export async function processRefundManually(
  refundId: string,
  stripeRefundId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('refunds')
      .update({
        stripe_refund_id: stripeRefundId,
        status: 'Completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', refundId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retry failed refund from queue (admin only)
 */
export async function retryQueuedRefund(
  queueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('retry_failed_refund', {
      refund_queue_id: queueId,
    });

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Max retry attempts reached' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error retrying refund:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get disputes with refund status (admin only)
 */
export async function getDisputesWithRefunds(): Promise<DisputeWithRefund[]> {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        id,
        booking_id,
        dispute_type,
        status,
        resolution_type,
        refund_amount,
        created_at,
        resolved_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check if each dispute has an associated refund
    const disputesWithRefunds = await Promise.all(
      (data || []).map(async (dispute) => {
        const { data: refund } = await supabase
          .from('refunds')
          .select('id, status')
          .eq('dispute_id', dispute.id)
          .maybeSingle();

        return {
          ...dispute,
          has_refund: !!refund,
          refund_status: refund?.status || null,
        };
      })
    );

    return disputesWithRefunds;
  } catch (error) {
    console.error('Error fetching disputes with refunds:', error);
    return [];
  }
}

/**
 * Create manual refund (admin only)
 */
export async function createManualRefund(
  bookingId: string,
  amount: number,
  reason: string,
  requestedBy: string,
  approvedBy: string,
  notes?: string
): Promise<{ success: boolean; refund_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .insert([
        {
          booking_id: bookingId,
          amount,
          reason,
          requested_by: requestedBy,
          approved_by: approvedBy,
          notes,
          status: 'Pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, refund_id: data.id };
  } catch (error: any) {
    console.error('Error creating manual refund:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get refund details (admin only)
 */
export async function getRefundDetails(refundId: string): Promise<AdminRefund | null> {
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
          customer_id,
          provider_id,
          customer:profiles!bookings_customer_id_fkey(id, full_name, email),
          provider:profiles!bookings_provider_id_fkey(id, full_name, email)
        ),
        requester:profiles!refunds_requested_by_fkey(id, full_name, email),
        approver:profiles!refunds_approved_by_fkey(id, full_name, email),
        dispute:disputes(id, dispute_type, status, resolution_type)
      `)
      .eq('id', refundId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching refund details:', error);
    return null;
  }
}

/**
 * Get refund history for a booking (admin only)
 */
export async function getBookingRefundHistory(
  bookingId: string
): Promise<AdminRefund[]> {
  try {
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        *,
        requester:profiles!refunds_requested_by_fkey(id, full_name, email),
        approver:profiles!refunds_approved_by_fkey(id, full_name, email)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching booking refund history:', error);
    return [];
  }
}

/**
 * Export refund data (admin only)
 */
export async function exportRefundData(
  format: 'csv' | 'json' = 'csv'
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const refunds = await getAllRefunds();

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(refunds, null, 2),
      };
    }

    // CSV format
    const headers = [
      'Refund ID',
      'Booking ID',
      'Amount',
      'Status',
      'Reason',
      'Requested By',
      'Approved By',
      'Stripe Refund ID',
      'Created At',
      'Processed At',
    ];

    const rows = refunds.map((refund) => [
      refund.id,
      refund.booking_id,
      refund.amount,
      refund.status,
      refund.reason,
      refund.requester?.full_name || '',
      refund.approver?.full_name || '',
      refund.stripe_refund_id || '',
      refund.created_at,
      refund.processed_at || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    console.error('Error exporting refund data:', error);
    return { success: false, error: error.message };
  }
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
export function getRefundStatusColor(status: RefundStatus): string {
  const colors: Record<RefundStatus, string> = {
    Pending: '#F59E0B',
    Completed: '#10B981',
    Failed: '#EF4444',
  };
  return colors[status];
}

/**
 * Get status icon
 */
export function getRefundStatusIcon(status: RefundStatus): string {
  const icons: Record<RefundStatus, string> = {
    Pending: '⏳',
    Completed: '✅',
    Failed: '❌',
  };
  return icons[status];
}

/**
 * Format refund reason for display
 */
export function formatRefundReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    Cancelled: 'Booking Cancelled',
    Disputed: 'Disputed Transaction',
    ServiceNotProvided: 'Service Not Provided',
    QualityIssue: 'Quality Issue',
    NoShow: 'No Show',
    Other: 'Other',
  };
  return reasonMap[reason] || reason;
}

/**
 * Calculate refund processing time
 */
export function calculateProcessingTime(
  createdAt: string,
  processedAt: string | null
): string {
  if (!processedAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} pending`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} pending`;
  }

  const created = new Date(createdAt);
  const processed = new Date(processedAt);
  const diff = processed.getTime() - created.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `Processed in ${days} day${days > 1 ? 's' : ''}`;
  }
  return `Processed in ${hours} hour${hours > 1 ? 's' : ''}`;
}
