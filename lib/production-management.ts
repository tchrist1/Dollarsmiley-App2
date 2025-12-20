import { supabase } from './supabase';
import {
  notifyCustomServiceOrderReceived,
  notifyProductionStarted,
  notifyProofSubmitted,
  notifyOrderReadyForDelivery,
  notifyShipmentCreated,
  notifyEscrowReleased,
} from './marketplace-notifications';

export interface ProductionOrder {
  id: string;
  title: string;
  description?: string;
  status: string;
  escrow_amount: number;
  final_price?: number;
  consultation_required: boolean;
  consultation_completed_at?: string;
  order_received_at?: string;
  production_started_at?: string;
  proofs_submitted_at?: string;
  proof_approved_at?: string;
  ready_for_delivery_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  escrow_released_at?: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  provider_id: string;
  customer?: {
    full_name: string;
    avatar_url?: string;
  };
  listing?: {
    id: string;
    title: string;
  };
}

export interface ProductionProof {
  id: string;
  production_order_id: string;
  version_number: number;
  proof_images: string[];
  design_files?: string[];
  provider_notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  customer_feedback?: string;
  change_requests?: Array<{ id: number; change: string; completed?: boolean }>;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  production_order_id: string;
  event_type: string;
  description: string;
  actor_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export const PRODUCTION_STATUSES = {
  pending_consultation: {
    label: 'Awaiting Consultation',
    color: '#F59E0B',
    nextStatus: 'pending_order_received',
    canTransition: true,
  },
  pending_order_received: {
    label: 'Pending Confirmation',
    color: '#3B82F6',
    nextStatus: 'in_production',
    canTransition: true,
  },
  order_received: {
    label: 'Order Received',
    color: '#8B5CF6',
    nextStatus: 'in_production',
    canTransition: true,
  },
  in_production: {
    label: 'In Production',
    color: '#8B5CF6',
    nextStatus: 'pending_approval',
    canTransition: true,
  },
  pending_approval: {
    label: 'Awaiting Approval',
    color: '#F59E0B',
    nextStatus: 'ready_for_delivery',
    canTransition: false,
  },
  ready_for_delivery: {
    label: 'Ready for Delivery',
    color: '#10B981',
    nextStatus: 'shipped',
    canTransition: true,
  },
  shipped: {
    label: 'Shipped',
    color: '#10B981',
    nextStatus: 'completed',
    canTransition: false,
  },
  completed: {
    label: 'Completed',
    color: '#059669',
    nextStatus: null,
    canTransition: false,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    nextStatus: null,
    canTransition: false,
  },
} as const;

export class ProductionManagement {
  static async getProviderOrders(
    providerId: string,
    statusFilter?: string
  ): Promise<{ data: ProductionOrder[]; error: string | null }> {
    try {
      let query = supabase
        .from('production_orders')
        .select(`
          *,
          customer:profiles!production_orders_customer_id_fkey(full_name, avatar_url),
          listing:service_listings(id, title)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'active') {
          query = query.not('status', 'in', '("completed","cancelled")');
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  static async getOrderDetails(
    orderId: string
  ): Promise<{ data: ProductionOrder | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          *,
          customer:profiles!production_orders_customer_id_fkey(full_name, avatar_url),
          listing:service_listings(id, title)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    actorId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'order_received') {
        updateData.order_received_at = new Date().toISOString();
      } else if (newStatus === 'in_production') {
        updateData.production_started_at = new Date().toISOString();
      } else if (newStatus === 'ready_for_delivery') {
        updateData.ready_for_delivery_at = new Date().toISOString();
      } else if (newStatus === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.delivered_at = new Date().toISOString();
        updateData.completion_source = 'manual';
      }

      const { error: updateError } = await supabase
        .from('production_orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) throw updateError;

      await this.logTimelineEvent(orderId, 'status_changed', actorId, {
        new_status: newStatus,
        notes,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async receiveOrder(
    orderId: string,
    providerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({
          status: 'order_received',
          order_received_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('provider_id', providerId);

      if (error) throw error;

      await this.logTimelineEvent(orderId, 'order_received', providerId, {
        message: 'Provider confirmed order receipt',
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async startProduction(
    orderId: string,
    providerId: string,
    estimatedCompletionDays?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order } = await supabase
        .from('production_orders')
        .select('title, customer_id, provider:profiles!production_orders_provider_id_fkey(full_name)')
        .eq('id', orderId)
        .single();

      const updateData: Record<string, any> = {
        status: 'in_production',
        production_started_at: new Date().toISOString(),
      };

      if (estimatedCompletionDays) {
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + estimatedCompletionDays);
        updateData.estimated_completion_at = estimatedDate.toISOString();
      }

      const { error } = await supabase
        .from('production_orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('provider_id', providerId);

      if (error) throw error;

      await this.logTimelineEvent(orderId, 'production_started', providerId, {
        estimated_days: estimatedCompletionDays,
      });

      if (order) {
        await notifyProductionStarted(
          order.customer_id,
          orderId,
          order.title || 'Custom Order',
          (order.provider as any)?.full_name || 'Provider',
          estimatedCompletionDays
        );
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async submitProof(
    orderId: string,
    providerId: string,
    proofImages: string[],
    designFiles?: string[],
    notes?: string
  ): Promise<{ success: boolean; proofId?: string; error?: string }> {
    try {
      const { data: order } = await supabase
        .from('production_orders')
        .select('title, customer_id, provider:profiles!production_orders_provider_id_fkey(full_name)')
        .eq('id', orderId)
        .single();

      const { data: existingProofs } = await supabase
        .from('production_proofs')
        .select('version_number')
        .eq('production_order_id', orderId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = existingProofs && existingProofs.length > 0
        ? existingProofs[0].version_number + 1
        : 1;

      const { data: proof, error: proofError } = await supabase
        .from('production_proofs')
        .insert({
          production_order_id: orderId,
          version_number: nextVersion,
          proof_images: proofImages,
          design_files: designFiles || [],
          provider_notes: notes,
          status: 'pending',
        })
        .select()
        .single();

      if (proofError) throw proofError;

      await supabase
        .from('production_orders')
        .update({
          status: 'pending_approval',
          proofs_submitted_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      await this.logTimelineEvent(orderId, 'proof_submitted', providerId, {
        proof_id: proof.id,
        version: nextVersion,
      });

      if (order) {
        await notifyProofSubmitted(
          order.customer_id,
          orderId,
          order.title || 'Custom Order',
          (order.provider as any)?.full_name || 'Provider',
          nextVersion
        );
      }

      return { success: true, proofId: proof.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getProofs(
    orderId: string
  ): Promise<{ data: ProductionProof[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('production_proofs')
        .select('*')
        .eq('production_order_id', orderId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  static async markReadyForDelivery(
    orderId: string,
    providerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order } = await supabase
        .from('production_orders')
        .select('title, customer_id, provider:profiles!production_orders_provider_id_fkey(full_name)')
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('production_orders')
        .update({
          status: 'ready_for_delivery',
          ready_for_delivery_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('provider_id', providerId);

      if (error) throw error;

      await this.logTimelineEvent(orderId, 'ready_for_delivery', providerId, {});

      if (order) {
        await notifyOrderReadyForDelivery(
          order.customer_id,
          orderId,
          order.title || 'Custom Order',
          (order.provider as any)?.full_name || 'Provider'
        );
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async markShipped(
    orderId: string,
    providerId: string,
    trackingNumber?: string,
    carrier?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order } = await supabase
        .from('production_orders')
        .select('title, customer_id')
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('production_orders')
        .update({
          status: 'shipped',
          shipped_at: new Date().toISOString(),
          tracking_number: trackingNumber,
          shipping_carrier: carrier,
        })
        .eq('id', orderId)
        .eq('provider_id', providerId);

      if (error) throw error;

      await this.logTimelineEvent(orderId, 'shipped', providerId, {
        tracking_number: trackingNumber,
        carrier,
      });

      if (order && trackingNumber) {
        await notifyShipmentCreated(
          order.customer_id,
          orderId,
          trackingNumber,
          carrier || 'Unknown Carrier'
        );
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async confirmDelivery(
    orderId: string,
    customerId: string,
    confirmationNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({
          status: 'completed',
          delivered_at: new Date().toISOString(),
          delivery_confirmed_by_customer: true,
        })
        .eq('id', orderId)
        .eq('customer_id', customerId);

      if (error) throw error;

      await this.logTimelineEvent(orderId, 'delivery_confirmed', customerId, {
        notes: confirmationNotes,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getTimelineEvents(
    orderId: string
  ): Promise<{ data: TimelineEvent[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('production_timeline_events')
        .select('*')
        .eq('production_order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  }

  static async logTimelineEvent(
    orderId: string,
    eventType: string,
    actorId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const descriptions: Record<string, string> = {
      order_created: 'Order was created',
      order_received: 'Provider confirmed order receipt',
      production_started: 'Production has started',
      proof_submitted: 'Proof submitted for approval',
      proof_approved: 'Proof was approved by customer',
      proof_rejected: 'Proof was rejected by customer',
      revision_requested: 'Customer requested revisions',
      ready_for_delivery: 'Order is ready for delivery',
      shipped: 'Order has been shipped',
      delivery_confirmed: 'Customer confirmed delivery',
      escrow_released: 'Payment released to provider',
      status_changed: 'Order status was updated',
      price_adjustment_requested: 'Price adjustment requested',
      price_adjustment_approved: 'Price adjustment approved',
      price_adjustment_rejected: 'Price adjustment rejected',
      refund_requested: 'Refund requested',
      refund_approved: 'Refund approved',
      refund_rejected: 'Refund rejected',
    };

    await supabase.from('production_timeline_events').insert({
      production_order_id: orderId,
      event_type: eventType,
      description: descriptions[eventType] || eventType,
      actor_id: actorId,
      metadata,
    });
  }

  static async getProviderStats(providerId: string): Promise<{
    totalOrders: number;
    activeOrders: number;
    pendingProofs: number;
    completedOrders: number;
    totalEarnings: number;
    pendingEarnings: number;
  }> {
    try {
      const { data: orders } = await supabase
        .from('production_orders')
        .select('status, escrow_amount, escrow_released_at')
        .eq('provider_id', providerId);

      if (!orders) {
        return {
          totalOrders: 0,
          activeOrders: 0,
          pendingProofs: 0,
          completedOrders: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
        };
      }

      const totalOrders = orders.length;
      const activeOrders = orders.filter(o =>
        !['completed', 'cancelled'].includes(o.status)
      ).length;
      const pendingProofs = orders.filter(o => o.status === 'pending_approval').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;

      const totalEarnings = orders
        .filter(o => o.escrow_released_at)
        .reduce((sum, o) => sum + (o.escrow_amount || 0) * 0.85, 0);

      const pendingEarnings = orders
        .filter(o => !o.escrow_released_at && o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.escrow_amount || 0) * 0.85, 0);

      return {
        totalOrders,
        activeOrders,
        pendingProofs,
        completedOrders,
        totalEarnings,
        pendingEarnings,
      };
    } catch {
      return {
        totalOrders: 0,
        activeOrders: 0,
        pendingProofs: 0,
        completedOrders: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
      };
    }
  }
}
