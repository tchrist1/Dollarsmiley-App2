import { supabase } from './supabase';

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  applies_to: string[];
  sort_order: number;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'post' | 'comment' | 'review' | 'listing' | 'user' | 'message' | 'booking';
  content_id: string;
  category_id: string;
  reason: string;
  description?: string;
  evidence_urls: string[];
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  category?: ReportCategory;
}

export interface ContentStrike {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  violation_category: string;
  violation_description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  strike_count: number;
  expires_at?: string;
  appealed: boolean;
  appeal_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface ReportAppeal {
  id: string;
  strike_id: string;
  user_id: string;
  appeal_reason: string;
  evidence_urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export async function getReportCategories(
  contentType: string
): Promise<ReportCategory[]> {
  try {
    const { data, error } = await supabase
      .from('report_categories')
      .select('*')
      .contains('applies_to', [contentType])
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return (data || []) as ReportCategory[];
  } catch (error) {
    console.error('Error fetching report categories:', error);
    return [];
  }
}

export async function submitContentReport(
  contentType: string,
  contentId: string,
  categoryId: string,
  reason: string,
  description?: string,
  evidenceUrls: string[] = []
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('submit_content_report', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_category_id: categoryId,
      p_reason: reason,
      p_description: description || null,
      p_evidence_urls: JSON.stringify(evidenceUrls),
    });

    if (error) throw error;

    return data as string;
  } catch (error) {
    console.error('Error submitting report:', error);
    return null;
  }
}

export async function getUserReports(userId: string): Promise<ContentReport[]> {
  try {
    const { data, error } = await supabase
      .from('content_reports')
      .select(`
        *,
        category:report_categories(*)
      `)
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []) as ContentReport[];
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return [];
  }
}

export async function getUserActiveStrikes(
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_user_active_strikes', {
      p_user_id: userId,
    });

    if (error) throw error;

    return (data || 0) as number;
  } catch (error) {
    console.error('Error fetching active strikes:', error);
    return 0;
  }
}

export async function getUserStrikes(userId: string): Promise<ContentStrike[]> {
  try {
    const { data, error } = await supabase
      .from('content_strikes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as ContentStrike[];
  } catch (error) {
    console.error('Error fetching user strikes:', error);
    return [];
  }
}

export async function submitStrikeAppeal(
  strikeId: string,
  appealReason: string,
  evidenceUrls: string[] = []
): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return false;

    const { error } = await supabase.from('report_appeals').insert({
      strike_id: strikeId,
      user_id: user.user.id,
      appeal_reason: appealReason,
      evidence_urls: evidenceUrls,
    });

    if (error) throw error;

    await supabase
      .from('content_strikes')
      .update({ appealed: true })
      .eq('id', strikeId);

    return true;
  } catch (error) {
    console.error('Error submitting appeal:', error);
    return false;
  }
}

export async function getUserAppeals(userId: string): Promise<ReportAppeal[]> {
  try {
    const { data, error } = await supabase
      .from('report_appeals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as ReportAppeal[];
  } catch (error) {
    console.error('Error fetching user appeals:', error);
    return [];
  }
}

export async function autoModerateContent(
  contentType: string,
  contentId: string,
  contentText: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('auto_moderate_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_content_text: contentText,
    });

    if (error) throw error;

    return data as boolean;
  } catch (error) {
    console.error('Error auto-moderating content:', error);
    return false;
  }
}

export async function deleteReport(reportId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
}

export function subscribeToReportUpdates(
  userId: string,
  callback: (report: ContentReport) => void
) {
  const channel = supabase
    .channel(`reports_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'content_reports',
        filter: `reporter_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as ContentReport);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
