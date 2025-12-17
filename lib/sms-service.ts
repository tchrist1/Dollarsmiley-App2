import { supabase } from './supabase';
import type { EmailPriority } from './email-service';

export type SmsStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'cancelled';

export interface SmsSettings {
  id: string;
  team_id: string;
  account_sid: string;
  auth_token: string;
  from_number: string;
  daily_limit: number;
  sms_sent_today: number;
  last_reset_date: string;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SmsTemplate {
  id: string;
  team_id?: string;
  name: string;
  slug: string;
  message: string;
  variables: string[];
  category?: string;
  description?: string;
  character_count: number;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SmsQueue {
  id: string;
  team_id: string;
  template_id?: string;
  priority: EmailPriority;
  to_number: string;
  from_number?: string;
  message: string;
  variables: Record<string, any>;
  scheduled_for?: string;
  attempts: number;
  max_attempts: number;
  status: SmsStatus;
  error_message?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SmsLog {
  id: string;
  team_id: string;
  queue_id?: string;
  template_id?: string;
  twilio_sid?: string;
  to_number: string;
  from_number: string;
  message: string;
  status: SmsStatus;
  segments: number;
  delivered_at?: string;
  failed_at?: string;
  failure_reason?: string;
  error_code?: string;
  price?: number;
  price_unit?: string;
  events: any[];
  metadata?: any;
  sent_at: string;
  created_at: string;
}

export interface SmsStats {
  total_sent: number;
  delivered: number;
  undelivered: number;
  failed: number;
  delivery_rate: number;
  total_segments: number;
  total_cost: number;
}

// SMS Settings
export async function getSmsSettings(teamId: string): Promise<SmsSettings | null> {
  try {
    const { data, error } = await supabase
      .from('sms_settings')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting SMS settings:', error);
    return null;
  }
}

export async function createSmsSettings(
  teamId: string,
  settings: {
    account_sid: string;
    auth_token: string;
    from_number: string;
    daily_limit?: number;
  }
): Promise<SmsSettings | null> {
  try {
    const { data, error } = await supabase
      .from('sms_settings')
      .insert({
        team_id: teamId,
        ...settings,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating SMS settings:', error);
    return null;
  }
}

export async function updateSmsSettings(
  teamId: string,
  settings: Partial<SmsSettings>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sms_settings')
      .update(settings)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    return false;
  }
}

export async function canSendSms(teamId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_send_sms', {
      p_team_id: teamId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking SMS limit:', error);
    return false;
  }
}

// SMS Templates
export async function getSmsTemplates(
  teamId: string,
  options?: {
    category?: string;
    active?: boolean;
  }
): Promise<SmsTemplate[]> {
  try {
    let query = supabase
      .from('sms_templates')
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
    console.error('Error getting SMS templates:', error);
    return [];
  }
}

export async function getSmsTemplate(templateId: string): Promise<SmsTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('sms_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting SMS template:', error);
    return null;
  }
}

export async function getSmsTemplateBySlug(
  teamId: string,
  slug: string
): Promise<SmsTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('sms_templates')
      .select('*')
      .eq('team_id', teamId)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting SMS template by slug:', error);
    return null;
  }
}

export async function createSmsTemplate(
  teamId: string,
  template: {
    name: string;
    slug: string;
    message: string;
    variables?: string[];
    category?: string;
    description?: string;
    created_by: string;
  }
): Promise<SmsTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('sms_templates')
      .insert({
        team_id: teamId,
        ...template,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating SMS template:', error);
    return null;
  }
}

export async function updateSmsTemplate(
  templateId: string,
  updates: Partial<SmsTemplate>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sms_templates')
      .update(updates)
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating SMS template:', error);
    return false;
  }
}

export async function deleteSmsTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sms_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting SMS template:', error);
    return false;
  }
}

