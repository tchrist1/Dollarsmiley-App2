import { supabase } from './supabase';

interface PaymentIntentCreate {
  userId: string;
  amount: number;
  currency?: string;
  bookingId?: string;
  productionOrderId?: string;
  metadata?: Record<string, any>;
}

interface PaymentMethodAttach {
  userId: string;
  paymentMethodId: string;
  setAsDefault?: boolean;
}

export class StripePaymentsService {
  static async createPaymentIntent(params: PaymentIntentCreate) {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: Math.round(params.amount * 100),
        currency: params.currency?.toLowerCase() || 'usd',
        booking_id: params.bookingId,
        production_order_id: params.productionOrderId,
        metadata: params.metadata || {},
      },
    });

    if (error) throw error;
    return data;
  }

  static async confirmPayment(paymentIntentId: string, paymentMethodId: string) {
    const { data, error } = await supabase.functions.invoke('confirm-payment', {
      body: {
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
      },
    });

    if (error) throw error;
    return data;
  }

  static async getPaymentIntent(paymentIntentId: string) {
    const { data, error } = await supabase
      .from('stripe_payment_intents')
      .select('*, stripe_charges(*)')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserPaymentHistory(userId: string, limit: number = 20) {
    const { data, error } = await supabase.rpc('get_user_payment_history', {
      user_id_param: userId,
      limit_param: limit,
    });

    if (error) throw error;
    return data || [];
  }

  static async attachPaymentMethod(params: PaymentMethodAttach) {
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', params.userId)
      .single();

    if (!customer) {
      throw new Error('Stripe customer not found');
    }

    const { data, error } = await supabase.functions.invoke('attach-payment-method', {
      body: {
        payment_method_id: params.paymentMethodId,
        customer_id: customer.stripe_customer_id,
        set_as_default: params.setAsDefault || false,
      },
    });

    if (error) throw error;

    if (params.setAsDefault) {
      await supabase
        .from('stripe_customers')
        .update({
          default_payment_method: params.paymentMethodId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', params.userId);
    }

    return data;
  }

  static async detachPaymentMethod(userId: string, paymentMethodId: string) {
    const { data, error } = await supabase.functions.invoke('detach-payment-method', {
      body: {
        payment_method_id: paymentMethodId,
      },
    });

    if (error) throw error;

    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('default_payment_method')
      .eq('user_id', userId)
      .single();

    if (customer?.default_payment_method === paymentMethodId) {
      await supabase
        .from('stripe_customers')
        .update({
          default_payment_method: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    return data;
  }

  static async requestRefund(
    chargeId: string,
    amount?: number,
    reason?: string
  ) {
    const { data: charge } = await supabase
      .from('stripe_charges')
      .select('stripe_charge_id, amount, currency')
      .eq('id', chargeId)
      .single();

    if (!charge) {
      throw new Error('Charge not found');
    }

    const { data, error } = await supabase.functions.invoke('process-refund', {
      body: {
        charge_id: charge.stripe_charge_id,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason || 'requested_by_customer',
      },
    });

    if (error) throw error;
    return data;
  }

  static async getStripeCustomer(userId: string) {
    const { data, error } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async createStripeCustomer(userId: string, email: string) {
    const { data, error } = await supabase.functions.invoke('create-stripe-customer', {
      body: {
        user_id: userId,
        email,
      },
    });

    if (error) throw error;
    return data;
  }

  static async payForBooking(
    bookingId: string,
    amount: number,
    paymentMethodId: string,
    userId: string
  ) {
    const paymentIntent = await this.createPaymentIntent({
      userId,
      amount,
      bookingId,
      metadata: {
        type: 'booking',
        booking_id: bookingId,
      },
    });

    const confirmed = await this.confirmPayment(
      paymentIntent.payment_intent_id,
      paymentMethodId
    );

    return confirmed;
  }

  static async payForProductionOrder(
    orderId: string,
    amount: number,
    paymentMethodId: string,
    userId: string
  ) {
    const paymentIntent = await this.createPaymentIntent({
      userId,
      amount,
      productionOrderId: orderId,
      metadata: {
        type: 'production_order',
        production_order_id: orderId,
      },
    });

    const confirmed = await this.confirmPayment(
      paymentIntent.payment_intent_id,
      paymentMethodId
    );

    return confirmed;
  }

  static async getPaymentStats(userId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data: payments } = await supabase
      .from('stripe_payment_intents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateFrom.toISOString());

    const stats = {
      total: payments?.length || 0,
      succeeded: payments?.filter((p) => p.status === 'succeeded').length || 0,
      pending: payments?.filter((p) => p.status === 'requires_action').length || 0,
      failed: payments?.filter((p) => p.status === 'failed').length || 0,
      total_amount: payments
        ?.filter((p) => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0) || 0,
    };

    return stats;
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      succeeded: 'Succeeded',
      pending: 'Pending',
      requires_action: 'Requires Action',
      requires_payment_method: 'Payment Required',
      processing: 'Processing',
      canceled: 'Canceled',
      failed: 'Failed',
    };

    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      succeeded: '#10B981',
      pending: '#F59E0B',
      requires_action: '#3B82F6',
      requires_payment_method: '#DC2626',
      processing: '#8B5CF6',
      canceled: '#6B7280',
      failed: '#DC2626',
    };

    return colors[status] || '#6B7280';
  }

  static formatAmount(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }
}

export default StripePaymentsService;
