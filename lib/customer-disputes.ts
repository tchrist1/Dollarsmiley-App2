import { supabase } from './supabase';

export type DisputeType = 'Quality' | 'NoShow' | 'Cancellation' | 'Payment' | 'Other';
export type DisputeStatus =
  | 'Open'
  | 'UnderReview'
  | 'InvestigationRequired'
  | 'PendingResolution'
  | 'Resolved'
  | 'Closed'
  | 'Appealed';
export type ResolutionType =
  | 'FullRefund'
  | 'PartialRefund'
  | 'NoRefund'
  | 'Cancelled'
  | 'ServiceRedo';

export interface CustomerDispute {
  id: string;
  booking_id: string;
  filed_by: string;
  filed_against: string;
  dispute_type: DisputeType;
  description: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution: string | null;
  resolution_type: ResolutionType | null;
  refund_amount: number;
  created_at: string;
  updated_at: string;
  response_deadline: string;
  resolved_at: string | null;
  booking?: {
    id: string;
    title: string;
    price: number;
    scheduled_date: string;
    status: string;
  };
  filed_against_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface DisputeFormData {
  booking_id: string;
  filed_against: string;
  dispute_type: DisputeType;
  description: string;
  evidence_urls?: string[];
}

/**
 * Get customer's disputes (filed by them)
 */
export async function getCustomerDisputes(userId: string): Promise<CustomerDispute[]> {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          scheduled_date,
          status
        ),
        filed_against_user:profiles!disputes_filed_against_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('filed_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching customer disputes:', error);
    return [];
  }
}

/**
 * Get disputes filed against customer
 */
export async function getDisputesAgainstCustomer(
  userId: string
): Promise<CustomerDispute[]> {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          scheduled_date,
          status
        ),
        filed_by_user:profiles!disputes_filed_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('filed_against', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching disputes against customer:', error);
    return [];
  }
}

/**
 * Get single dispute details
 */
export async function getDisputeDetails(
  disputeId: string,
  userId: string
): Promise<CustomerDispute | null> {
  try {
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          price,
          scheduled_date,
          status
        ),
        filed_against_user:profiles!disputes_filed_against_fkey(
          id,
          full_name,
          email
        ),
        filed_by_user:profiles!disputes_filed_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', disputeId)
      .or(`filed_by.eq.${userId},filed_against.eq.${userId}`)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching dispute details:', error);
    return null;
  }
}

/**
 * Check if booking can have dispute filed
 */
export async function canFileDispute(
  bookingId: string,
  userId: string
): Promise<{
  can_file: boolean;
  reason?: string;
}> {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, customer_id, provider_id, scheduled_date')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        can_file: false,
        reason: 'Booking not found',
      };
    }

    // Check if user is part of the booking
    if (booking.customer_id !== userId && booking.provider_id !== userId) {
      return {
        can_file: false,
        reason: 'You are not part of this booking',
      };
    }

    // Check if booking is in a valid state
    const validStatuses = ['Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(booking.status)) {
      return {
        can_file: false,
        reason: 'Dispute can only be filed for confirmed, completed, or cancelled bookings',
      };
    }

    // Check if dispute already exists
    const { data: existingDispute } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('booking_id', bookingId)
      .eq('filed_by', userId)
      .maybeSingle();

    if (existingDispute) {
      return {
        can_file: false,
        reason: `Dispute already ${existingDispute.status.toLowerCase()}`,
      };
    }

    // Check time limit (within 30 days of booking date)
    const bookingDate = new Date(booking.scheduled_date);
    const now = new Date();
    const daysSinceBooking = Math.floor(
      (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceBooking > 30) {
      return {
        can_file: false,
        reason: 'Disputes must be filed within 30 days of the booking date',
      };
    }

    return { can_file: true };
  } catch (error) {
    console.error('Error checking dispute eligibility:', error);
    return {
      can_file: false,
      reason: 'Unable to check eligibility',
    };
  }
}

/**
 * File a new dispute
 */
