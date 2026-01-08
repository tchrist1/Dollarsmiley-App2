import { supabase } from './supabase';

export interface TimeExtensionRequest {
  id: string;
  job_id: string;
  provider_id: string;
  requested_additional_hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  requested_at: string;
  responded_at?: string;
  responded_by?: string;
  customer_response_notes?: string;
  proposed_price_adjustment?: number;
  approved_additional_hours?: number;
  original_estimated_duration?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeExtensionRequest {
  job_id: string;
  provider_id: string;
  requested_additional_hours: number;
  reason: string;
  proposed_price_adjustment?: number;
}

export interface RespondToExtensionRequest {
  request_id: string;
  status: 'approved' | 'declined';
  customer_response_notes?: string;
  approved_additional_hours?: number;
  responded_by: string;
}

export async function createTimeExtensionRequest(
  data: CreateTimeExtensionRequest
): Promise<{ data: TimeExtensionRequest | null; error: any }> {
  try {
    const { data: request, error } = await supabase
      .from('job_time_extension_requests')
      .insert({
        job_id: data.job_id,
        provider_id: data.provider_id,
        requested_additional_hours: data.requested_additional_hours,
        reason: data.reason,
        proposed_price_adjustment: data.proposed_price_adjustment,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating time extension request:', error);
      return { data: null, error };
    }

    return { data: request, error: null };
  } catch (error) {
    console.error('Unexpected error creating time extension request:', error);
    return { data: null, error };
  }
}

export async function getTimeExtensionRequestsForJob(
  jobId: string
): Promise<{ data: TimeExtensionRequest[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('job_time_extension_requests')
      .select('*')
      .eq('job_id', jobId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching time extension requests:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching time extension requests:', error);
    return { data: null, error };
  }
}

export async function getPendingTimeExtensionRequest(
  jobId: string,
  providerId: string
): Promise<{ data: TimeExtensionRequest | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('job_time_extension_requests')
      .select('*')
      .eq('job_id', jobId)
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      console.error('Error fetching pending time extension request:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching pending time extension request:', error);
    return { data: null, error };
  }
}

export async function respondToTimeExtensionRequest(
  data: RespondToExtensionRequest
): Promise<{ success: boolean; error: any }> {
  try {
    const updateData: any = {
      status: data.status,
      responded_at: new Date().toISOString(),
      responded_by: data.responded_by,
    };

    if (data.customer_response_notes) {
      updateData.customer_response_notes = data.customer_response_notes;
    }

    if (data.status === 'approved' && data.approved_additional_hours !== undefined) {
      updateData.approved_additional_hours = data.approved_additional_hours;
    }

    const { error } = await supabase
      .from('job_time_extension_requests')
      .update(updateData)
      .eq('id', data.request_id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error responding to time extension request:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error responding to time extension request:', error);
    return { success: false, error };
  }
}

export async function cancelTimeExtensionRequest(
  requestId: string,
  providerId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('job_time_extension_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('provider_id', providerId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error cancelling time extension request:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error cancelling time extension request:', error);
    return { success: false, error };
  }
}

export async function getTotalApprovedExtensions(
  jobId: string
): Promise<{ hours: number; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_job_total_approved_extensions', {
      p_job_id: jobId,
    });

    if (error) {
      console.error('Error getting total approved extensions:', error);
      return { hours: 0, error };
    }

    return { hours: data || 0, error: null };
  } catch (error) {
    console.error('Unexpected error getting total approved extensions:', error);
    return { hours: 0, error };
  }
}

export async function hasPendingExtensionRequest(
  jobId: string
): Promise<{ hasPending: boolean; error: any }> {
  try {
    const { data, error } = await supabase.rpc('has_pending_extension_request', {
      p_job_id: jobId,
    });

    if (error) {
      console.error('Error checking for pending extension request:', error);
      return { hasPending: false, error };
    }

    return { hasPending: data || false, error: null };
  } catch (error) {
    console.error('Unexpected error checking for pending extension request:', error);
    return { hasPending: false, error };
  }
}

export async function getJobExtensionSummary(jobId: string): Promise<{
  data: {
    original_estimated_hours: number;
    total_approved_extensions: number;
    effective_duration: number;
    pending_requests: number;
    approved_requests: number;
    declined_requests: number;
  } | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('job_extension_summary')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching job extension summary:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching job extension summary:', error);
    return { data: null, error };
  }
}

export async function getProviderTimeExtensionRequests(
  providerId: string
): Promise<{ data: TimeExtensionRequest[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('job_time_extension_requests')
      .select('*')
      .eq('provider_id', providerId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching provider time extension requests:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching provider time extension requests:', error);
    return { data: null, error };
  }
}

export async function getCustomerTimeExtensionRequests(
  customerId: string
): Promise<{ data: TimeExtensionRequest[] | null; error: any }> {
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('customer_id', customerId);

    if (jobsError || !jobs) {
      console.error('Error fetching customer jobs:', jobsError);
      return { data: null, error: jobsError };
    }

    const jobIds = jobs.map((job) => job.id);

    if (jobIds.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('job_time_extension_requests')
      .select('*')
      .in('job_id', jobIds)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer time extension requests:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error fetching customer time extension requests:', error);
    return { data: null, error };
  }
}

export function canRequestTimeExtension(
  jobStatus: string,
  hasPendingRequest: boolean
): { canRequest: boolean; reason?: string } {
  if (hasPendingRequest) {
    return {
      canRequest: false,
      reason: 'A time extension request is already pending for this job',
    };
  }

  const validStatuses = ['In Progress', 'Started'];
  if (!validStatuses.includes(jobStatus)) {
    return {
      canRequest: false,
      reason: 'Time extensions can only be requested for active jobs',
    };
  }

  return { canRequest: true };
}

export function formatExtensionStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending Response';
    case 'approved':
      return 'Approved';
    case 'declined':
      return 'Declined';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function calculateEffectiveDuration(
  originalHours: number,
  approvedExtensions: number
): number {
  return originalHours + approvedExtensions;
}
