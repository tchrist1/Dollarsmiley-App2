import { supabase } from './supabase';

export interface AuthorizationHoldParams {
  productionOrderId: string;
  customerId: string;
  providerId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
}

export interface CapturePaymentParams {
  productionOrderId: string;
  paymentIntentId: string;
  finalAmount: number;
}

export interface PriceChangeParams {
  productionOrderId: string;
  paymentIntentId: string;
  currentAmount: number;
  newAmount: number;
  reason: string;
}

export class CustomServicePayments {
  private static STRIPE_API_URL =
    process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';
  private static STRIPE_AUTH_HEADER =
    'Bearer ' + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  static async createAuthorizationHold(
    params: AuthorizationHoldParams
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    clientSecret?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.STRIPE_API_URL}/create-custom-service-authorization`,
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
            metadata: {
              ...params.metadata,
              production_order_id: params.productionOrderId,
              order_type: 'custom_service',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create authorization hold');
      }

      const data = await response.json();

      const authExpiresAt = new Date();
      authExpiresAt.setDate(authExpiresAt.getDate() + 7);

      await supabase
        .from('production_orders')
        .update({
          payment_intent_id: data.paymentIntentId,
          authorization_amount: params.amount,
          authorization_expires_at: authExpiresAt.toISOString(),
          status: 'procurement_started',
        })
        .eq('id', params.productionOrderId);

      return {
        success: true,
        paymentIntentId: data.paymentIntentId,
        clientSecret: data.clientSecret,
      };
    } catch (error: any) {
      console.error('Error creating authorization hold:', error);
      return {
        success: false,
        error: error.message || 'Failed to create authorization hold',
      };
    }
  }

  static async capturePayment(
    params: CapturePaymentParams
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.STRIPE_API_URL}/capture-custom-service-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({
            productionOrderId: params.productionOrderId,
            paymentIntentId: params.paymentIntentId,
            amountToCapture: Math.round(params.finalAmount * 100),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to capture payment');
      }

      await supabase
        .from('production_orders')
        .update({
          final_price: params.finalAmount,
          payment_captured_at: new Date().toISOString(),
          status: 'order_received',
        })
        .eq('id', params.productionOrderId);

      return { success: true };
    } catch (error: any) {
      console.error('Error capturing payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to capture payment',
      };
    }
  }

  static async proposePrice(
    productionOrderId: string,
    proposedPrice: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('production_orders')
        .update({
          proposed_price: proposedPrice,
          price_change_reason: reason,
          status: 'price_proposed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId);

      if (error) throw error;

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'price_proposed',
        description: `Provider proposed price: $${proposedPrice.toFixed(2)}`,
        metadata: { proposed_price: proposedPrice, reason },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error proposing price:', error);
      return {
        success: false,
        error: error.message || 'Failed to propose price',
      };
    }
  }

  static async approvePrice(
    productionOrderId: string
  ): Promise<{ success: boolean; needsReauthorization?: boolean; error?: string }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Production order not found');
      }

      const needsReauth =
        order.authorization_expires_at &&
        new Date(order.authorization_expires_at) < new Date();

      if (needsReauth) {
        return {
          success: false,
          needsReauthorization: true,
          error: 'Authorization expired. Please reauthorize payment.',
        };
      }

      const priceIncrease =
        order.proposed_price &&
        order.authorization_amount &&
        order.proposed_price > order.authorization_amount;

      if (priceIncrease) {
        const incrementResult = await this.incrementAuthorization({
          productionOrderId,
          paymentIntentId: order.payment_intent_id,
          currentAmount: order.authorization_amount,
          newAmount: order.proposed_price,
          reason: order.price_change_reason || 'Customer approved price increase',
        });

        if (!incrementResult.success) {
          return {
            success: false,
            needsReauthorization: true,
            error: 'Failed to increase authorization. Please reauthorize payment.',
          };
        }
      }

      const { error } = await supabase
        .from('production_orders')
        .update({
          final_price: order.proposed_price,
          customer_price_approved_at: new Date().toISOString(),
          status: 'price_approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId);

      if (error) throw error;

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'price_approved',
        description: `Customer approved final price: $${order.proposed_price?.toFixed(2) || '0.00'}`,
        metadata: { final_price: order.proposed_price },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error approving price:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve price',
      };
    }
  }

  static async incrementAuthorization(
    params: PriceChangeParams
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.STRIPE_API_URL}/increment-custom-service-authorization`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({
            paymentIntentId: params.paymentIntentId,
            incrementAmount: Math.round((params.newAmount - params.currentAmount) * 100),
            reason: params.reason,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to increment authorization');
      }

      await supabase
        .from('production_orders')
        .update({
          authorization_amount: params.newAmount,
        })
        .eq('id', params.productionOrderId);

      return { success: true };
    } catch (error: any) {
      console.error('Error incrementing authorization:', error);
      return {
        success: false,
        error: error.message || 'Failed to increment authorization',
      };
    }
  }

  static async cancelAuthorization(
    productionOrderId: string,
    paymentIntentId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.STRIPE_API_URL}/cancel-custom-service-authorization`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({
            paymentIntentId,
            reason,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel authorization');
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
        event_type: 'order_cancelled',
        description: 'Order cancelled and authorization released',
        metadata: { reason },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling authorization:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel authorization',
      };
    }
  }

  static async markOrderReceived(
    productionOrderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', productionOrderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Production order not found');
      }

      if (order.status !== 'price_approved') {
        throw new Error('Order must have approved price before marking as received');
      }

      if (!order.final_price || !order.customer_price_approved_at) {
        throw new Error('Customer must approve final price first');
      }

      if (!order.payment_intent_id) {
        throw new Error('No payment authorization found');
      }

      const captureResult = await this.capturePayment({
        productionOrderId,
        paymentIntentId: order.payment_intent_id,
        finalAmount: order.final_price,
      });

      if (!captureResult.success) {
        return captureResult;
      }

      await supabase
        .from('production_orders')
        .update({
          order_received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productionOrderId);

      await supabase.from('production_timeline_events').insert({
        production_order_id: productionOrderId,
        event_type: 'order_received',
        description: 'Order received and payment captured',
        metadata: { amount_captured: order.final_price },
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

  static async refundOrder(
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
        throw new Error('Production order not found');
      }

      if (!order.payment_captured_at) {
        return await this.cancelAuthorization(
          productionOrderId,
          order.payment_intent_id,
          reason
        );
      }

      const amountToRefund =
        refundAmount !== undefined ? refundAmount : order.final_price || 0;

      const response = await fetch(`${this.STRIPE_API_URL}/refund-custom-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.STRIPE_AUTH_HEADER,
        },
        body: JSON.stringify({
          paymentIntentId: order.payment_intent_id,
          amount: Math.round(amountToRefund * 100),
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
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
        event_type: 'order_refunded',
        description: `Refunded $${amountToRefund.toFixed(2)}`,
        metadata: { refund_amount: amountToRefund, reason },
      });

      return { success: true, refundedAmount: amountToRefund };
    } catch (error: any) {
      console.error('Error refunding order:', error);
      return {
        success: false,
        error: error.message || 'Failed to refund order',
      };
    }
  }

  static async checkAuthorizationStatus(paymentIntentId: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    status?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.STRIPE_API_URL}/check-payment-intent-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.STRIPE_AUTH_HEADER,
          },
          body: JSON.stringify({ paymentIntentId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check authorization status');
      }

      const data = await response.json();

      return {
        isValid: data.status === 'requires_capture',
        expiresAt: data.expiresAt ? new Date(data.expiresAt * 1000) : undefined,
        status: data.status,
      };
    } catch (error: any) {
      console.error('Error checking authorization status:', error);
      return {
        isValid: false,
        error: error.message || 'Failed to check authorization status',
      };
    }
  }
}

export default CustomServicePayments;
