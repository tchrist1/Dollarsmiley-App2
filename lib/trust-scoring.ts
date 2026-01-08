import { supabase } from './supabase';

export interface CustomerTrustScore {
  id: string;
  customer_id: string;
  no_show_count_30d: number;
  no_show_count_90d: number;
  no_show_count_180d: number;
  no_show_count_lifetime: number;
  completed_jobs_30d: number;
  completed_jobs_90d: number;
  completed_jobs_180d: number;
  completed_jobs_lifetime: number;
  no_show_rate_30d: number;
  no_show_rate_90d: number;
  no_show_rate_180d: number;
  no_show_rate_lifetime: number;
  unique_providers_affected_30d: number;
  unique_providers_affected_90d: number;
  unique_providers_affected_180d: number;
  trust_level: number;
  previous_trust_level: number;
  last_no_show_at: string | null;
  last_completed_job_at: string | null;
  consecutive_completed_jobs: number;
  trust_improved_at: string | null;
  score_calculated_at: string;
  last_event_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderTrustScore {
  id: string;
  provider_id: string;
  provider_no_show_count_30d: number;
  provider_no_show_count_90d: number;
  provider_no_show_count_180d: number;
  provider_no_show_count_lifetime: number;
  late_arrival_count_30d: number;
  late_arrival_count_90d: number;
  late_arrival_count_180d: number;
  excessive_extension_count_30d: number;
  excessive_extension_count_90d: number;
  excessive_extension_count_180d: number;
  disputed_jobs_upheld_30d: number;
  disputed_jobs_upheld_90d: number;
  disputed_jobs_upheld_180d: number;
  abandoned_jobs_30d: number;
  abandoned_jobs_90d: number;
  abandoned_jobs_180d: number;
  completed_jobs_30d: number;
  completed_jobs_90d: number;
  completed_jobs_180d: number;
  completed_jobs_lifetime: number;
  incident_rate_30d: number;
  incident_rate_90d: number;
  incident_rate_180d: number;
  unique_customers_affected_30d: number;
  unique_customers_affected_90d: number;
  unique_customers_affected_180d: number;
  trust_level: number;
  previous_trust_level: number;
  last_incident_at: string | null;
  last_completed_job_at: string | null;
  consecutive_completed_jobs: number;
  trust_improved_at: string | null;
  score_calculated_at: string;
  last_event_at: string;
  created_at: string;
  updated_at: string;
}

export interface TrustEvent {
  id: string;
  user_id: string;
  user_role: 'customer' | 'provider';
  event_type: string;
  event_category: 'negative' | 'positive' | 'neutral';
  job_id: string | null;
  booking_id: string | null;
  incident_id: string | null;
  trust_level_before: number | null;
  trust_level_after: number | null;
  trust_level_changed: boolean;
  event_metadata: Record<string, any>;
  notes: string | null;
  weight: number;
  expires_at: string | null;
  created_at: string;
}

export interface TrustGuidance {
  trust_level: number;
  trust_level_label: string;
  status: 'good' | 'advisory' | 'warning' | 'risk' | 'unknown';
  no_show_count_90d?: number;
  incident_count_90d?: number;
  completed_jobs_90d: number;
  consecutive_completed_jobs: number;
  improvement_tips: string[];
  recovery_progress: {
    eligible_for_improvement: boolean;
    completed: number;
    required: number;
    message: string;
  };
}

export async function getCustomerTrustScore(
  customerId: string
): Promise<CustomerTrustScore | null> {
  const { data, error } = await supabase
    .from('customer_trust_scores')
    .select('*')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer trust score:', error);
    return null;
  }

  return data;
}

export async function getProviderTrustScore(
  providerId: string
): Promise<ProviderTrustScore | null> {
  const { data, error } = await supabase
    .from('provider_trust_scores')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching provider trust score:', error);
    return null;
  }

  return data;
}

export async function calculateCustomerTrustScore(
  customerId: string
): Promise<boolean> {
  const { error } = await supabase.rpc('calculate_customer_trust_score', {
    p_customer_id: customerId,
  });

  if (error) {
    console.error('Error calculating customer trust score:', error);
    return false;
  }

  return true;
}

export async function calculateProviderTrustScore(
  providerId: string
): Promise<boolean> {
  const { error } = await supabase.rpc('calculate_provider_trust_score', {
    p_provider_id: providerId,
  });

  if (error) {
    console.error('Error calculating provider trust score:', error);
    return false;
  }

  return true;
}

export async function getTrustImprovementGuidance(
  userId: string,
  userRole: 'customer' | 'provider'
): Promise<TrustGuidance | null> {
  const { data, error } = await supabase.rpc('get_trust_improvement_guidance', {
    p_user_id: userId,
    p_user_role: userRole,
  });

  if (error) {
    console.error('Error fetching trust improvement guidance:', error);
    return null;
  }

  return data;
}

export async function recordTrustEvent(params: {
  userId: string;
  userRole: 'customer' | 'provider';
  eventType: string;
  eventCategory: 'negative' | 'positive' | 'neutral';
  jobId?: string;
  bookingId?: string;
  incidentId?: string;
  notes?: string;
  metadata?: Record<string, any>;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('record_trust_event', {
    p_user_id: params.userId,
    p_user_role: params.userRole,
    p_event_type: params.eventType,
    p_event_category: params.eventCategory,
    p_job_id: params.jobId || null,
    p_booking_id: params.bookingId || null,
    p_incident_id: params.incidentId || null,
    p_notes: params.notes || null,
    p_metadata: params.metadata || {},
  });

  if (error) {
    console.error('Error recording trust event:', error);
    return null;
  }

  return data;
}

export async function getTrustEvents(
  userId: string,
  limit: number = 20
): Promise<TrustEvent[]> {
  const { data, error } = await supabase
    .from('trust_score_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trust events:', error);
    return [];
  }

  return data || [];
}

