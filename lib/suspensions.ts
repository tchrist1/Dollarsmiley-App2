import { supabase } from './supabase';

export interface UserSuspension {
  id: string;
  user_id: string;
  suspended_by: string;
  suspension_type: 'temporary' | 'permanent';
  reason: string;
  details?: string;
  severity: 'warning' | 'minor' | 'moderate' | 'severe' | 'critical';
  suspended_at: string;
  expires_at?: string;
  is_active: boolean;
  lifted_at?: string;
  lifted_by?: string;
  lift_reason?: string;
  created_at: string;
}

export interface SuspensionAppeal {
  id: string;
  suspension_id: string;
  user_id: string;
  appeal_text: string;
  evidence_urls: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface SuspensionDetails {
  is_suspended: boolean;
  suspension?: UserSuspension;
  appeals?: SuspensionAppeal[];
  suspension_history?: UserSuspension[];
}

export async function suspendUser(
  userId: string,
  suspensionType: 'temporary' | 'permanent',
  reason: string,
  details: string,
  severity: 'warning' | 'minor' | 'moderate' | 'severe' | 'critical',
  durationDays?: number
): Promise<{ success: boolean; suspensionId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('suspend_user', {
      p_user_id: userId,
      p_suspension_type: suspensionType,
      p_reason: reason,
      p_details: details,
      p_severity: severity,
      p_duration_days: durationDays || null,
    });

    if (error) throw error;

    return { success: true, suspensionId: data };
  } catch (error: any) {
    console.error('Error suspending user:', error);
    return { success: false, error: error.message };
  }
}

export async function liftSuspension(
  suspensionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('lift_suspension', {
      p_suspension_id: suspensionId,
      p_reason: reason,
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error lifting suspension:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserSuspensions(
  userId: string
): Promise<UserSuspension[]> {
  try {
    const { data, error } = await supabase
      .from('user_suspensions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as UserSuspension[];
  } catch (error) {
    console.error('Error fetching user suspensions:', error);
    return [];
  }
}

export async function getActiveSuspension(
  userId: string
): Promise<UserSuspension | null> {
  try {
    const { data, error } = await supabase
      .from('user_suspensions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    return data as UserSuspension | null;
  } catch (error) {
    console.error('Error fetching active suspension:', error);
    return null;
  }
}

export async function getSuspensionDetails(
  userId: string
): Promise<SuspensionDetails | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_suspension_details', {
      p_user_id: userId,
    });

    if (error) throw error;

    return data as SuspensionDetails;
  } catch (error) {
    console.error('Error fetching suspension details:', error);
    return null;
  }
}

export async function submitSuspensionAppeal(
  suspensionId: string,
  appealText: string,
  evidenceUrls: string[] = []
): Promise<{ success: boolean; appealId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('submit_suspension_appeal', {
      p_suspension_id: suspensionId,
      p_appeal_text: appealText,
      p_evidence_urls: JSON.stringify(evidenceUrls),
    });

    if (error) throw error;

    return { success: true, appealId: data };
  } catch (error: any) {
    console.error('Error submitting appeal:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserAppeals(
  userId: string
): Promise<SuspensionAppeal[]> {
  try {
    const { data, error } = await supabase
      .from('suspension_appeals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as SuspensionAppeal[];
  } catch (error) {
    console.error('Error fetching appeals:', error);
    return [];
  }
}

export async function getPendingAppeals(): Promise<SuspensionAppeal[]> {
  try {
    const { data, error } = await supabase
      .from('suspension_appeals')
      .select(`
        *,
        suspension:user_suspensions(*),
        user:profiles(id, full_name, email)
      `)
      .in('status', ['pending', 'under_review'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []) as any[];
  } catch (error) {
    console.error('Error fetching pending appeals:', error);
    return [];
  }
}

export async function reviewAppeal(
  appealId: string,
  status: 'approved' | 'rejected',
  reviewNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('suspension_appeals')
      .update({
        status,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', appealId);

    if (error) throw error;

    // If appeal is approved, lift the suspension
    if (status === 'approved') {
      const { data: appeal } = await supabase
        .from('suspension_appeals')
        .select('suspension_id')
        .eq('id', appealId)
        .single();

      if (appeal) {
        await liftSuspension(
          appeal.suspension_id,
          `Appeal approved: ${reviewNotes}`
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error reviewing appeal:', error);
    return { success: false, error: error.message };
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#DC2626'; // red-600
    case 'severe':
      return '#EA580C'; // orange-600
    case 'moderate':
      return '#F59E0B'; // amber-500
    case 'minor':
      return '#10B981'; // green-500
    case 'warning':
      return '#3B82F6'; // blue-500
    default:
      return '#6B7280'; // gray-500
  }
}

export function formatDuration(days: number): string {
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
}

export function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }
}

export function subscribeToSuspensionChanges(
  userId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(`suspension_changes_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_suspensions',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
