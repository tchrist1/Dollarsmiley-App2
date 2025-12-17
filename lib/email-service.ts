import { supabase } from './supabase';

export type EmailProvider = 'sendgrid' | 'mailgun' | 'smtp';
export type EmailStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed'
  | 'cancelled';
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface EmailSettings {
  id: string;
  team_id: string;
  provider: EmailProvider;
  api_key: string;
  from_email: string;
  from_name?: string;
  reply_to_email?: string;
  daily_limit: number;
  emails_sent_today: number;
  last_reset_date: string;
  track_opens: boolean;
  track_clicks: boolean;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  team_id?: string;
  name: string;
  slug: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables: string[];
  category?: string;
  description?: string;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailQueue {
  id: string;
  team_id: string;
  template_id?: string;
  priority: EmailPriority;
  to_email: string;
  to_name?: string;
  from_email?: string;
  from_name?: string;
  reply_to_email?: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables: Record<string, any>;
  attachments: any[];
  scheduled_for?: string;
  attempts: number;
  max_attempts: number;
  status: EmailStatus;
  error_message?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  team_id: string;
  queue_id?: string;
  template_id?: string;
  provider: EmailProvider;
  provider_message_id?: string;
  to_email: string;
  to_name?: string;
  from_email: string;
  from_name?: string;
  subject: string;
  status: EmailStatus;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  bounce_reason?: string;
  delivered_at?: string;
  failed_at?: string;
  failure_reason?: string;
  events: any[];
  metadata?: any;
  sent_at: string;
  created_at: string;
}

export interface EmailStats {
  total_sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  open_rate: number;
  click_rate: number;
}

// Email Settings
export async function getEmailSettings(teamId: string): Promise<EmailSettings | null> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting email settings:', error);
    return null;
  }
}

export async function createEmailSettings(
  teamId: string,
  settings: {
    provider: EmailProvider;
    api_key: string;
    from_email: string;
    from_name?: string;
    reply_to_email?: string;
    daily_limit?: number;
    track_opens?: boolean;
    track_clicks?: boolean;
  }
): Promise<EmailSettings | null> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .insert({
        team_id: teamId,
        ...settings,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating email settings:', error);
    return null;
  }
}

export async function updateEmailSettings(
  teamId: string,
  settings: Partial<EmailSettings>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_settings')
      .update(settings)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating email settings:', error);
    return false;
  }
}

export async function canSendEmail(teamId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_send_email', {
      p_team_id: teamId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking email limit:', error);
    return false;
  }
}

// Email Templates
export async function getEmailTemplates(
  teamId: string,
  options?: {
    category?: string;
    active?: boolean;
  }
): Promise<EmailTemplate[]> {
  try {
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('team_id', teamId)
      .order('name');

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.active !== undefined) {
      query = query.eq('is_active', options.active);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting email templates:', error);
    return [];
  }
}

export async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting email template:', error);
    return null;
  }
}

export async function getEmailTemplateBySlug(
  teamId: string,
  slug: string
): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('team_id', teamId)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting email template by slug:', error);
    return null;
  }
}

export async function createEmailTemplate(
  teamId: string,
  template: {
    name: string;
    slug: string;
    subject: string;
    html_body: string;
    text_body?: string;
    variables?: string[];
    category?: string;
    description?: string;
    created_by: string;
  }
): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        team_id: teamId,
        ...template,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating email template:', error);
    return null;
  }
}

export async function updateEmailTemplate(
  templateId: string,
  updates: Partial<EmailTemplate>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating email template:', error);
    return false;
  }
}

export async function deleteEmailTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting email template:', error);
    return false;
  }
}

// Email Queue
export async function queueEmail(
  teamId: string,
  email: {
    template_id?: string;
    to_email: string;
    to_name?: string;
    subject?: string;
    html_body?: string;
    text_body?: string;
    variables?: Record<string, any>;
    priority?: EmailPriority;
    scheduled_for?: string;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('queue_email', {
      p_team_id: teamId,
      p_template_id: email.template_id,
      p_to_email: email.to_email,
      p_to_name: email.to_name,
      p_subject: email.subject,
      p_html_body: email.html_body,
      p_text_body: email.text_body,
      p_variables: email.variables || {},
      p_priority: email.priority || 'normal',
      p_scheduled_for: email.scheduled_for,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error queueing email:', error);
    return null;
  }
}

export async function getQueuedEmails(
  teamId: string,
  options?: {
    status?: EmailStatus;
    limit?: number;
  }
): Promise<EmailQueue[]> {
  try {
    let query = supabase
      .from('email_queue')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting queued emails:', error);
    return [];
  }
}

export async function cancelQueuedEmail(queueId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId)
      .eq('status', 'queued');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cancelling queued email:', error);
    return false;
  }
}

// Email Logs
export async function getEmailLogs(
  teamId: string,
  options?: {
    status?: EmailStatus;
    limit?: number;
    offset?: number;
  }
): Promise<EmailLog[]> {
  try {
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('team_id', teamId)
      .order('sent_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting email logs:', error);
    return [];
  }
}

export async function getEmailLog(logId: string): Promise<EmailLog | null> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting email log:', error);
    return null;
  }
}

export async function getEmailStats(
  teamId: string,
  days: number = 30
): Promise<EmailStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_email_stats', {
      p_team_id: teamId,
      p_days: days,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting email stats:', error);
    return null;
  }
}

// Utility Functions
export function extractVariablesFromTemplate(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

export function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });

  return rendered;
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function getEmailStatusColor(status: EmailStatus): string {
  switch (status) {
    case 'delivered':
    case 'sent':
      return '#10B981'; // green
    case 'opened':
    case 'clicked':
      return '#3B82F6'; // blue
    case 'queued':
    case 'sending':
      return '#F59E0B'; // orange
    case 'bounced':
    case 'failed':
      return '#EF4444'; // red
    case 'cancelled':
      return '#6B7280'; // gray
  }
}

export function getEmailStatusLabel(status: EmailStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getPriorityLabel(priority: EmailPriority): string {
  const labels: Record<EmailPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority];
}

export function getPriorityColor(priority: EmailPriority): string {
  switch (priority) {
    case 'urgent':
      return '#EF4444'; // red
    case 'high':
      return '#F59E0B'; // orange
    case 'normal':
      return '#3B82F6'; // blue
    case 'low':
      return '#6B7280'; // gray
  }
}

export function formatEmailAddress(email: string, name?: string): string {
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}

export function calculateOpenRate(opened: number, delivered: number): number {
  if (delivered === 0) return 0;
  return Math.round((opened / delivered) * 100);
}

export function calculateClickRate(clicked: number, delivered: number): number {
  if (delivered === 0) return 0;
  return Math.round((clicked / delivered) * 100);
}

export function calculateBounceRate(bounced: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((bounced / sent) * 100);
}
