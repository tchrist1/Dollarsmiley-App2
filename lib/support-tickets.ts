import { supabase } from './supabase';

export type TicketStatus = 'Open' | 'InProgress' | 'Waiting' | 'Resolved' | 'Closed' | 'Cancelled';
export type TicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TicketSource = 'Web' | 'Mobile' | 'Email' | 'Phone' | 'Chat';
export type AgentOnlineStatus = 'Online' | 'Away' | 'Offline';

export interface SupportCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  default_priority: TicketPriority;
  sla_response_hours: number;
  sla_resolution_hours: number;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_to: string | null;
  category_id: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  related_booking_id: string | null;
  related_transaction_id: string | null;
  tags: string[];
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  sla_breach: boolean;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  is_from_staff: boolean;
  attachments: Array<{ name: string; url: string; size: number }>;
  created_at: string;
}

export interface TicketAssignment {
  id: string;
  ticket_id: string;
  assigned_from: string | null;
  assigned_to: string;
  assigned_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface TicketStatusHistory {
  id: string;
  ticket_id: string;
  from_status: TicketStatus | null;
  to_status: TicketStatus;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface SupportAgent {
  id: string;
  user_id: string;
  team_name: string | null;
  specialties: string[];
  max_concurrent_tickets: number;
  is_active: boolean;
  online_status: AgentOnlineStatus;
  last_activity_at: string | null;
  created_at: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  slug: string;
  content: string;
  category_id: string | null;
  is_active: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
}

export interface TicketSLATracking {
  id: string;
  ticket_id: string;
  response_due_at: string;
  resolution_due_at: string;
  first_response_breach: boolean;
  resolution_breach: boolean;
  created_at: string;
}

/**
 * Get all support categories
 */
export async function getSupportCategories(): Promise<SupportCategory[]> {
  try {
    const { data, error } = await supabase
      .from('support_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching support categories:', error);
    return [];
  }
}

/**
 * Get tickets for current user
 */
export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
}

/**
 * Get ticket by ID
 */
export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
}

/**
 * Create support ticket
 */
export async function createSupportTicket(
  ticket: Omit<SupportTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'first_response_at' | 'resolved_at' | 'closed_at' | 'sla_breach'>
): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([ticket])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    return null;
  }
}

/**
 * Update ticket
 */
export async function updateTicket(
  ticketId: string,
  updates: Partial<SupportTicket>
): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating ticket:', error);
    return null;
  }
}

/**
 * Get ticket messages
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    return [];
  }
}

/**
 * Add message to ticket
 */
export async function addTicketMessage(
  message: Omit<TicketMessage, 'id' | 'created_at'>
): Promise<TicketMessage | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert([message])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding ticket message:', error);
    return null;
  }
}

/**
 * Get ticket status history
 */
export async function getTicketStatusHistory(
  ticketId: string
): Promise<TicketStatusHistory[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_status_history')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching status history:', error);
    return [];
  }
}

/**
 * Get canned responses
 */
export async function getCannedResponses(
  categoryId?: string
): Promise<CannedResponse[]> {
  try {
    let query = supabase
      .from('canned_responses')
      .select('*')
      .eq('is_active', true);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('title', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    return [];
  }
}

/**
 * Get ticket SLA tracking
 */
export async function getTicketSLA(ticketId: string): Promise<TicketSLATracking | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_sla_tracking')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching ticket SLA:', error);
    return null;
  }
}

/**
 * Rate ticket satisfaction
 */
export async function rateTicket(
  ticketId: string,
  rating: number,
  comment?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        satisfaction_rating: rating,
        satisfaction_comment: comment || null,
      })
      .eq('id', ticketId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rating ticket:', error);
    return false;
  }
}

/**
 * Get ticket status display
 */
export function getTicketStatusDisplay(status: TicketStatus): {
  label: string;
  color: string;
} {
  const displays: Record<TicketStatus, { label: string; color: string }> = {
    Open: { label: 'Open', color: '#3B82F6' },
    InProgress: { label: 'In Progress', color: '#8B5CF6' },
    Waiting: { label: 'Waiting', color: '#F59E0B' },
    Resolved: { label: 'Resolved', color: '#10B981' },
    Closed: { label: 'Closed', color: '#6B7280' },
    Cancelled: { label: 'Cancelled', color: '#EF4444' },
  };
  return displays[status];
}

