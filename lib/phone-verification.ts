import { supabase } from './supabase';

export interface PhoneVerification {
  id: string;
  user_id: string;
  phone_number: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface PhoneVerificationLog {
  id: string;
  verification_id: string;
  user_id: string;
  phone_number: string;
  action: 'send_code' | 'verify_code' | 'resend_code';
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface VerificationStats {
  total_verifications: number;
  successful_verifications: number;
  failed_verifications: number;
  pending_verifications: number;
  last_verification_at: string | null;
  phone_verified: boolean;
}

export async function sendVerificationCode(phoneNumber: string): Promise<{
  success: boolean;
  verificationId?: string;
  expiresAt?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-verification-sms`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send verification code' };
    }

    return {
      success: true,
      verificationId: data.verificationId,
      expiresAt: data.expiresAt,
    };
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyPhoneCode(
  verificationId: string,
  code: string
): Promise<{
  success: boolean;
  phoneNumber?: string;
  error?: string;
  attemptsRemaining?: number;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-phone-code`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verificationId, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to verify code',
        attemptsRemaining: data.attemptsRemaining,
      };
    }

    return {
      success: true,
      phoneNumber: data.phoneNumber,
    };
  } catch (error: any) {
    console.error('Error verifying phone code:', error);
    return { success: false, error: error.message };
  }
}

export async function getVerificationStats(userId: string): Promise<VerificationStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_phone_verification_stats', { p_user_id: userId });

    if (error) throw error;

    return data as VerificationStats;
  } catch (error) {
    console.error('Error fetching verification stats:', error);
    return null;
  }
}

export async function getUserVerifications(
  userId: string
): Promise<PhoneVerification[]> {
  try {
    const { data, error } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return [];
  }
}

export async function getVerificationLogs(
  userId: string,
  limit: number = 50
): Promise<PhoneVerificationLog[]> {
  try {
    const { data, error } = await supabase
      .from('phone_verification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching verification logs:', error);
    return [];
  }
}

export async function checkRateLimit(phoneNumber: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .rpc('check_phone_verification_rate_limit', {
        p_phone_number: phoneNumber,
        p_user_id: user.id,
      });

    if (error) throw error;

    return data as boolean;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as +X (XXX) XXX-XXXX for international
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if format not recognized
  return phone;
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Add +1 for US numbers if not present
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Add + prefix if not present
  if (!phone.startsWith('+')) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const normalized = normalizePhoneNumber(phone);
  return e164Regex.test(normalized);
}

export function getPhoneVerificationStatusColor(status: PhoneVerification['status']): string {
  switch (status) {
    case 'verified':
      return '#10B981'; // Green
    case 'pending':
      return '#F59E0B'; // Orange
    case 'expired':
      return '#6B7280'; // Gray
    case 'failed':
      return '#EF4444'; // Red
    default:
      return '#6B7280';
  }
}

export function getPhoneVerificationStatusLabel(status: PhoneVerification['status']): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending';
    case 'expired':
      return 'Expired';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

export function getTimeRemaining(expiresAt: string): {
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const now = new Date().getTime();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) {
    return { minutes: 0, seconds: 0, expired: true };
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return { minutes, seconds, expired: false };
}

export function formatTimeRemaining(expiresAt: string): string {
  const { minutes, seconds, expired } = getTimeRemaining(expiresAt);

  if (expired) {
    return 'Expired';
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
