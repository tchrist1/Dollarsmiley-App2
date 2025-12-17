import { supabase } from './supabase';

export type AnnouncementType = 'info' | 'warning' | 'success' | 'error' | 'maintenance' | 'feature' | 'update';
export type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TargetAudience = 'all' | 'providers' | 'customers' | 'verified' | 'premium';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  icon?: string;
  target_audience: TargetAudience;
  published_at?: string;
  expires_at?: string;
  is_dismissible: boolean;
  show_in_banner: boolean;
  show_in_notifications: boolean;
  require_acknowledgment: boolean;
  action_text?: string;
  action_url?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAnnouncement extends Omit<Announcement, 'created_by' | 'is_active' | 'target_audience' | 'show_in_notifications' | 'require_acknowledgment' | 'created_at' | 'updated_at'> {
  is_read: boolean;
  is_dismissed: boolean;
  is_acknowledged: boolean;
  read_at?: string;
}

export interface AnnouncementStats {
  total_reads: number;
  dismissed_count: number;
  acknowledged_count: number;
  unique_readers: number;
}

export async function getUserAnnouncements(
  userId: string
): Promise<UserAnnouncement[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_announcements', {
      p_user_id: userId,
    });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.announcement_id,
      title: item.title,
      content: item.content,
      type: item.type,
      priority: item.priority,
      icon: item.icon,
      published_at: item.published_at,
      expires_at: item.expires_at,
      is_dismissible: item.is_dismissible,
      show_in_banner: item.show_in_banner,
      action_text: item.action_text,
      action_url: item.action_url,
      is_read: item.is_read,
      is_dismissed: item.is_dismissed,
      is_acknowledged: item.is_acknowledged,
      read_at: item.read_at,
    }));
  } catch (error) {
    console.error('Error fetching user announcements:', error);
    return [];
  }
}

export async function getUnreadAnnouncementsCount(
  userId: string
): Promise<number> {
  try {
    const announcements = await getUserAnnouncements(userId);
    return announcements.filter((a) => !a.is_read && !a.is_dismissed).length;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

export async function getBannerAnnouncements(
  userId: string
): Promise<UserAnnouncement[]> {
  try {
    const announcements = await getUserAnnouncements(userId);
    return announcements.filter(
      (a) => a.show_in_banner && !a.is_dismissed
    );
  } catch (error) {
    console.error('Error fetching banner announcements:', error);
    return [];
  }
}

export async function markAnnouncementRead(
  announcementId: string,
  dismissed: boolean = false,
  acknowledged: boolean = false
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('mark_announcement_read', {
      p_announcement_id: announcementId,
      p_dismissed: dismissed,
      p_acknowledged: acknowledged,
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    return false;
  }
}

export async function dismissAnnouncement(
  announcementId: string
): Promise<boolean> {
  return markAnnouncementRead(announcementId, true, false);
}

export async function acknowledgeAnnouncement(
  announcementId: string
): Promise<boolean> {
  return markAnnouncementRead(announcementId, false, true);
}

// Admin functions
export async function getAllAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('platform_announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as Announcement[];
  } catch (error) {
    console.error('Error fetching all announcements:', error);
    return [];
  }
}

export async function createAnnouncement(
  announcement: Omit<Announcement, 'id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; announcementId?: string; error?: string }> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('platform_announcements')
      .insert({
        ...announcement,
        created_by: user.user.id,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, announcementId: data.id };
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return { success: false, error: error.message };
  }
}

export async function updateAnnouncement(
  announcementId: string,
  updates: Partial<Omit<Announcement, 'id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('platform_announcements')
      .update(updates)
      .eq('id', announcementId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteAnnouncement(
  announcementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return { success: false, error: error.message };
  }
}

export async function getAnnouncementStats(
  announcementId: string
): Promise<AnnouncementStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_announcement_stats', {
      p_announcement_id: announcementId,
    });

    if (error) throw error;

    return data as AnnouncementStats;
  } catch (error) {
    console.error('Error fetching announcement stats:', error);
    return null;
  }
}

export function getAnnouncementTypeColor(type: AnnouncementType): string {
  switch (type) {
    case 'info':
      return '#3B82F6'; // blue
    case 'success':
      return '#10B981'; // green
    case 'warning':
      return '#F59E0B'; // amber
    case 'error':
      return '#EF4444'; // red
    case 'maintenance':
      return '#8B5CF6'; // purple
    case 'feature':
      return '#06B6D4'; // cyan
    case 'update':
      return '#6366F1'; // indigo
    default:
      return '#6B7280'; // gray
  }
}

export function getAnnouncementTypeIcon(type: AnnouncementType): string {
  switch (type) {
    case 'info':
      return 'ℹ️';
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'maintenance':
      return '🔧';
    case 'feature':
      return '🎉';
    case 'update':
      return '🔄';
    default:
      return '📢';
  }
}

export function getPriorityColor(priority: AnnouncementPriority): string {
  switch (priority) {
    case 'urgent':
      return '#DC2626'; // red-600
    case 'high':
      return '#EA580C'; // orange-600
    case 'medium':
      return '#F59E0B'; // amber-500
    case 'low':
      return '#10B981'; // green-500
    default:
      return '#6B7280'; // gray-500
  }
}

export function subscribeToAnnouncements(
  callback: () => void
) {
  const channel = supabase
    .channel('announcements_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'platform_announcements',
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
