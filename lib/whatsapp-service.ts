import { supabase } from './supabase';
import type { EmailPriority } from './email-service';

export type WhatsAppMessageType =
  | 'text'
  | 'template'
  | 'image'
  | 'document'
  | 'video'
  | 'audio'
  | 'location'
  | 'interactive';

export type WhatsAppTemplateStatus = 'pending' | 'approved' | 'rejected' | 'paused';

export type WhatsAppMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled';

export interface WhatsAppSettings {
  id: string;
  team_id: string;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  webhook_verify_token?: string;
  daily_limit: number;
  messages_sent_today: number;
  last_reset_date: string;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  team_id?: string;
  name: string;
  language: string;
  category: string;
  components: any;
  status: WhatsAppTemplateStatus;
  whatsapp_template_id?: string;
  rejection_reason?: string;
  is_active: boolean;
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppQueue {
  id: string;
  team_id: string;
  template_id?: string;
  priority: EmailPriority;
  to_number: string;
  message_type: WhatsAppMessageType;
  content: any;
  media_url?: string;
  media_type?: string;
  scheduled_for?: string;
  attempts: number;
  max_attempts: number;
  status: WhatsAppMessageStatus;
  error_message?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLog {
  id: string;
  team_id: string;
  queue_id?: string;
  template_id?: string;
  whatsapp_message_id?: string;
  to_number: string;
  from_number: string;
  message_type: WhatsAppMessageType;
  content: any;
  status: WhatsAppMessageStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  failure_reason?: string;
  error_code?: string;
  conversation_id?: string;
  conversation_category?: string;
  events: any[];
  metadata?: any;
  created_at: string;
}

export interface WhatsAppStats {
  total_sent: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number;
  read_rate: number;
  by_type: Record<WhatsAppMessageType, number>;
}

// WhatsApp Settings
export async function getWhatsAppSettings(teamId: string): Promise<WhatsAppSettings | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting WhatsApp settings:', error);
    return null;
  }
}

export async function createWhatsAppSettings(
  teamId: string,
  settings: {
    phone_number_id: string;
    business_account_id: string;
    access_token: string;
    webhook_verify_token?: string;
    daily_limit?: number;
  }
): Promise<WhatsAppSettings | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .insert({
        team_id: teamId,
        ...settings,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating WhatsApp settings:', error);
    return null;
  }
}

export async function updateWhatsAppSettings(
  teamId: string,
  settings: Partial<WhatsAppSettings>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('whatsapp_settings')
      .update(settings)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    return false;
  }
}

export async function canSendWhatsApp(teamId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_send_whatsapp', {
      p_team_id: teamId,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking WhatsApp limit:', error);
    return false;
  }
}

// WhatsApp Templates
export async function getWhatsAppTemplates(
  teamId: string,
  options?: {
    status?: WhatsAppTemplateStatus;
    category?: string;
  }
): Promise<WhatsAppTemplate[]> {
  try {
    let query = supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('team_id', teamId)
      .order('name');

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting WhatsApp templates:', error);
    return [];
  }
}

export async function getWhatsAppTemplate(templateId: string): Promise<WhatsAppTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting WhatsApp template:', error);
    return null;
  }
}

export async function createWhatsAppTemplate(
  teamId: string,
  template: {
    name: string;
    language: string;
    category: string;
    components: any;
    created_by: string;
  }
): Promise<WhatsAppTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .insert({
        team_id: teamId,
        ...template,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    return null;
  }
}

export async function updateWhatsAppTemplate(
  templateId: string,
  updates: Partial<WhatsAppTemplate>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('whatsapp_templates')
      .update(updates)
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating WhatsApp template:', error);
    return false;
  }
}

export async function deleteWhatsAppTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('whatsapp_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting WhatsApp template:', error);
    return false;
  }
}

