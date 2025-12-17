import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface VerificationStatusUpdate {
  id: string;
  provider_id: string;
  verification_type: 'Identity' | 'Business' | 'Background' | 'All';
  status: 'Pending' | 'UnderReview' | 'Approved' | 'Rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
}

export interface ProfileVerificationUpdate {
  id: string;
  verification_status: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  is_verified: boolean;
  verified_at: string | null;
  id_verified: boolean;
  business_verified: boolean;
  phone_verified: boolean;
}

export interface PhoneVerificationUpdate {
  id: string;
  user_id: string;
  phone_number: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  verified_at: string | null;
}

export type VerificationUpdateCallback = (update: VerificationStatusUpdate) => void;
export type ProfileUpdateCallback = (update: ProfileVerificationUpdate) => void;
export type PhoneVerificationCallback = (update: PhoneVerificationUpdate) => void;

export class VerificationRealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToVerificationRequests(
    userId: string,
    callback: VerificationUpdateCallback
  ): () => void {
    const channelName = `verification-requests-${userId}`;

    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'provider_verification_requests',
          filter: `provider_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Verification request update:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.new as VerificationStatusUpdate);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Verification subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  subscribeToProfileVerification(
    userId: string,
    callback: ProfileUpdateCallback
  ): () => void {
    const channelName = `profile-verification-${userId}`;

    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile verification update:', payload);

          const oldData = payload.old as any;
          const newData = payload.new as any;

          const verificationFieldsChanged =
            oldData.verification_status !== newData.verification_status ||
            oldData.is_verified !== newData.is_verified ||
            oldData.id_verified !== newData.id_verified ||
            oldData.business_verified !== newData.business_verified ||
            oldData.phone_verified !== newData.phone_verified;

          if (verificationFieldsChanged) {
            callback({
              id: newData.id,
              verification_status: newData.verification_status,
              is_verified: newData.is_verified,
              verified_at: newData.verified_at,
              id_verified: newData.id_verified,
              business_verified: newData.business_verified,
              phone_verified: newData.phone_verified,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`Profile verification subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  subscribeToPhoneVerification(
    userId: string,
    callback: PhoneVerificationCallback
  ): () => void {
    const channelName = `phone-verification-${userId}`;

    if (this.channels.has(channelName)) {
      console.warn(`Already subscribed to ${channelName}`);
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'phone_verifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Phone verification update:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = payload.new as PhoneVerificationUpdate;

            if (data.status === 'verified') {
              callback(data);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Phone verification subscription status: ${status}`);
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  subscribeToAllVerifications(
    userId: string,
    callbacks: {
      onRequestUpdate?: VerificationUpdateCallback;
      onProfileUpdate?: ProfileUpdateCallback;
      onPhoneUpdate?: PhoneVerificationCallback;
    }
  ): () => void {
    const unsubscribers: Array<() => void> = [];

    if (callbacks.onRequestUpdate) {
      unsubscribers.push(
        this.subscribeToVerificationRequests(userId, callbacks.onRequestUpdate)
      );
    }

    if (callbacks.onProfileUpdate) {
      unsubscribers.push(
        this.subscribeToProfileVerification(userId, callbacks.onProfileUpdate)
      );
    }

    if (callbacks.onPhoneUpdate) {
      unsubscribers.push(
        this.subscribeToPhoneVerification(userId, callbacks.onPhoneUpdate)
      );
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }

  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);

    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from ${channelName}`);
    });

    this.channels.clear();
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.channels.keys());
  }

  isSubscribed(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

export const verificationRealtimeManager = new VerificationRealtimeManager();

export async function getVerificationRequest(requestId: string): Promise<VerificationStatusUpdate | null> {
  try {
    const { data, error } = await supabase
      .from('provider_verification_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching verification request:', error);
    return null;
  }
}

export async function getLatestVerificationRequest(
  userId: string,
  verificationType?: 'Identity' | 'Business' | 'Background' | 'All'
): Promise<VerificationStatusUpdate | null> {
  try {
    let query = supabase
      .from('provider_verification_requests')
      .select('*')
      .eq('provider_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (verificationType) {
      query = query.eq('verification_type', verificationType);
    }

    const { data, error } = await query.single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching latest verification request:', error);
    return null;
  }
}

export async function getAllVerificationRequests(
  userId: string
): Promise<VerificationStatusUpdate[]> {
  try {
    const { data, error } = await supabase
      .from('provider_verification_requests')
      .select('*')
      .eq('provider_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    return [];
  }
}

export async function getProfileVerificationStatus(
  userId: string
): Promise<ProfileVerificationUpdate | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, verification_status, is_verified, verified_at, id_verified, business_verified, phone_verified')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching profile verification status:', error);
    return null;
  }
}

export function getVerificationStatusColor(status: string): string {
  switch (status) {
    case 'Verified':
    case 'Approved':
    case 'verified':
      return '#10B981';
    case 'Pending':
    case 'UnderReview':
    case 'pending':
      return '#F59E0B';
    case 'Rejected':
    case 'failed':
      return '#EF4444';
    case 'expired':
      return '#6B7280';
    default:
      return '#9CA3AF';
  }
}

export function getVerificationStatusLabel(status: string): string {
  switch (status) {
    case 'Verified':
    case 'Approved':
    case 'verified':
      return 'Verified';
    case 'Pending':
    case 'pending':
      return 'Pending';
    case 'UnderReview':
      return 'Under Review';
    case 'Rejected':
      return 'Rejected';
    case 'Unverified':
      return 'Not Verified';
    case 'failed':
      return 'Failed';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

export function getVerificationStatusIcon(status: string): string {
  switch (status) {
    case 'Verified':
    case 'Approved':
    case 'verified':
      return 'check-circle';
    case 'Pending':
    case 'pending':
    case 'UnderReview':
      return 'clock';
    case 'Rejected':
    case 'failed':
      return 'x-circle';
    case 'expired':
      return 'alert-circle';
    default:
      return 'help-circle';
  }
}

export async function markNotificationsAsRead(userId: string, type: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('type', type)
      .eq('is_read', false);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

export function formatVerificationDate(dateString: string | null): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}
