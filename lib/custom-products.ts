import { supabase } from './supabase';

interface ProductionOrderCreate {
  bookingId?: string;
  customerId: string;
  providerId: string;
  productType: string;
  requirements: Record<string, any>;
  materials?: Record<string, any>;
  estimatedCompletionDate?: string;
}

interface ProofCreate {
  productionOrderId: string;
  versionNumber: number;
  proofImages: string[];
  designFiles?: string[];
  providerNotes?: string;
}

interface ProofUpdate {
  customerFeedback?: string;
  changeRequests?: any[];
  status?: 'approved' | 'rejected' | 'revision_requested';
}

export class CustomProductsService {
  static async createProductionOrder(order: ProductionOrderCreate) {
    const { data, error } = await supabase
      .from('production_orders')
      .insert({
        booking_id: order.bookingId,
        customer_id: order.customerId,
        provider_id: order.providerId,
        product_type: order.productType,
        requirements: order.requirements,
        materials: order.materials || {},
        estimated_completion_date: order.estimatedCompletionDate,
        status: 'consultation',
      })
      .select()
      .single();

    if (error) throw error;

    await this.createTimelineEvent(
      data.id,
      'order_created',
      'Production order created',
      { product_type: order.productType }
    );

    return data;
  }

  static async getProductionOrder(orderId: string) {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getProductionOrderDetails(orderId: string) {
    const { data, error } = await supabase.rpc('get_production_order_details', {
      order_id: orderId,
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  static async getUserProductionOrders(userId: string, role: 'customer' | 'provider') {
    const column = role === 'customer' ? 'customer_id' : 'provider_id';

    const { data, error } = await supabase
      .from('production_orders')
      .select('*')
      .eq(column, userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateProductionOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ) {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (notes) updateData.production_notes = notes;

    const { data, error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateProductionOrder(orderId: string, updates: Partial<ProductionOrderCreate>) {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.requirements) updateData.requirements = updates.requirements;
    if (updates.materials) updateData.materials = updates.materials;
    if (updates.estimatedCompletionDate) {
      updateData.estimated_completion_date = updates.estimatedCompletionDate;
    }

    const { data, error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async completeProductionOrder(orderId: string, notes?: string) {
    const updateData: any = {
      status: 'completed',
      actual_completion_date: new Date().toISOString(),
      completion_source: 'manual',
      updated_at: new Date().toISOString(),
    };

    if (notes) updateData.production_notes = notes;

    const { data, error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    await this.createTimelineEvent(orderId, 'order_completed', 'Production order completed');

    return data;
  }

  static async submitProof(proof: ProofCreate) {
    const { data, error } = await supabase
      .from('proofs')
      .insert({
        production_order_id: proof.productionOrderId,
        version_number: proof.versionNumber,
        proof_images: proof.proofImages,
        design_files: proof.designFiles || [],
        provider_notes: proof.providerNotes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    await this.updateProductionOrderStatus(proof.productionOrderId, 'proofing');

    await this.createTimelineEvent(
      proof.productionOrderId,
      'proof_submitted',
      `Proof version ${proof.versionNumber} submitted`,
      { version: proof.versionNumber, proof_id: data.id }
    );

    return data;
  }

  static async getProofs(productionOrderId: string) {
    const { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('production_order_id', productionOrderId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getLatestProof(productionOrderId: string) {
    const { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('production_order_id', productionOrderId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateProof(proofId: string, updates: ProofUpdate) {
    const updateData: any = {};

    if (updates.customerFeedback) updateData.customer_feedback = updates.customerFeedback;
    if (updates.changeRequests) updateData.change_requests = updates.changeRequests;
    if (updates.status) {
      updateData.status = updates.status;
      if (updates.status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('proofs')
      .update(updateData)
      .eq('id', proofId)
      .select()
      .single();

    if (error) throw error;

    if (updates.status) {
      const eventType =
        updates.status === 'approved'
          ? 'proof_approved'
          : updates.status === 'rejected'
          ? 'proof_rejected'
          : 'proof_revision_requested';

      await this.createTimelineEvent(
        data.production_order_id,
        eventType,
        `Proof ${updates.status}`,
        { proof_id: proofId, version: data.version_number }
      );

      if (updates.status === 'approved') {
        await this.updateProductionOrderStatus(data.production_order_id, 'approved');
      }
    }

    return data;
  }

  static async approveProof(proofId: string, feedback?: string) {
    return await this.updateProof(proofId, {
      status: 'approved',
      customerFeedback: feedback,
    });
  }

  static async requestProofRevision(proofId: string, changeRequests: any[], feedback: string) {
    return await this.updateProof(proofId, {
      status: 'revision_requested',
      changeRequests,
      customerFeedback: feedback,
    });
  }

  static async rejectProof(proofId: string, feedback: string) {
    return await this.updateProof(proofId, {
      status: 'rejected',
      customerFeedback: feedback,
    });
  }

  static async getProductionTimeline(productionOrderId: string) {
    const { data, error } = await supabase
      .from('production_timeline_events')
      .select('*')
      .eq('production_order_id', productionOrderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createTimelineEvent(
    productionOrderId: string,
    eventType: string,
    description?: string,
    metadata?: Record<string, any>
  ) {
    const { data, error } = await supabase.rpc('create_production_timeline_event', {
      order_id: productionOrderId,
      event_type_param: eventType,
      description_param: description || null,
      metadata_param: metadata || {},
    });

    if (error) console.error('Failed to create timeline event:', error);
    return data;
  }

  static async startProduction(productionOrderId: string) {
    const data = await this.updateProductionOrderStatus(productionOrderId, 'in_production');

    await this.createTimelineEvent(
      productionOrderId,
      'production_started',
      'Production has started'
    );

    return data;
  }

  static async moveToQualityCheck(productionOrderId: string) {
    const data = await this.updateProductionOrderStatus(productionOrderId, 'quality_check');

    await this.createTimelineEvent(
      productionOrderId,
      'quality_check_started',
      'Product moved to quality check'
    );

    return data;
  }

  static async cancelProductionOrder(productionOrderId: string, reason: string) {
    const data = await this.updateProductionOrderStatus(productionOrderId, 'cancelled', reason);

    await this.createTimelineEvent(
      productionOrderId,
      'order_cancelled',
      'Production order cancelled',
      { reason }
    );

    return data;
  }

  static async getProductionStats(userId: string, role: 'customer' | 'provider') {
    const orders = await this.getUserProductionOrders(userId, role);

    const stats = {
      total: orders.length,
      consultation: orders.filter((o) => o.status === 'consultation').length,
      proofing: orders.filter((o) => o.status === 'proofing').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      in_production: orders.filter((o) => o.status === 'in_production').length,
      quality_check: orders.filter((o) => o.status === 'quality_check').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    return stats;
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      consultation: 'Initial Consultation',
      proofing: 'Awaiting Proof Approval',
      approved: 'Approved - Ready for Production',
      in_production: 'In Production',
      quality_check: 'Quality Check',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      consultation: '#3B82F6',
      proofing: '#F59E0B',
      approved: '#10B981',
      in_production: '#8B5CF6',
      quality_check: '#06B6D4',
      completed: '#059669',
      cancelled: '#DC2626',
    };

    return colors[status] || '#6B7280';
  }
}

export default CustomProductsService;
