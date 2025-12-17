import { supabase } from './supabase';
import { getUserSubscription } from './stripe-subscription-config';

export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type SupportCategory =
  | 'technical'
  | 'billing'
  | 'account'
  | 'booking'
  | 'payments'
  | 'verification'
  | 'feature_request'
  | 'other';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  is_priority: boolean;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  attachments?: string[];
  tags?: string[];
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'support';
  message: string;
  attachments?: string[];
  is_internal: boolean;
  created_at: string;
}

export interface SupportMetrics {
  averageResponseTime: number; // minutes
  averageResolutionTime: number; // hours
  satisfactionRating: number;
  openTickets: number;
  resolvedTickets: number;
}

export interface PrioritySupportAccess {
  hasAccess: boolean;
  plan: string;
  features: {
    priorityQueue: boolean;
    liveChat: boolean;
    phoneSupport: boolean;
    dedicatedAgent: boolean;
    slaGuarantee: boolean;
    maxResponseTime: number; // hours
  };
}

export async function checkPrioritySupportAccess(
  userId: string
): Promise<PrioritySupportAccess> {
  try {
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return {
        hasAccess: false,
        plan: 'Free',
        features: {
          priorityQueue: false,
          liveChat: false,
          phoneSupport: false,
          dedicatedAgent: false,
          slaGuarantee: false,
          maxResponseTime: 48,
        },
      };
    }

    const planName = subscription.plan?.name || 'Free';

    // Define access levels by plan
    switch (planName) {
      case 'Enterprise':
        return {
          hasAccess: true,
          plan: 'Enterprise',
          features: {
            priorityQueue: true,
            liveChat: true,
            phoneSupport: true,
            dedicatedAgent: true,
            slaGuarantee: true,
            maxResponseTime: 1, // 1 hour
          },
        };

      case 'Pro':
        return {
          hasAccess: true,
          plan: 'Pro',
          features: {
            priorityQueue: true,
            liveChat: true,
            phoneSupport: false,
            dedicatedAgent: false,
            slaGuarantee: true,
            maxResponseTime: 4, // 4 hours
          },
        };

      case 'Basic':
        return {
          hasAccess: false,
          plan: 'Basic',
          features: {
            priorityQueue: false,
            liveChat: false,
            phoneSupport: false,
            dedicatedAgent: false,
            slaGuarantee: false,
            maxResponseTime: 24,
          },
        };

      default:
        return {
          hasAccess: false,
          plan: 'Free',
          features: {
            priorityQueue: false,
            liveChat: false,
            phoneSupport: false,
            dedicatedAgent: false,
            slaGuarantee: false,
            maxResponseTime: 48,
          },
        };
    }
  } catch (error) {
    console.error('Error checking priority support access:', error);
    throw error;
  }
}

export async function createSupportTicket(
  userId: string,
  data: {
    subject: string;
    description: string;
    category: SupportCategory;
    attachments?: string[];
    priority?: SupportPriority;
  }
): Promise<SupportTicket> {
  try {
    // Check if user has priority support
    const access = await checkPrioritySupportAccess(userId);

    // Determine priority
    let priority: SupportPriority = data.priority || 'normal';
    let isPriority = access.hasAccess;

    // Auto-escalate for Enterprise users
    if (access.plan === 'Enterprise' && priority === 'normal') {
      priority = 'high';
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority,
        status: 'open',
        is_priority: isPriority,
        attachments: data.attachments || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial message
    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_id: userId,
      sender_type: 'user',
      message: data.description,
      attachments: data.attachments || [],
      is_internal: false,
    });

    // Send notification to support team
    await notifySupportTeam(ticket.id, access.hasAccess);

    // Track analytics
    await supabase.rpc('track_usage', {
      p_user_id: userId,
      p_metric: 'support_tickets',
      p_amount: 1,
    });

    return ticket;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

export async function getUserTickets(
  userId: string,
  filters?: {
    status?: SupportStatus;
    category?: SupportCategory;
    priority?: SupportPriority;
  }
): Promise<SupportTicket[]> {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting user tickets:', error);
    return [];
  }
}

export async function getTicketDetails(ticketId: string): Promise<{
  ticket: SupportTicket;
  messages: SupportMessage[];
} | null> {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;

    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      ticket,
      messages: messages || [],
    };
  } catch (error) {
    console.error('Error getting ticket details:', error);
    return null;
  }
}

export async function addTicketMessage(
  ticketId: string,
  userId: string,
  message: string,
  attachments?: string[]
): Promise<SupportMessage | null> {
  try {
    // Verify ticket belongs to user
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id, status')
      .eq('id', ticketId)
      .single();

    if (!ticket || ticket.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Don't allow messages on closed tickets
    if (ticket.status === 'closed') {
      throw new Error('Cannot add message to closed ticket');
    }

    const { data: newMessage, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: userId,
        sender_type: 'user',
        message,
        attachments: attachments || [],
        is_internal: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update ticket status if waiting for customer
    if (ticket.status === 'waiting_customer') {
      await supabase
        .from('support_tickets')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);
    }

    // Notify support team
    await notifySupportTeam(ticketId, false);

    return newMessage;
  } catch (error) {
    console.error('Error adding ticket message:', error);
    return null;
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: SupportStatus
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
      })
      .eq('id', ticketId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return false;
  }
}

