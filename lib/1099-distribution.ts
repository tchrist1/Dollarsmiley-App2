import { supabase } from './supabase';
import { type Provider1099Summary } from './1099-nec-calculation';

export type FormStatus = 'draft' | 'ready' | 'delivered' | 'viewed' | 'downloaded';
export type DeliveryMethod = 'portal' | 'email' | 'mail';
export type AccessAction = 'viewed' | 'downloaded' | 'printed' | 'emailed' | 'shared';

export interface Form1099Distribution {
  id: string;
  provider_id: string;
  tax_year: number;
  form_type: string;
  nonemployee_compensation: number;
  federal_tax_withheld: number;
  state_tax_withheld?: number;
  state?: string;
  state_income?: number;
  generated_at: string;
  generated_by: string;
  file_path?: string;
  file_hash?: string;
  status: FormStatus;
  delivery_method?: DeliveryMethod;
  email_sent_at?: string;
  mailed_at?: string;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Form1099AccessLog {
  id: string;
  distribution_id: string;
  provider_id: string;
  action: AccessAction;
  ip_address: string;
  user_agent: string;
  accessed_at: string;
  metadata: Record<string, any>;
}

export interface DeliveryConfirmation {
  id: string;
  distribution_id: string;
  provider_id: string;
  confirmation_code: string;
  confirmation_method: string;
  confirmed_at?: string;
  ip_address?: string;
  created_at: string;
  expires_at: string;
}

export interface ProviderForm1099 {
  id: string;
  tax_year: number;
  form_type: string;
  nonemployee_compensation: number;
  status: FormStatus;
  generated_at: string;
  viewed_count: number;
  downloaded_count: number;
  last_accessed_at?: string;
}

// Create 1099 distribution from summary
export async function create1099Distribution(
  summary: Provider1099Summary,
  generatedBy: string
): Promise<{ success: boolean; data?: Form1099Distribution; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('form_1099_distributions')
      .insert({
        provider_id: summary.provider_id,
        tax_year: summary.tax_year,
        form_type: '1099-NEC',
        nonemployee_compensation: summary.nonemployee_compensation,
        federal_tax_withheld: 0,
        generated_by: generatedBy,
        status: 'ready',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating 1099 distribution:', error);
    return { success: false, error: error.message };
  }
}

// Get provider's available 1099 forms
export async function getProvider1099Forms(providerId: string): Promise<ProviderForm1099[]> {
  try {
    const { data, error } = await supabase.rpc('get_provider_1099_forms', {
      p_provider_id: providerId,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching provider 1099 forms:', error);
    return [];
  }
}

// Get specific 1099 distribution
export async function get1099Distribution(
  distributionId: string
): Promise<Form1099Distribution | null> {
  try {
    const { data, error } = await supabase
      .from('form_1099_distributions')
      .select('*')
      .eq('id', distributionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching 1099 distribution:', error);
    return null;
  }
}

// Log 1099 form access
export async function log1099Access(
  distributionId: string,
  providerId: string,
  action: AccessAction,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get IP address and user agent
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent || 'Unknown';

    const { error } = await supabase.rpc('log_1099_access', {
      p_distribution_id: distributionId,
      p_provider_id: providerId,
      p_action: action,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: metadata || {},
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error logging 1099 access:', error);
    return { success: false, error: error.message };
  }
}

// Get access logs for a distribution
export async function get1099AccessLogs(
  distributionId: string
): Promise<Form1099AccessLog[]> {
  try {
    const { data, error } = await supabase
      .from('form_1099_access_logs')
      .select('*')
      .eq('distribution_id', distributionId)
      .order('accessed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return [];
  }
}

// Create delivery confirmation
export async function createDeliveryConfirmation(
  distributionId: string,
  providerId: string,
  method: 'email' | 'sms' | 'portal',
  expiresHours: number = 72
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_1099_delivery_confirmation', {
      p_distribution_id: distributionId,
      p_provider_id: providerId,
      p_confirmation_method: method,
      p_expires_hours: expiresHours,
    });

    if (error) throw error;

    return { success: true, code: data };
  } catch (error: any) {
    console.error('Error creating delivery confirmation:', error);
    return { success: false, error: error.message };
  }
}

// Confirm delivery
export async function confirmDelivery(
  confirmationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ipAddress = await getClientIP();

    const { data, error } = await supabase.rpc('confirm_1099_delivery', {
      p_confirmation_code: confirmationCode,
      p_ip_address: ipAddress,
    });

    if (error) throw error;

    if (!data) {
      return { success: false, error: 'Invalid or expired confirmation code' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error confirming delivery:', error);
    return { success: false, error: error.message };
  }
}

// Update distribution status
export async function update1099Status(
  distributionId: string,
  status: FormStatus,
  deliveryMethod?: DeliveryMethod
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status };

    if (deliveryMethod) {
      updateData.delivery_method = deliveryMethod;
    }

    if (status === 'delivered' && deliveryMethod === 'email') {
      updateData.email_sent_at = new Date().toISOString();
    }

    if (status === 'delivered' && deliveryMethod === 'mail') {
      updateData.mailed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('form_1099_distributions')
      .update(updateData)
      .eq('id', distributionId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating 1099 status:', error);
    return { success: false, error: error.message };
  }
}

// Get all distributions for a tax year (admin)
export async function get1099DistributionsByYear(
  taxYear: number
): Promise<Form1099Distribution[]> {
  try {
    const { data, error } = await supabase
      .from('form_1099_distributions')
      .select(
        `
        *,
        provider:profiles!form_1099_distributions_provider_id_fkey(
          id,
          full_name,
          email
        )
      `
      )
      .eq('tax_year', taxYear)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching distributions by year:', error);
    return [];
  }
}

// Get access statistics for a tax year
export async function get1099AccessStats(taxYear: number): Promise<{
  total_distributed: number;
  viewed_count: number;
  downloaded_count: number;
  not_accessed_count: number;
  access_rate: number;
}> {
  try {
    const { data, error } = await supabase.rpc('get_1099_access_stats', {
      p_tax_year: taxYear,
    });

    if (error) throw error;

    return (
      data?.[0] || {
        total_distributed: 0,
        viewed_count: 0,
        downloaded_count: 0,
        not_accessed_count: 0,
        access_rate: 0,
      }
    );
  } catch (error) {
    console.error('Error fetching access stats:', error);
    return {
      total_distributed: 0,
      viewed_count: 0,
      downloaded_count: 0,
      not_accessed_count: 0,
      access_rate: 0,
    };
  }
}

// Send notification to provider
export async function send1099Notification(
  distribution: Form1099Distribution
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create delivery confirmation
    const confirmation = await createDeliveryConfirmation(
      distribution.id,
      distribution.provider_id,
      'portal'
    );

    if (!confirmation.success) {
      throw new Error(confirmation.error);
    }

    // TODO: Send email notification with confirmation code
    // This would integrate with your email service

    // Mark notification as sent
    const { error } = await supabase
      .from('form_1099_distributions')
      .update({ notification_sent: true })
      .eq('id', distribution.id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error sending 1099 notification:', error);
    return { success: false, error: error.message };
  }
}

// Bulk send notifications
export async function bulkSend1099Notifications(
  distributions: Form1099Distribution[]
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const distribution of distributions) {
    const result = await send1099Notification(distribution);
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${distribution.provider_id}: ${result.error}`);
    }
  }

  return {
    success: sent > 0,
    sent,
    failed,
    errors,
  };
}

// Check if provider has unviewed 1099s
export async function hasUnviewed1099s(providerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('form_1099_distributions')
      .select('id')
      .eq('provider_id', providerId)
      .in('status', ['ready', 'delivered'])
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking unviewed 1099s:', error);
    return false;
  }
}

// Helper: Get client IP address
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'Unknown';
  } catch (error) {
    console.error('Error fetching IP:', error);
    return 'Unknown';
  }
}

// Helper: Format status for display
export function format1099Status(status: FormStatus): string {
  const labels: Record<FormStatus, string> = {
    draft: 'Draft',
    ready: 'Ready',
    delivered: 'Delivered',
    viewed: 'Viewed',
    downloaded: 'Downloaded',
  };
  return labels[status] || status;
}

// Helper: Get status color
export function get1099StatusColor(status: FormStatus): string {
  const colors: Record<FormStatus, string> = {
    draft: '#6B7280',
    ready: '#F59E0B',
    delivered: '#3B82F6',
    viewed: '#10B981',
    downloaded: '#059669',
  };
  return colors[status] || '#6B7280';
}

// Helper: Format access action
export function formatAccessAction(action: AccessAction): string {
  const labels: Record<AccessAction, string> = {
    viewed: 'Viewed',
    downloaded: 'Downloaded',
    printed: 'Printed',
    emailed: 'Emailed',
    shared: 'Shared',
  };
  return labels[action] || action;
}

// Helper: Check if confirmation code is valid format
export function isValidConfirmationCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}

// Helper: Calculate days until expiration
export function getDaysUntilExpiration(expiresAt: string): number {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffTime = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Helper: Check if access is recent
export function isRecentAccess(accessedAt: string, hours: number = 24): boolean {
  const now = new Date();
  const accessed = new Date(accessedAt);
  const diffHours = (now.getTime() - accessed.getTime()) / (1000 * 60 * 60);
  return diffHours <= hours;
}
