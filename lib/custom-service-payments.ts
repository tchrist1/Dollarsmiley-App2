import { supabase } from './supabase';

export interface EscrowPaymentParams {
  productionOrderId: string;
  customerId: string;
  providerId: string;
  amount: number;
  description: string;
  consultationRequested?: boolean;
  metadata?: Record<string, string>;
}

export interface CapturePaymentParams {
  productionOrderId: string;
  paymentIntentId: string;
  finalAmount: number;
}

export interface PriceAdjustmentParams {
  productionOrderId: string;
  adjustedPrice: number;
  justification: string;
}

export interface ConsultationParams {
  productionOrderId: string;
  requestedBy: 'customer' | 'provider_required';
}

export class CustomServicePayments {
  private static STRIPE_API_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';
  private static STRIPE_AUTH_HEADER =
    'Bearer ' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  static async createEscrowPayment(
    params: EscrowPaymentParams
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.STRIPE_API_URL}/create-custom-service-escrow-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({
            productionOrderId: params.productionOrderId,
            customerId: params.customerId,
            providerId: params.providerId,
            amount: Math.round(params.amount * 100),
            description: params.description,
            consultationRequested: params.consultationRequested || false,
            metadata: {
              ...params.metadata,
              production_order_id: params.productionOrderId,
              order_type: 'custom_service',
              payment_model: 'escrow',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create escrow payment');
      }

      const data = await response.json();

      await supabase
        .from('production_orders')
        .update({
          payment_intent_id: data.paymentIntentId,
          escrow_amount: params.amount,
          escrow_captured_at: new Date().toISOString(),
          consultation_requested: params.consultationRequested || false,
          status: 'pending_order_received',
        })
        .eq('id', params.productionOrderId);

      return {
        success: true,
        paymentIntentId: data.paymentIntentId,
        clientSecret: data.clientSecret,
      };
    } catch (error: any) {
      console.error('Error creating escrow payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to create escrow payment',
      };
    }
  }

  static async initializeCustomServiceOrder(
    params: EscrowPaymentParams & { providerRequiresConsultation: boolean }
  ): Promise<{
    success: boolean;
    orderId?: string;
    paymentIntentId?: string;
    clientSecret?: string;
    consultationRequired?: boolean;
    error?: string;
  }> {
    try {
      const consultationRequired =
        params.providerRequiresConsultation || params.consultationRequested;

      const initialStatus = consultationRequired
        ? 'pending_consultation'
        : 'pending_order_received';

      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .update({
          consultation_requested: params.consultationRequested || false,
          consultation_required: consultationRequired,
          status: initialStatus,
          price_adjustment_allowed: true,
          price_adjustment_used: false,
        })
        .eq('id', params.productionOrderId)
        .select()
        .single();

      if (orderError) throw orderError;

      const paymentResult = await this.createEscrowPayment(params);

      if (!paymentResult.success) {
        return paymentResult;
      }

      if (consultationRequired) {
        await this.createConsultation({
          productionOrderId: params.productionOrderId,
          requestedBy: params.providerRequiresConsultation
            ? 'provider_required'
            : 'customer',
        });
      }

      return {
        success: true,
        orderId: params.productionOrderId,
        paymentIntentId: paymentResult.paymentIntentId,
        clientSecret: paymentResult.clientSecret,
        consultationRequired,
      };
    } catch (error: any) {
      console.error('Error initializing custom service order:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize order',
      };
    }
  }

