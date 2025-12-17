import { supabase } from './supabase';

export interface StripeIdentityVerification {
  id: string;
  user_id: string;
  stripe_verification_session_id: string;
  stripe_verification_report_id?: string;
  status: 'requires_input' | 'processing' | 'verified' | 'canceled';
  type: 'document' | 'id_number';
  client_secret: string;
  verification_url?: string;
  last_error?: any;
  verified_data?: any;
  document_front_id?: string;
  document_back_id?: string;
  selfie_id?: string;
  submitted_at?: string;
  verified_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateVerificationResponse {
  success: boolean;
  verification_id: string;
  stripe_session_id: string;
  client_secret: string;
  verification_url?: string;
  status: string;
  expires_at: string;
}

export interface VerificationStats {
  total_verifications: number;
  by_status: Record<string, number>;
  verified_count: number;
  pending_count: number;
  verification_rate: number;
  avg_time_to_verify_hours: number;
}

/**
 * Create a new Stripe Identity verification session
 */
export async function createIdentityVerification(
  type: 'document' | 'id_number' = 'document',
  returnUrl?: string
): Promise<CreateVerificationResponse> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-identity-verification`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        return_url: returnUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create verification session');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error creating identity verification:', error);
    throw new Error(error.message || 'Failed to create verification session');
  }
}

/**
 * Get user's latest identity verification
 */
export async function getLatestIdentityVerification(
  userId?: string
): Promise<StripeIdentityVerification | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_latest_identity_verification', {
      user_id_param: userId,
    });

    if (error) throw error;

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error getting latest verification:', error);
    return null;
  }
}

/**
 * Get all verifications for a user
 */
export async function getUserVerifications(
  userId?: string,
  limit: number = 10
): Promise<StripeIdentityVerification[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;

    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('stripe_identity_verifications')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting user verifications:', error);
    return [];
  }
}

/**
 * Check if verification is expired
 */
export async function isVerificationExpired(sessionId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_verification_expired', {
      session_id_param: sessionId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error checking verification expiry:', error);
    return true;
  }
}

/**
 * Get verification statistics
 */
export async function getVerificationStats(): Promise<VerificationStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_identity_verification_stats');

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting verification stats:', error);
    return null;
  }
}

/**
 * Get verification status label
 */
export function getVerificationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    requires_input: 'Incomplete',
    processing: 'Processing',
    verified: 'Verified',
    canceled: 'Canceled',
  };
  return labels[status] || 'Unknown';
}

/**
 * Get verification status color
 */
export function getVerificationStatusColor(
  status: string
): 'success' | 'warning' | 'error' | 'textSecondary' {
  const colors: Record<string, any> = {
    requires_input: 'warning',
    processing: 'textSecondary',
    verified: 'success',
    canceled: 'error',
  };
  return colors[status] || 'textSecondary';
}

/**
 * Check if user can start verification
 */
export function canStartVerification(
  isVerified: boolean,
  latestVerification?: StripeIdentityVerification | null
): { canStart: boolean; reason?: string } {
  if (isVerified) {
    return { canStart: false, reason: 'Already verified' };
  }

  if (latestVerification) {
    if (latestVerification.status === 'processing') {
      return { canStart: false, reason: 'Verification in progress' };
    }

    if (
      latestVerification.status === 'requires_input' &&
      latestVerification.expires_at
    ) {
      const expiresAt = new Date(latestVerification.expires_at);
      if (expiresAt > new Date()) {
        return { canStart: false, reason: 'Incomplete verification exists' };
      }
    }
  }

  return { canStart: true };
}

/**
 * Format verification time
 */
export function formatVerificationTime(createdAt: string, verifiedAt?: string): string {
  if (!verifiedAt) return 'Pending';

  const created = new Date(createdAt);
  const verified = new Date(verifiedAt);
  const diffMs = verified.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

/**
 * Get verification expiry warning
 */
export function getExpiryWarning(expiresAt?: string): string | null {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs <= 0) {
    return 'Verification session expired';
  }

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `Expires in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }

  if (diffHours < 6) {
    return `Expires in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  return null;
}

/**
 * Subscribe to verification updates
 */
export function subscribeToVerificationUpdates(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`verification_updates_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stripe_identity_verifications',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Get verification requirements
 */
export function getVerificationRequirements(): {
  title: string;
  description: string;
  items: string[];
} {
  return {
    title: 'What You Need',
    description: 'To complete identity verification, please have ready:',
    items: [
      'A valid government-issued ID (passport, driver\'s license, or ID card)',
      'Good lighting for clear document photos',
      'A device with a camera for selfie verification',
      '5-10 minutes to complete the process',
    ],
  };
}

/**
 * Get verification benefits
 */
export function getVerificationBenefits(): string[] {
  return [
    'Verified badge on your profile',
    '+100 XP reward',
    'Increased trust from customers',
    'Higher booking rates',
    'Priority in search results',
    'Access to premium features',
  ];
}

/**
 * Validate document type
 */
export function isValidDocumentType(type: string): boolean {
  const validTypes = ['driving_license', 'passport', 'id_card'];
  return validTypes.includes(type);
}

/**
 * Get verification steps
 */
export function getVerificationSteps(): Array<{ step: number; title: string; description: string }> {
  return [
    {
      step: 1,
      title: 'Start Verification',
      description: 'Tap "Verify My Identity" to begin the secure verification process',
    },
    {
      step: 2,
      title: 'Upload ID Document',
      description: 'Take a photo of the front and back of your government-issued ID',
    },
    {
      step: 3,
      title: 'Take Selfie',
      description: 'Take a selfie to verify your identity matches the ID',
    },
    {
      step: 4,
      title: 'Review & Submit',
      description: 'Review your information and submit for verification',
    },
    {
      step: 5,
      title: 'Get Verified',
      description: 'Results are usually instant. You\'ll receive a notification when complete',
    },
  ];
}

/**
 * Check verification session status
 */
export async function checkVerificationStatus(
  sessionId: string
): Promise<StripeIdentityVerification | null> {
  try {
    const { data, error } = await supabase
      .from('stripe_identity_verifications')
      .select('*')
      .eq('stripe_verification_session_id', sessionId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error checking verification status:', error);
    return null;
  }
}

/**
 * Get verification completion rate
 */
export function calculateCompletionRate(stats: VerificationStats): number {
  if (stats.total_verifications === 0) return 0;
  return Math.round((stats.verified_count / stats.total_verifications) * 100);
}