export function getTrustLevelColor(trustLevel: number): string {
  switch (trustLevel) {
    case 0:
      return '#10B981';
    case 1:
      return '#F59E0B';
    case 2:
      return '#EF4444';
    case 3:
      return '#DC2626';
    default:
      return '#6B7280';
  }
}

export function getTrustLevelLabel(
  trustLevel: number,
  role: 'customer' | 'provider'
): string {
  if (role === 'customer') {
    switch (trustLevel) {
      case 0:
        return 'Normal';
      case 1:
        return 'Soft Warning';
      case 2:
        return 'Reliability Risk';
      case 3:
        return 'High Risk';
      default:
        return 'Unknown';
    }
  } else {
    switch (trustLevel) {
      case 0:
        return 'Good Standing';
      case 1:
        return 'Advisory';
      case 2:
        return 'Reliability Risk';
      case 3:
        return 'High Risk';
      default:
        return 'Unknown';
    }
  }
}

export function shouldRequireNoShowFee(trustLevel: number): boolean {
  return trustLevel >= 2;
}

export function shouldLimitUrgentJobs(trustLevel: number): boolean {
  return trustLevel >= 3;
}

export function shouldShowTrustWarning(trustLevel: number): boolean {
  return trustLevel >= 1;
}

export function canPostJob(trustLevel: number): boolean {
  return true;
}

export function canAcceptJob(trustLevel: number): boolean {
  return true;
}

export function getTrustLevelRestrictions(
  trustLevel: number,
  role: 'customer' | 'provider'
): {
  canPostJobs: boolean;
  canAcceptJobs: boolean;
  requiresNoShowFee: boolean;
  limitsUrgentJobs: boolean;
  requiresAdditionalConfirmation: boolean;
  showsWarning: boolean;
} {
  if (role === 'customer') {
    return {
      canPostJobs: true,
      canAcceptJobs: true,
      requiresNoShowFee: trustLevel >= 2,
      limitsUrgentJobs: trustLevel >= 3,
      requiresAdditionalConfirmation: trustLevel >= 3,
      showsWarning: trustLevel >= 1,
    };
  } else {
    return {
      canPostJobs: true,
      canAcceptJobs: true,
      requiresNoShowFee: false,
      limitsUrgentJobs: trustLevel >= 3,
      requiresAdditionalConfirmation: trustLevel >= 2,
      showsWarning: trustLevel >= 1,
    };
  }
}

export async function checkCustomerEligibilityForJob(
  customerId: string
): Promise<{
  eligible: boolean;
  trustLevel: number;
  requiresNoShowFee: boolean;
  warnings: string[];
}> {
  const score = await getCustomerTrustScore(customerId);

  if (!score) {
    return {
      eligible: true,
      trustLevel: 0,
      requiresNoShowFee: false,
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const trustLevel = score.trust_level;

  if (trustLevel === 1) {
    warnings.push('Recent no-shows detected. Please ensure availability before booking.');
  } else if (trustLevel === 2) {
    warnings.push('Multiple no-shows detected. A no-show fee is required for new job postings.');
  } else if (trustLevel === 3) {
    warnings.push('Reliability concerns detected. Additional confirmation required.');
    warnings.push('Time-sensitive job posting may be limited.');
  }

  return {
    eligible: true,
    trustLevel,
    requiresNoShowFee: trustLevel >= 2,
    warnings,
  };
}

export async function checkProviderEligibilityForJob(
  providerId: string,
  jobUrgency?: 'low' | 'medium' | 'high'
): Promise<{
  eligible: boolean;
  trustLevel: number;
  requiresConfirmation: boolean;
  warnings: string[];
}> {
  const score = await getProviderTrustScore(providerId);

  if (!score) {
    return {
      eligible: true,
      trustLevel: 0,
      requiresConfirmation: false,
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const trustLevel = score.trust_level;
  let eligible = true;

  if (trustLevel === 1) {
    warnings.push('Please review job requirements carefully before accepting.');
  } else if (trustLevel === 2) {
    warnings.push('Reliability concerns detected. Please confirm you can complete this job.');
  } else if (trustLevel === 3) {
    warnings.push('Your account has reliability restrictions.');
    if (jobUrgency === 'high') {
      eligible = false;
      warnings.push('High-urgency jobs are currently limited for your account.');
    } else {
      warnings.push('Please contact support for assistance.');
    }
  }

  return {
    eligible,
    trustLevel,
    requiresConfirmation: trustLevel >= 2,
    warnings,
  };
}

export function formatTrustLevelDescription(
  trustLevel: number,
  role: 'customer' | 'provider'
): string {
  if (role === 'customer') {
    switch (trustLevel) {
      case 0:
        return 'You have excellent reliability. Keep up the great work!';
      case 1:
        return 'Recent no-shows detected. Please ensure you can attend before booking.';
      case 2:
        return 'Multiple no-shows affect your ability to post jobs. A no-show fee is required for new postings.';
      case 3:
        return 'Reliability score requires attention. Please contact support for assistance.';
      default:
        return 'Trust status unknown.';
    }
  } else {
    switch (trustLevel) {
      case 0:
        return 'You have excellent reliability. Keep up the great work!';
      case 1:
        return 'A pattern is emerging. Please review job commitments carefully.';
      case 2:
        return 'Repeated reliability issues detected. Only accept jobs you can definitely complete.';
      case 3:
        return 'Reliability score requires immediate attention. Please contact support for guidance.';
      default:
        return 'Trust status unknown.';
    }
  }
}