// WhatsApp Queue
export async function queueWhatsApp(
  teamId: string,
  message: {
    template_id?: string;
    to_number: string;
    message_type: WhatsAppMessageType;
    content: any;
    media_url?: string;
    priority?: EmailPriority;
    scheduled_for?: string;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('queue_whatsapp', {
      p_team_id: teamId,
      p_template_id: message.template_id,
      p_to_number: message.to_number,
      p_message_type: message.message_type,
      p_content: message.content,
      p_media_url: message.media_url,
      p_priority: message.priority || 'normal',
      p_scheduled_for: message.scheduled_for,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error queueing WhatsApp message:', error);
    return null;
  }
}

export async function getQueuedWhatsApp(
  teamId: string,
  options?: {
    status?: WhatsAppMessageStatus;
    limit?: number;
  }
): Promise<WhatsAppQueue[]> {
  try {
    let query = supabase
      .from('whatsapp_queue')
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
    console.error('Error getting queued WhatsApp messages:', error);
    return [];
  }
}

export async function cancelQueuedWhatsApp(queueId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('whatsapp_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId)
      .eq('status', 'queued');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error cancelling queued WhatsApp message:', error);
    return false;
  }
}

// WhatsApp Logs
export async function getWhatsAppLogs(
  teamId: string,
  options?: {
    status?: WhatsAppMessageStatus;
    message_type?: WhatsAppMessageType;
    limit?: number;
    offset?: number;
  }
): Promise<WhatsAppLog[]> {
  try {
    let query = supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.message_type) {
      query = query.eq('message_type', options.message_type);
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
    console.error('Error getting WhatsApp logs:', error);
    return [];
  }
}

export async function getWhatsAppLog(logId: string): Promise<WhatsAppLog | null> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting WhatsApp log:', error);
    return null;
  }
}

export async function getWhatsAppStats(
  teamId: string,
  days: number = 30
): Promise<WhatsAppStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_whatsapp_stats', {
      p_team_id: teamId,
      p_days: days,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting WhatsApp stats:', error);
    return null;
  }
}

// Utility Functions
export function formatWhatsAppNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // WhatsApp format (no + prefix)
  return digits;
}

export function validateWhatsAppNumber(phone: string): boolean {
  // WhatsApp requires 10-15 digits
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function getWhatsAppStatusColor(status: WhatsAppMessageStatus): string {
  switch (status) {
    case 'delivered':
    case 'sent':
      return '#10B981'; // green
    case 'read':
      return '#3B82F6'; // blue
    case 'queued':
    case 'sending':
      return '#F59E0B'; // orange
    case 'failed':
      return '#EF4444'; // red
    case 'cancelled':
      return '#6B7280'; // gray
  }
}

export function getWhatsAppStatusLabel(status: WhatsAppMessageStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getTemplateStatusColor(status: WhatsAppTemplateStatus): string {
  switch (status) {
    case 'approved':
      return '#10B981'; // green
    case 'pending':
      return '#F59E0B'; // orange
    case 'rejected':
      return '#EF4444'; // red
    case 'paused':
      return '#6B7280'; // gray
  }
}

export function getTemplateStatusLabel(status: WhatsAppTemplateStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getMessageTypeLabel(type: WhatsAppMessageType): string {
  const labels: Record<WhatsAppMessageType, string> = {
    text: 'Text',
    template: 'Template',
    image: 'Image',
    document: 'Document',
    video: 'Video',
    audio: 'Audio',
    location: 'Location',
    interactive: 'Interactive',
  };
  return labels[type];
}

export function getMessageTypeIcon(type: WhatsAppMessageType): string {
  const icons: Record<WhatsAppMessageType, string> = {
    text: '💬',
    template: '📋',
    image: '🖼️',
    document: '📄',
    video: '🎥',
    audio: '🎵',
    location: '📍',
    interactive: '🔘',
  };
  return icons[type];
}

export function calculateReadRate(read: number, delivered: number): number {
  if (delivered === 0) return 0;
  return Math.round((read / delivered) * 100);
}

export function calculateDeliveryRate(delivered: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.round((delivered / sent) * 100);
}

// Template Builder Helpers
export function buildTextTemplate(text: string): any {
  return {
    type: 'BODY',
    text: text,
  };
}

export function buildButtonTemplate(buttons: Array<{ type: string; text: string }>): any {
  return {
    type: 'BUTTONS',
    buttons: buttons.map((btn) => ({
      type: btn.type,
      text: btn.text,
    })),
  };
}

export function buildHeaderTemplate(type: 'text' | 'image' | 'document' | 'video', content: string): any {
  if (type === 'text') {
    return {
      type: 'HEADER',
      format: 'TEXT',
      text: content,
    };
  }

  return {
    type: 'HEADER',
    format: type.toUpperCase(),
    example: {
      header_handle: [content],
    },
  };
}

export function extractTemplateVariables(components: any[]): string[] {
  const variables: string[] = [];

  components.forEach((component) => {
    if (component.text) {
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const num = match.replace(/[{}]/g, '');
          if (!variables.includes(num)) {
            variables.push(num);
          }
        });
      }
    }
  });

  return variables.sort();
}

export function renderTemplateText(template: string, parameters: string[]): string {
  let rendered = template;

  parameters.forEach((param, index) => {
    rendered = rendered.replace(`{{${index + 1}}}`, param);
  });

  return rendered;
}