  static async createConsultation(
    params: ConsultationParams
  ): Promise<{ success: boolean; consultationId?: string; error?: string }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('customer_id, provider_id')
        .eq('id', params.productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      const { data: consultation, error: consultError } = await supabase
        .from('custom_service_consultations')
        .insert({
          production_order_id: params.productionOrderId,
          customer_id: order.customer_id,
          provider_id: order.provider_id,
          status: 'pending',
          requested_by: params.requestedBy,
          timeout_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (consultError) throw consultError;

      await supabase
        .from('production_orders')
        .update({
          consultation_timer_started_at: new Date().toISOString(),
          provider_response_deadline: new Date(
            Date.now() + 48 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', params.productionOrderId);

      await supabase.from('consultation_timeouts').insert({
        production_order_id: params.productionOrderId,
        consultation_id: consultation.id,
        timeout_type: 'provider_response',
        deadline_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });

      await supabase.from('production_timeline_events').insert({
        production_order_id: params.productionOrderId,
        event_type: 'consultation_created',
        description:
          params.requestedBy === 'customer'
            ? 'Customer requested consultation'
            : 'Provider requires consultation',
        metadata: { consultation_id: consultation.id },
      });

      return { success: true, consultationId: consultation.id };
    } catch (error: any) {
      console.error('Error creating consultation:', error);
      return {
        success: false,
        error: error.message || 'Failed to create consultation',
      };
    }
  }

  static async completeConsultation(
    consultationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: consultation, error: fetchError } = await supabase
        .from('custom_service_consultations')
        .select('*, production_orders(*)')
        .eq('id', consultationId)
        .single();

      if (fetchError || !consultation) {
        throw new Error('Consultation not found');
      }

      await supabase
        .from('custom_service_consultations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', consultationId);

      await supabase
        .from('production_orders')
        .update({
          consultation_completed_at: new Date().toISOString(),
          status: 'pending_order_received',
        })
        .eq('id', consultation.production_order_id);

      await supabase.from('production_timeline_events').insert({
        production_order_id: consultation.production_order_id,
        event_type: 'consultation_completed',
        description: 'Consultation completed successfully',
        metadata: { consultation_id: consultationId },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error completing consultation:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete consultation',
      };
    }
  }

  static async waiveConsultation(
    productionOrderId: string,
    waivedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: consultation, error: fetchError } = await supabase
        .from('custom_service_consultations')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .eq('status', 'pending')
        .single();

      if (consultation) {
        await supabase
          .from('custom_service_consultations')
          .update({
            status: 'waived',
            waived_at: new Date().toISOString(),
            waived_by: waivedBy,
          })
          .eq('id', consultation.id);
      }

      await supabase
        .from('production_orders')
        .update({
          consultation_waived: true,
          consultation_completed_at: new Date().toISOString(),
          status: 'pending_order_received',
        })
        .eq('id', productionOrderId);

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'consultation_waived',
        description: 'Consultation requirement waived',
        metadata: { waived_by: waivedBy },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error waiving consultation:', error);
      return {
        success: false,
        error: error.message || 'Failed to waive consultation',
      };
    }
  }

  static async requestPriceAdjustment(
    params: PriceAdjustmentParams
  ): Promise<{ success: boolean; adjustmentId?: string; error?: string }> {
    try {
      const { data: canAdjust } = await supabase.rpc(
        'can_request_price_adjustment',
        { p_order_id: params.productionOrderId }
      );

      if (!canAdjust?.allowed) {
        return {
          success: false,
          error: canAdjust?.reason || 'Price adjustment not allowed',
        };
      }

      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*, profiles!production_orders_provider_id_fkey(id)')
        .eq('id', params.productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      const originalPrice = order.escrow_amount || order.final_price || 0;
      const adjustmentAmount = params.adjustedPrice - originalPrice;
      const adjustmentType = adjustmentAmount > 0 ? 'increase' : 'decrease';

      const { data: adjustment, error: insertError } = await supabase
        .from('price_adjustments')
        .insert({
          production_order_id: params.productionOrderId,
          provider_id: order.provider_id,
          customer_id: order.customer_id,
          original_price: originalPrice,
          adjusted_price: params.adjustedPrice,
          adjustment_amount: Math.abs(adjustmentAmount),
          adjustment_type: adjustmentType,
          justification: params.justification,
          status: 'pending',
          customer_notified_at: new Date().toISOString(),
          response_deadline: new Date(
            Date.now() + 72 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('production_orders')
        .update({
          customer_response_deadline: new Date(
            Date.now() + 72 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', params.productionOrderId);

      await supabase.from('consultation_timeouts').insert({
        production_order_id: params.productionOrderId,
        timeout_type: 'price_adjustment_response',
        deadline_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      });

      await supabase.from('production_timeline_events').insert({
        production_order_id: params.productionOrderId,
        event_type: 'price_adjustment_requested',
        description: `Provider requested price ${adjustmentType}: $${originalPrice.toFixed(2)} → $${params.adjustedPrice.toFixed(2)}`,
        metadata: {
          adjustment_id: adjustment.id,
          original_price: originalPrice,
          adjusted_price: params.adjustedPrice,
          adjustment_amount: Math.abs(adjustmentAmount),
          justification: params.justification,
        },
      });

      return { success: true, adjustmentId: adjustment.id };
    } catch (error: any) {
      console.error('Error requesting price adjustment:', error);
      return {
        success: false,
        error: error.message || 'Failed to request price adjustment',
      };
    }
  }

  static async approvePriceAdjustment(
    adjustmentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: adjustment, error: fetchError } = await supabase
        .from('price_adjustments')
        .select('*')
        .eq('id', adjustmentId)
        .single();

      if (fetchError || !adjustment) {
        throw new Error('Price adjustment not found');
      }

      if (adjustment.status !== 'pending') {
        return {
          success: false,
          error: 'This price adjustment has already been processed',
        };
      }

      if (adjustment.adjustment_type === 'increase') {
        const response = await fetch(
          `${this.STRIPE_API_URL}/capture-price-difference`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: this.STRIPE_AUTH_HEADER,
            },
            body: JSON.stringify({
              productionOrderId: adjustment.production_order_id,
              customerId: adjustment.customer_id,
              amount: Math.round(adjustment.adjustment_amount * 100),
              description: `Price adjustment for order`,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to capture price difference');
        }

        const data = await response.json();

        await supabase
          .from('price_adjustments')
          .update({
            payment_intent_id: data.paymentIntentId,
            difference_captured: true,
          })
          .eq('id', adjustmentId);
      }

      await supabase
        .from('price_adjustments')
        .update({
          status: 'approved',
          customer_responded_at: new Date().toISOString(),
        })
        .eq('id', adjustmentId);

      await supabase
        .from('production_orders')
        .update({
          escrow_amount: adjustment.adjusted_price,
          final_price: adjustment.adjusted_price,
          price_adjustment_used: true,
        })
        .eq('id', adjustment.production_order_id);

      await supabase.from('production_timeline_events').insert({
        production_order_id: adjustment.production_order_id,
        event_type: 'price_adjustment_approved',
        description: `Customer approved price adjustment to $${adjustment.adjusted_price.toFixed(2)}`,
        metadata: {
          adjustment_id: adjustmentId,
          final_price: adjustment.adjusted_price,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error approving price adjustment:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve price adjustment',
      };
    }
  }

  static async rejectPriceAdjustment(
    adjustmentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: adjustment, error: fetchError } = await supabase
        .from('price_adjustments')
        .select('*')
        .eq('id', adjustmentId)
        .single();

      if (fetchError || !adjustment) {
        throw new Error('Price adjustment not found');
      }

      await supabase
        .from('price_adjustments')
        .update({
          status: 'rejected',
          customer_responded_at: new Date().toISOString(),
        })
        .eq('id', adjustmentId);

      await supabase.from('production_timeline_events').insert({
        production_order_id: adjustment.production_order_id,
        event_type: 'price_adjustment_rejected',
        description: `Customer rejected price adjustment. Provider can proceed at original price or cancel.`,
        metadata: {
          adjustment_id: adjustmentId,
          original_price: adjustment.original_price,
          rejected_price: adjustment.adjusted_price,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error rejecting price adjustment:', error);
      return {
        success: false,
        error: error.message || 'Failed to reject price adjustment',
      };
    }
  }

  static async canMarkOrderReceived(
    productionOrderId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const { data } = await supabase.rpc('can_mark_order_received', {
        p_order_id: productionOrderId,
      });

      return {
        allowed: data?.allowed || false,
        reason: data?.reason || undefined,
      };
    } catch (error: any) {
      console.error('Error checking if order can be received:', error);
      return {
        allowed: false,
        reason: 'Failed to check order status',
      };
    }
  }

  static async markOrderReceived(
    productionOrderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const canProceed = await this.canMarkOrderReceived(productionOrderId);
      if (!canProceed.allowed) {
        return {
          success: false,
          error: canProceed.reason || 'Cannot mark order as received',
        };
      }

      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Production order not found');
      }

      await supabase
        .from('production_orders')
        .update({
          status: 'order_received',
          order_received_at: new Date().toISOString(),
          price_adjustment_allowed: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId);

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'order_received',
        description: 'Order received - Production can begin',
        metadata: { escrow_amount: order.escrow_amount },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error marking order received:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark order as received',
      };
    }
  }

  static async releaseEscrowFunds(
    productionOrderId: string
  ): Promise<{
    success: boolean;
    providerAmount?: number;
    platformFee?: number;
    error?: string;
  }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      if (order.escrow_released_at) {
        return {
          success: false,
          error: 'Escrow funds have already been released',
        };
      }

      const escrowAmount = order.escrow_amount || order.final_price || 0;
      const platformFee = escrowAmount * 0.15;
      const providerAmount = escrowAmount - platformFee;

      const response = await fetch(
        `${this.STRIPE_API_URL}/release-custom-service-escrow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({
            productionOrderId,
            providerId: order.provider_id,
            providerAmount: Math.round(providerAmount * 100),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to release escrow');
      }

      await supabase
        .from('production_orders')
        .update({
          escrow_released_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId);

      await supabase.from('wallet_transactions').insert({
        user_id: order.provider_id,
        type: 'credit',
        amount: providerAmount,
        status: 'completed',
        description: 'Custom service payment released from escrow',
        reference_type: 'production_order',
        reference_id: productionOrderId,
      });

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'escrow_released',
        description: `Escrow released - Provider receives $${providerAmount.toFixed(2)}`,
        metadata: {
          escrow_amount: escrowAmount,
          platform_fee: platformFee,
          provider_amount: providerAmount,
        },
      });

      return {
        success: true,
        providerAmount,
        platformFee,
      };
    } catch (error: any) {
      console.error('Error releasing escrow:', error);
      return {
        success: false,
        error: error.message || 'Failed to release escrow',
      };
    }
  }

  static async refundEscrow(
    productionOrderId: string,
    reason: string,
    refundAmount?: number
  ): Promise<{ success: boolean; refundedAmount?: number; error?: string }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      if (order.escrow_released_at) {
        return {
          success: false,
          error: 'Cannot refund - escrow has already been released to provider',
        };
      }

      const amountToRefund =
        refundAmount !== undefined
          ? refundAmount
          : order.escrow_amount || order.final_price || 0;

      const response = await fetch(
        `${this.STRIPE_API_URL}/refund-custom-service-escrow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({
            productionOrderId,
            paymentIntentId: order.payment_intent_id,
            amount: Math.round(amountToRefund * 100),
            reason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process refund');
      }

      await supabase
        .from('production_orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId);

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'escrow_refunded',
        description: `Refunded $${amountToRefund.toFixed(2)} from escrow`,
        metadata: { refund_amount: amountToRefund, reason },
      });

      return { success: true, refundedAmount: amountToRefund };
    } catch (error: any) {
      console.error('Error refunding escrow:', error);
      return {
        success: false,
        error: error.message || 'Failed to refund escrow',
      };
    }
  }

  static async handleConsultationTimeout(
    productionOrderId: string,
    timeoutType: 'provider_response' | 'customer_response'
  ): Promise<{ success: boolean; action?: string; error?: string }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      let action = '';

      if (timeoutType === 'provider_response') {
        action =
          'Provider did not respond within 48 hours. Customer may proceed at original price or cancel for full refund.';
      } else {
        action =
          'Customer did not respond within 72 hours. Provider may proceed at original price or cancel.';
      }

      await supabase
        .from('consultation_timeouts')
        .update({
          expired_at: new Date().toISOString(),
          action_taken: action,
        })
        .eq('production_order_id', productionOrderId)
        .eq('timeout_type', timeoutType)
        .is('expired_at', null);

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'consultation_timeout',
        description: action,
        metadata: { timeout_type: timeoutType },
      });

      return { success: true, action };
    } catch (error: any) {
      console.error('Error handling consultation timeout:', error);
      return {
        success: false,
        error: error.message || 'Failed to handle timeout',
      };
    }
  }

  static async getCustomerTimeoutOptions(
    productionOrderId: string,
    customerId: string
  ): Promise<{
    hasTimedOutConsultation?: boolean;
    customerCanDecide?: boolean;
    canProceed?: boolean;
    canCancel?: boolean;
    originalPrice?: number;
    refundAmount?: number;
    timeoutAt?: string;
    currentStatus?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_customer_timeout_options', {
        p_production_order_id: productionOrderId,
        p_customer_id: customerId,
      });

      if (error) throw error;

      return {
        hasTimedOutConsultation: data?.has_timed_out_consultation,
        customerCanDecide: data?.customer_can_decide,
        canProceed: data?.can_proceed,
        canCancel: data?.can_cancel,
        originalPrice: data?.original_price,
        refundAmount: data?.refund_amount,
        timeoutAt: data?.timeout_at,
        currentStatus: data?.current_status,
      };
    } catch (error: any) {
      console.error('Error getting customer timeout options:', error);
      return {
        error: error.message || 'Failed to get timeout options',
      };
    }
  }

  static async customerProceedAfterTimeout(
    productionOrderId: string,
    customerId: string
  ): Promise<{ success: boolean; status?: string; message?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('customer_proceed_after_timeout', {
        p_production_order_id: productionOrderId,
        p_customer_id: customerId,
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Failed to proceed with order',
        };
      }

      return {
        success: true,
        status: data?.status,
        message: data?.message,
      };
    } catch (error: any) {
      console.error('Error proceeding after timeout:', error);
      return {
        success: false,
        error: error.message || 'Failed to proceed with order',
      };
    }
  }

  static async customerCancelAfterTimeout(
    productionOrderId: string,
    customerId: string
  ): Promise<{
    success: boolean;
    status?: string;
    refundAmount?: number;
    paymentIntentId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('customer_cancel_after_timeout', {
        p_production_order_id: productionOrderId,
        p_customer_id: customerId,
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Failed to cancel order',
        };
      }

      if (data.payment_intent_id) {
        const refundResult = await this.refundEscrow(
          productionOrderId,
          'Customer cancelled after provider consultation timeout',
          data.refund_amount
        );

        if (!refundResult.success) {
          return {
            success: false,
            error: refundResult.error || 'Failed to process refund',
          };
        }
      }

      return {
        success: true,
        status: data?.status,
        refundAmount: data?.refund_amount,
        paymentIntentId: data?.payment_intent_id,
        message: data?.message || 'Order cancelled and refund processed',
      };
    } catch (error: any) {
      console.error('Error cancelling after timeout:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel order',
      };
    }
  }

  static async getOrderStatus(productionOrderId: string): Promise<{
    order?: any;
    consultation?: any;
    pendingAdjustment?: any;
    timeouts?: any[];
    customerCanDecide?: boolean;
    error?: string;
  }> {
    try {
      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (orderError) throw orderError;

      const { data: consultation } = await supabase
        .from('custom_service_consultations')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: pendingAdjustment } = await supabase
        .from('price_adjustments')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .eq('status', 'pending')
        .maybeSingle();

      const { data: timeouts } = await supabase
        .from('consultation_timeouts')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .order('created_at', { ascending: false });

      const customerCanDecide =
        consultation?.status === 'timed_out' && consultation?.customer_can_decide === true;

      return {
        order,
        consultation,
        pendingAdjustment,
        timeouts: timeouts || [],
        customerCanDecide,
      };
    } catch (error: any) {
      console.error('Error getting order status:', error);
      return {
        error: error.message || 'Failed to get order status',
      };
    }
  }

  static async createAuthorizationHold(
    params: EscrowPaymentParams
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    clientSecret?: string;
    error?: string;
  }> {
    return this.createEscrowPayment(params);
  }

  static async capturePayment(
    params: CapturePaymentParams
  ): Promise<{ success: boolean; error?: string }> {
    console.warn(
      'capturePayment is deprecated for Custom Services. Use escrow model instead.'
    );
    return { success: true };
  }

  static async proposePrice(
    productionOrderId: string,
    proposedPrice: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.requestPriceAdjustment({
      productionOrderId,
      adjustedPrice: proposedPrice,
      justification: reason,
    });
  }

  static async approvePrice(
    productionOrderId: string
  ): Promise<{
    success: boolean;
    needsReauthorization?: boolean;
    error?: string;
  }> {
    try {
      const { data: pendingAdjustment } = await supabase
        .from('price_adjustments')
        .select('*')
        .eq('production_order_id', productionOrderId)
        .eq('status', 'pending')
        .maybeSingle();

      if (pendingAdjustment) {
        return this.approvePriceAdjustment(pendingAdjustment.id);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to approve price',
      };
    }
  }

  static async cancelAuthorization(
    productionOrderId: string,
    paymentIntentId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.refundEscrow(productionOrderId, reason);
  }

  static async refundOrder(
    productionOrderId: string,
    reason: string,
    refundAmount?: number
  ): Promise<{ success: boolean; refundedAmount?: number; error?: string }> {
    return this.refundEscrow(productionOrderId, reason, refundAmount);
  }

  static async checkAuthorizationStatus(paymentIntentId: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    status?: string;
    error?: string;
  }> {
    return {
      isValid: true,
      status: 'captured_in_escrow',
    };
  }
}

export default CustomServicePayments;