export async function closeTicket(
  ticketId: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify ticket belongs to user
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id')
      .eq('id', ticketId)
      .single();

    if (!ticket || ticket.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error closing ticket:', error);
    return false;
  }
}

export async function reopenTicket(
  ticketId: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify ticket belongs to user
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id, status')
      .eq('id', ticketId)
      .single();

    if (!ticket || ticket.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
      throw new Error('Can only reopen closed or resolved tickets');
    }

    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'open',
        resolved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;

    // Notify support team
    await notifySupportTeam(ticketId, false);

    return true;
  } catch (error) {
    console.error('Error reopening ticket:', error);
    return false;
  }
}

export async function rateTicket(
  ticketId: string,
  userId: string,
  rating: number,
  feedback?: string
): Promise<boolean> {
  try {
    // Verify ticket belongs to user
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id, status')
      .eq('id', ticketId)
      .single();

    if (!ticket || ticket.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new Error('Can only rate resolved or closed tickets');
    }

    const { error } = await supabase.from('support_ratings').insert({
      ticket_id: ticketId,
      user_id: userId,
      rating,
      feedback,
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error rating ticket:', error);
    return false;
  }
}

export async function getSupportMetrics(userId: string): Promise<SupportMetrics> {
  try {
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('*, ratings:support_ratings(rating)')
      .eq('user_id', userId);

    if (!tickets || tickets.length === 0) {
      return {
        averageResponseTime: 0,
        averageResolutionTime: 0,
        satisfactionRating: 0,
        openTickets: 0,
        resolvedTickets: 0,
      };
    }

    // Calculate average response time
    const ticketsWithResponse = tickets.filter(t => t.first_response_at);
    const totalResponseTime = ticketsWithResponse.reduce((sum, t) => {
      const created = new Date(t.created_at).getTime();
      const responded = new Date(t.first_response_at).getTime();
      return sum + (responded - created) / (1000 * 60); // minutes
    }, 0);
    const averageResponseTime = ticketsWithResponse.length > 0
      ? totalResponseTime / ticketsWithResponse.length
      : 0;

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(t => t.resolved_at);
    const totalResolutionTime = resolvedTickets.reduce((sum, t) => {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at).getTime();
      return sum + (resolved - created) / (1000 * 60 * 60); // hours
    }, 0);
    const averageResolutionTime = resolvedTickets.length > 0
      ? totalResolutionTime / resolvedTickets.length
      : 0;

    // Calculate satisfaction rating
    const ratings = tickets.flatMap(t => t.ratings?.map((r: any) => r.rating) || []);
    const satisfactionRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    const openTickets = tickets.filter(t =>
      t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_customer'
    ).length;

    return {
      averageResponseTime,
      averageResolutionTime,
      satisfactionRating,
      openTickets,
      resolvedTickets: resolvedTickets.length,
    };
  } catch (error) {
    console.error('Error getting support metrics:', error);
    throw error;
  }
}

async function notifySupportTeam(ticketId: string, isPriority: boolean): Promise<void> {
  try {
    // In a real implementation, this would send notifications via:
    // - Email to support team
    // - Slack/Teams integration
    // - Push notifications to support app
    // - SMS for urgent priority tickets

    console.log(`Support notification sent for ticket ${ticketId} (priority: ${isPriority})`);
  } catch (error) {
    console.error('Error notifying support team:', error);
  }
}

export function getPriorityLabel(priority: SupportPriority): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent';
    case 'high':
      return 'High';
    case 'normal':
      return 'Normal';
    case 'low':
      return 'Low';
  }
}

export function getPriorityColor(priority: SupportPriority): string {
  switch (priority) {
    case 'urgent':
      return '#EF4444'; // Red
    case 'high':
      return '#F59E0B'; // Orange
    case 'normal':
      return '#3B82F6'; // Blue
    case 'low':
      return '#6B7280'; // Gray
  }
}

export function getStatusLabel(status: SupportStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'waiting_customer':
      return 'Waiting for You';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
  }
}

export function getStatusColor(status: SupportStatus): string {
  switch (status) {
    case 'open':
      return '#3B82F6'; // Blue
    case 'in_progress':
      return '#F59E0B'; // Orange
    case 'waiting_customer':
      return '#8B5CF6'; // Purple
    case 'resolved':
      return '#10B981'; // Green
    case 'closed':
      return '#6B7280'; // Gray
  }
}

export function getCategoryLabel(category: SupportCategory): string {
  switch (category) {
    case 'technical':
      return 'Technical Issue';
    case 'billing':
      return 'Billing & Payments';
    case 'account':
      return 'Account Management';
    case 'booking':
      return 'Booking Issue';
    case 'payments':
      return 'Payment Issue';
    case 'verification':
      return 'Verification';
    case 'feature_request':
      return 'Feature Request';
    case 'other':
      return 'Other';
  }
}

export function formatResponseTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  } else if (minutes < 1440) {
    return `${(minutes / 60).toFixed(1)} hours`;
  } else {
    return `${Math.round(minutes / 1440)} days`;
  }
}