/**
 * Get ticket priority display
 */
export function getTicketPriorityDisplay(priority: TicketPriority): {
  label: string;
  color: string;
} {
  const displays: Record<TicketPriority, { label: string; color: string }> = {
    Low: { label: 'Low', color: '#6B7280' },
    Normal: { label: 'Normal', color: '#3B82F6' },
    High: { label: 'High', color: '#F59E0B' },
    Urgent: { label: 'Urgent', color: '#EF4444' },
  };
  return displays[priority];
}

/**
 * Calculate time since creation
 */
export function getTimeSince(date: string): string {
  const now = new Date();
  const created = new Date(date);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(sla: TicketSLATracking | null): boolean {
  if (!sla) return false;
  return sla.first_response_breach || sla.resolution_breach;
}

/**
 * Calculate SLA time remaining
 */
export function getSLATimeRemaining(dueAt: string): {
  hours: number;
  isOverdue: boolean;
} {
  const now = new Date();
  const due = new Date(dueAt);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  return {
    hours: Math.abs(diffHours),
    isOverdue: diffMs < 0,
  };
}

/**
 * Format SLA display
 */
export function formatSLADisplay(sla: TicketSLATracking, ticket: SupportTicket): string {
  if (ticket.status === 'Closed' || ticket.status === 'Cancelled') {
    return 'Completed';
  }

  if (!ticket.first_response_at) {
    const response = getSLATimeRemaining(sla.response_due_at);
    if (response.isOverdue) {
      return `Response overdue by ${response.hours}h`;
    }
    return `Response due in ${response.hours}h`;
  }

  if (!ticket.resolved_at) {
    const resolution = getSLATimeRemaining(sla.resolution_due_at);
    if (resolution.isOverdue) {
      return `Resolution overdue by ${resolution.hours}h`;
    }
    return `Resolution due in ${resolution.hours}h`;
  }

  return 'SLA Met';
}

/**
 * Get ticket statistics
 */
export async function getTicketStatistics(userId: string): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: number;
} | null> {
  try {
    const tickets = await getUserTickets(userId);

    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'Open').length;
    const inProgress = tickets.filter((t) => t.status === 'InProgress').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

    const ticketsWithResponse = tickets.filter((t) => t.first_response_at);
    const avgResponseTime =
      ticketsWithResponse.length > 0
        ? ticketsWithResponse.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime();
            const response = new Date(t.first_response_at!).getTime();
            return sum + (response - created) / 3600000;
          }, 0) / ticketsWithResponse.length
        : 0;

    return {
      total,
      open,
      inProgress,
      resolved,
      avgResponseTime,
    };
  } catch (error) {
    console.error('Error fetching ticket statistics:', error);
    return null;
  }
}

/**
 * Search tickets
 */
export async function searchTickets(
  userId: string,
  query: string
): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .or(`subject.ilike.%${query}%,description.ilike.%${query}%,ticket_number.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching tickets:', error);
    return [];
  }
}

/**
 * Filter tickets by status
 */
export async function filterTicketsByStatus(
  userId: string,
  status: TicketStatus
): Promise<SupportTicket[]> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error filtering tickets:', error);
    return [];
  }
}

/**
 * Get priority options
 */
export function getPriorityOptions(): Array<{
  value: TicketPriority;
  label: string;
}> {
  return [
    { value: 'Low', label: 'Low' },
    { value: 'Normal', label: 'Normal' },
    { value: 'High', label: 'High' },
    { value: 'Urgent', label: 'Urgent' },
  ];
}

/**
 * Validate ticket creation
 */
export function validateTicketCreation(ticket: {
  subject: string;
  description: string;
  category_id: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ticket.subject || ticket.subject.trim().length === 0) {
    errors.push('Subject is required');
  }

  if (ticket.subject && ticket.subject.length < 5) {
    errors.push('Subject must be at least 5 characters');
  }

  if (!ticket.description || ticket.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (ticket.description && ticket.description.length < 20) {
    errors.push('Description must be at least 20 characters');
  }

  if (!ticket.category_id) {
    errors.push('Category is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
