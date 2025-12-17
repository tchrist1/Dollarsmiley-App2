import { supabase } from './supabase';

export interface SavedJob {
  saved_job_id: string;
  job_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  execution_date_start: string;
  execution_date_end: string | null;
  preferred_time: string;
  status: string;
  save_count: number;
  category_name: string;
  customer_id: string;
  customer_name: string;
  customer_rating: number | null;
  notes: string | null;
  saved_at: string;
}

export interface SavedJobBasic {
  id: string;
  user_id: string;
  job_id: string;
  notes: string | null;
  created_at: string;
}

export interface ToggleSavedJobResult {
  action: 'added' | 'removed';
  saved: boolean;
}

// Toggle a job as saved/unsaved
export async function toggleSavedJob(
  userId: string,
  jobId: string,
  notes?: string
): Promise<{ success: boolean; result?: ToggleSavedJobResult; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('toggle_saved_job', {
      p_user_id: userId,
      p_job_id: jobId,
      p_notes: notes || null,
    });

    if (error) throw error;

    return { success: true, result: data as ToggleSavedJobResult };
  } catch (error: any) {
    console.error('Error toggling saved job:', error);
    return { success: false, error: error.message };
  }
}

// Check if a job is saved by the user
export async function isJobSaved(
  userId: string,
  jobId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_job_saved', {
      p_user_id: userId,
      p_job_id: jobId,
    });

    if (error) throw error;
    return data as boolean;
  } catch (error) {
    console.error('Error checking if job is saved:', error);
    return false;
  }
}

// Get all saved jobs for a user with full details
export async function getSavedJobs(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<SavedJob[]> {
  try {
    const { data, error } = await supabase.rpc('get_saved_jobs_with_details', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;
    return (data || []) as SavedJob[];
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    return [];
  }
}

// Get saved jobs count
export async function getSavedJobsCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_saved_jobs_count', {
      p_user_id: userId,
    });

    if (error) throw error;
    return (data as number) || 0;
  } catch (error) {
    console.error('Error fetching saved jobs count:', error);
    return 0;
  }
}

// Update notes for a saved job
export async function updateSavedJobNotes(
  savedJobId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_saved_job_notes', {
      p_saved_job_id: savedJobId,
      p_notes: notes,
    });

    if (error) throw error;

    if (data === false) {
      throw new Error('Failed to update notes');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating saved job notes:', error);
    return { success: false, error: error.message };
  }
}

// Remove a saved job
export async function removeSavedJob(
  userId: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error removing saved job:', error);
    return { success: false, error: error.message };
  }
}

// Get saved job by ID
export async function getSavedJobById(
  savedJobId: string
): Promise<SavedJobBasic | null> {
  try {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('id', savedJobId)
      .maybeSingle();

    if (error) throw error;
    return data as SavedJobBasic | null;
  } catch (error) {
    console.error('Error fetching saved job:', error);
    return null;
  }
}

// Batch check if multiple jobs are saved
export async function checkMultipleJobsSaved(
  userId: string,
  jobIds: string[]
): Promise<Record<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', userId)
      .in('job_id', jobIds);

    if (error) throw error;

    const savedJobIds = new Set((data || []).map((item) => item.job_id));
    const result: Record<string, boolean> = {};

    jobIds.forEach((jobId) => {
      result[jobId] = savedJobIds.has(jobId);
    });

    return result;
  } catch (error) {
    console.error('Error checking multiple saved jobs:', error);
    return {};
  }
}

// Get recently saved jobs
export async function getRecentlySavedJobs(
  userId: string,
  limit: number = 5
): Promise<SavedJob[]> {
  return getSavedJobs(userId, limit, 0);
}

// Search saved jobs
export async function searchSavedJobs(
  userId: string,
  query: string
): Promise<SavedJob[]> {
  try {
    const allSavedJobs = await getSavedJobs(userId, 100, 0);

    if (!query.trim()) {
      return allSavedJobs;
    }

    const queryLower = query.toLowerCase();

    return allSavedJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(queryLower) ||
        job.description.toLowerCase().includes(queryLower) ||
        job.category_name.toLowerCase().includes(queryLower) ||
        job.location.toLowerCase().includes(queryLower) ||
        (job.notes && job.notes.toLowerCase().includes(queryLower))
    );
  } catch (error) {
    console.error('Error searching saved jobs:', error);
    return [];
  }
}

// Filter saved jobs by status
export async function filterSavedJobsByStatus(
  userId: string,
  status: string
): Promise<SavedJob[]> {
  try {
    const allSavedJobs = await getSavedJobs(userId, 100, 0);

    return allSavedJobs.filter((job) => job.status === status);
  } catch (error) {
    console.error('Error filtering saved jobs:', error);
    return [];
  }
}

// Get saved jobs statistics
export async function getSavedJobsStats(userId: string): Promise<{
  total: number;
  open: number;
  closed: number;
  expired: number;
  avgBudget: number;
}> {
  try {
    const allSavedJobs = await getSavedJobs(userId, 1000, 0);

    const stats = {
      total: allSavedJobs.length,
      open: 0,
      closed: 0,
      expired: 0,
      avgBudget: 0,
    };

    let totalBudget = 0;
    let budgetCount = 0;

    allSavedJobs.forEach((job) => {
      if (job.status === 'Open') stats.open++;
      if (job.status === 'Closed') stats.closed++;

      // Check if expired
      const executionDate = new Date(job.execution_date_start);
      if (executionDate < new Date() && job.status === 'Open') {
        stats.expired++;
      }

      // Calculate average budget
      if (job.budget_min !== null && job.budget_max !== null) {
        totalBudget += (job.budget_min + job.budget_max) / 2;
        budgetCount++;
      } else if (job.budget_min !== null) {
        totalBudget += job.budget_min;
        budgetCount++;
      } else if (job.budget_max !== null) {
        totalBudget += job.budget_max;
        budgetCount++;
      }
    });

    if (budgetCount > 0) {
      stats.avgBudget = totalBudget / budgetCount;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching saved jobs stats:', error);
    return { total: 0, open: 0, closed: 0, expired: 0, avgBudget: 0 };
  }
}

// Format budget for display
export function formatJobBudget(
  budgetMin: number | null,
  budgetMax: number | null
): string {
  if (!budgetMin && !budgetMax) return 'Budget not specified';
  if (budgetMin && budgetMax) return `$${budgetMin} - $${budgetMax}`;
  if (budgetMin) return `From $${budgetMin}`;
  if (budgetMax) return `Up to $${budgetMax}`;
  return 'Budget not specified';
}

// Calculate days until job execution
export function getDaysUntilExecution(executionDate: string): number {
  const today = new Date();
  const execution = new Date(executionDate);
  const diffTime = execution.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Check if job is urgent (within 3 days)
export function isJobUrgent(executionDate: string): boolean {
  return getDaysUntilExecution(executionDate) <= 3;
}

// Check if job is expired
export function isJobExpired(executionDate: string, status: string): boolean {
  return getDaysUntilExecution(executionDate) < 0 && status === 'Open';
}

// Format execution date
export function formatExecutionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get relative time since saved
export function getTimeSinceSaved(savedAt: string): string {
  const now = new Date();
  const saved = new Date(savedAt);
  const diffMs = now.getTime() - saved.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