// SMS Queue
export async function queueSms(
  teamId: string,
  sms: {
    template_id?: string;
    to_number: string;
    message?: string;
    variables?: Record<string, any>;
    priority?: EmailPriority;
    scheduled_for?: string;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('queue_sms', {
      p_team_id: teamId,
      p_template_id: sms.template_id,
      p_to_number: sms.to_number,
      p_message: sms.message,
      p_variables: sms.variables || {},
      p_priority: sms.priority || 'normal',
      p_scheduled_for: sms.scheduled_for,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error queueing SMS:', error);
    return null;
  }
}

export async function getQueuedSms(
  teamId: string,
  options?: {
    status?: SmsStatus;
    limit?: number;
  }
): Promise<SmsQueue[]> {
  try {
    let query = supabase
      .from('sms_queue')
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
    console.error('Error getting queued SMS:', error);
    return [];
  }
}

export async function cancelQueuedSms(queueId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sms_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId)
      .eq('status', 'queued');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cancelling queued SMS:', error);
    return false;
  }
}

// SMS Logs
export async function getSmsLogs(
  teamId: string,
  options?: {
    status?: SmsStatus;
    limit?: number;
    offset?: number;
  }
): Promise<SmsLog[]> {
  try {
    let query = supabase
      .from('sms_logs')
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
    console.error('Error getting SMS logs:', error);
    return [];
  }
}

export async function getSmsLog(logId: string): Promise<SmsLog | null> {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting SMS log:', error);
    return null;
  }
}

export async function getSmsStats(teamId: string, days: number = 30): Promise<SmsStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_sms_stats', {
      p_team_id: teamId,
      p_days: days,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting SMS stats:', error);
    return null;
  }
}

// Utility Functions
export function formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If no country code, add it
  if (!phone.startsWith('+')) {
    return `${countryCode}${digits}`;
  }

  return `+${digits}`;
}

export function validatePhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const regex = /^\+?[1-9]\d{1,14}$/;
  const digits = phone.replace(/\D/g, '');
  return regex.test(`+${digits}`);
}

export function calculateSmsSegments(message: string): number {
  const length = message.length;

  // Check if contains special characters (requires UCS-2 encoding)
  const hasUnicode = /[^\x00-\x7F]/.test(message);

  if (hasUnicode) {
    // UCS-2 encoding: 70 chars per segment, 67 for concatenated
    if (length <= 70) return 1;
    return Math.ceil(length / 67);
  } else {
    // GSM-7 encoding: 160 chars per segment, 153 for concatenated
    if (length <= 160) return 1;
    return Math.ceil(length / 153);
  }
}

export function calculateSmsCost(
  segments: number,
  pricePerSegment: number = 0.0075
): number {
  return segments * pricePerSegment;
}

export function getSmsStatusColor(status: SmsStatus): string {
  switch (status) {
    case 'delivered':
    case 'sent':
      return '#10B981'; // green
    case 'queued':
    case 'sending':
      return '#F59E0B'; // orange
    case 'undelivered':
    case 'failed':
      return '#EF4444'; // red
    case 'cancelled':
      return '#6B7280'; // gray
  }
}

export function getSmsStatusLabel(status: SmsStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function truncateMessage(message: string, maxLength: number = 50): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
}

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

export function renderSmsTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });

  return rendered;
}

export function getSmsCharacterInfo(message: string): {
  length: number;
  segments: number;
  encoding: 'GSM-7' | 'UCS-2';
  maxLength: number;
  remaining: number;
} {
  const length = message.length;
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  const encoding = hasUnicode ? 'UCS-2' : 'GSM-7';
  const segments = calculateSmsSegments(message);

  let maxLength: number;
  let segmentSize: number;

  if (hasUnicode) {
    segmentSize = segments === 1 ? 70 : 67;
    maxLength = segments === 1 ? 70 : segments * 67;
  } else {
    segmentSize = segments === 1 ? 160 : 153;
    maxLength = segments === 1 ? 160 : segments * 153;
  }

  const remaining = maxLength - length;

  return {
    length,
    segments,
    encoding,
    maxLength,
    remaining,
  };
}

export function formatSmsPrice(price?: number, unit?: string): string {
  if (!price) return 'N/A';
  return `${unit || '$'}${price.toFixed(4)}`;
}

export function calculateDeliveryRate(delivered: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((delivered / sent) * 100);
}