export async function fileDispute(
  disputeData: DisputeFormData,
  userId: string
): Promise<{ success: boolean; dispute_id?: string; error?: string }> {
  try {
    // Check eligibility
    const eligibility = await canFileDispute(disputeData.booking_id, userId);
    if (!eligibility.can_file) {
      return {
        success: false,
        error: eligibility.reason,
      };
    }

    // Create dispute
    const { data, error } = await supabase
      .from('disputes')
      .insert([
        {
          booking_id: disputeData.booking_id,
          filed_by: userId,
          filed_against: disputeData.filed_against,
          dispute_type: disputeData.dispute_type,
          description: disputeData.description,
          evidence_urls: disputeData.evidence_urls || [],
          status: 'Open',
          priority: 'Medium',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      dispute_id: data.id,
    };
  } catch (error: any) {
    console.error('Error filing dispute:', error);
    return {
      success: false,
      error: error.message || 'Failed to file dispute',
    };
  }
}

/**
 * Update dispute (add evidence)
 */
export async function addDisputeEvidence(
  disputeId: string,
  userId: string,
  evidenceUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current dispute
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('evidence_urls, filed_by')
      .eq('id', disputeId)
      .single();

    if (fetchError || !dispute) {
      return {
        success: false,
        error: 'Dispute not found',
      };
    }

    if (dispute.filed_by !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Add new evidence URL
    const updatedUrls = [...dispute.evidence_urls, evidenceUrl];

    const { error: updateError } = await supabase
      .from('disputes')
      .update({ evidence_urls: updatedUrls })
      .eq('id', disputeId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('Error adding dispute evidence:', error);
    return {
      success: false,
      error: error.message || 'Failed to add evidence',
    };
  }
}

/**
 * Get dispute statistics for customer
 */
export async function getCustomerDisputeStats(userId: string): Promise<{
  total_disputes: number;
  open_disputes: number;
  resolved_disputes: number;
  under_review_disputes: number;
}> {
  try {
    const disputes = await getCustomerDisputes(userId);

    const open = disputes.filter(
      (d) => d.status === 'Open' || d.status === 'PendingResolution'
    ).length;
    const resolved = disputes.filter(
      (d) => d.status === 'Resolved' || d.status === 'Closed'
    ).length;
    const underReview = disputes.filter(
      (d) =>
        d.status === 'UnderReview' || d.status === 'InvestigationRequired'
    ).length;

    return {
      total_disputes: disputes.length,
      open_disputes: open,
      resolved_disputes: resolved,
      under_review_disputes: underReview,
    };
  } catch (error) {
    console.error('Error getting dispute stats:', error);
    return {
      total_disputes: 0,
      open_disputes: 0,
      resolved_disputes: 0,
      under_review_disputes: 0,
    };
  }
}

/**
 * Subscribe to dispute updates
 */
export function subscribeToDisputeUpdates(
  userId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('dispute-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'disputes',
        filter: `filed_by=eq.${userId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'disputes',
        filter: `filed_against=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get dispute type display text
 */
export function getDisputeTypeDisplay(type: DisputeType): string {
  const typeMap: Record<DisputeType, string> = {
    Quality: 'Service Quality Issue',
    NoShow: 'Provider No-Show',
    Cancellation: 'Cancellation Issue',
    Payment: 'Payment Issue',
    Other: 'Other Issue',
  };
  return typeMap[type];
}

/**
 * Get dispute status display text
 */
export function getDisputeStatusDisplay(status: DisputeStatus): string {
  const statusMap: Record<DisputeStatus, string> = {
    Open: 'Open',
    UnderReview: 'Under Review',
    InvestigationRequired: 'Investigation Required',
    PendingResolution: 'Pending Resolution',
    Resolved: 'Resolved',
    Closed: 'Closed',
    Appealed: 'Appealed',
  };
  return statusMap[status];
}

/**
 * Get status color
 */
export function getDisputeStatusColor(status: DisputeStatus): string {
  const colorMap: Record<DisputeStatus, string> = {
    Open: '#F59E0B',
    UnderReview: '#3B82F6',
    InvestigationRequired: '#EF4444',
    PendingResolution: '#8B5CF6',
    Resolved: '#10B981',
    Closed: '#6B7280',
    Appealed: '#F97316',
  };
  return colorMap[status];
}

/**
 * Get resolution type display text
 */
export function getResolutionTypeDisplay(type: ResolutionType): string {
  const typeMap: Record<ResolutionType, string> = {
    FullRefund: 'Full Refund Issued',
    PartialRefund: 'Partial Refund Issued',
    NoRefund: 'No Refund',
    Cancelled: 'Dispute Cancelled',
    ServiceRedo: 'Service Will Be Redone',
  };
  return typeMap[type];
}

/**
 * Check if dispute is active
 */
export function isDisputeActive(dispute: CustomerDispute): boolean {
  return ![  'Resolved', 'Closed', 'Cancelled'].includes(dispute.status);
}

/**
 * Get days since dispute filed
 */
export function getDaysSinceDispute(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get days until response deadline
 */
export function getDaysUntilDeadline(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
 * Validate dispute form data
 */
export function validateDisputeForm(
  disputeType: DisputeType | '',
  description: string
): { valid: boolean; error?: string } {
  if (!disputeType) {
    return {
      valid: false,
      error: 'Please select a dispute type',
    };
  }

  if (!description || description.trim().length < 20) {
    return {
      valid: false,
      error: 'Please provide a detailed description (at least 20 characters)',
    };
  }

  return { valid: true };
}

/**
 * Get dispute filing tips
 */
export function getDisputeFilingTips(): string[] {
  return [
    'Provide a clear and detailed description of the issue',
    'Include specific dates, times, and circumstances',
    'Upload any relevant photos or documents as evidence',
    'Remain professional and factual in your description',
    'Respond promptly to any admin requests for information',
  ];
}

/**
 * Get expected resolution timeframe
 */
export function getExpectedResolutionTime(dispute: CustomerDispute): string {
  const daysUntilDeadline = getDaysUntilDeadline(dispute.response_deadline);

  if (dispute.status === 'Resolved' || dispute.status === 'Closed') {
    return 'Resolved';
  }

  if (daysUntilDeadline <= 0) {
    return 'Reviewing (deadline passed)';
  }

  if (daysUntilDeadline === 1) {
    return 'Response expected within 1 day';
  }

  return `Response expected within ${daysUntilDeadline} days`;
}
