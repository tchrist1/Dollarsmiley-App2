import { supabase } from './supabase';

export interface EscrowHold {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  amount: number;
  platform_fee: number;
  provider_payout: number;
  stripe_payment_intent_id?: string;
  status: 'Held' | 'Released' | 'Refunded' | 'Disputed' | 'Expired';
  held_at: string;
  released_at?: string;
  expires_at: string;
}

export interface EscrowRelease {
  escrowHoldId: string;
  bookingId: string;
  providerId: string;
  amount: number;
  platformFee: number;
  providerPayout: number;
}

export interface RefundRequest {
  bookingId: string;
  escrowHoldId: string;
  amount: number;
  reason: string;
  requestedBy: string;
  notes?: string;
}

export class EscrowService {
  static async createEscrowHold(
    bookingId: string,
    customerId: string,
    providerId: string,
    amount: number,
    stripePaymentIntentId?: string
  ): Promise<EscrowHold | null> {
    try {
      const platformFee = amount * 0.10;
      const providerPayout = amount - platformFee;

      const { data, error } = await supabase
        .from('escrow_holds')
        .insert({
          booking_id: bookingId,
          customer_id: customerId,
          provider_id: providerId,
          amount,
          platform_fee: platformFee,
          provider_payout: providerPayout,
          stripe_payment_intent_id: stripePaymentIntentId,
          status: 'Held',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating escrow hold:', error);
        return null;
      }

      await supabase
        .from('bookings')
        .update({ escrow_status: 'Held' })
        .eq('id', bookingId);

      return data;
    } catch (error) {
      console.error('Error in createEscrowHold:', error);
      return null;
    }
  }

  static async releaseEscrow(
    escrowHoldId: string,
    bookingId: string
  ): Promise<boolean> {
    try {
      const { data: escrowData, error: escrowError } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('id', escrowHoldId)
        .single();

      if (escrowError || !escrowData) {
        console.error('Escrow hold not found:', escrowError);
        return false;
      }

      if (escrowData.status !== 'Held') {
        console.error('Escrow already processed:', escrowData.status);
        return false;
      }

      const { error: updateError } = await supabase
        .from('escrow_holds')
        .update({
          status: 'Released',
          released_at: new Date().toISOString(),
        })
        .eq('id', escrowHoldId);

      if (updateError) {
        console.error('Error releasing escrow:', updateError);
        return false;
      }

      await supabase
        .from('bookings')
        .update({ escrow_status: 'Released' })
        .eq('id', bookingId);

      const { data: walletData } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', escrowData.provider_id)
        .single();

      if (walletData) {
        await supabase.from('transactions').insert({
          wallet_id: walletData.id,
          transaction_type: 'Payout',
          amount: escrowData.provider_payout,
          status: 'Completed',
          description: `Payout from booking #${bookingId.slice(0, 8)}`,
          booking_id: bookingId,
          escrow_hold_id: escrowHoldId,
        });

        await supabase.rpc('update_wallet_balance', {
          p_wallet_id: walletData.id,
          p_amount: escrowData.provider_payout,
        });
      }

      return true;
    } catch (error) {
      console.error('Error in releaseEscrow:', error);
      return false;
    }
  }

  static async requestRefund(
    request: RefundRequest
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const { data: escrowData } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('id', request.escrowHoldId)
        .single();

      if (!escrowData) {
        return { success: false, error: 'Escrow hold not found' };
      }

      if (escrowData.status !== 'Held') {
        return { success: false, error: 'Escrow not in held status' };
      }

      const { data: refundData, error: refundError } = await supabase
        .from('refunds')
        .insert({
          booking_id: request.bookingId,
          escrow_hold_id: request.escrowHoldId,
          amount: request.amount,
          reason: request.reason,
          requested_by: request.requestedBy,
          notes: request.notes,
          status: 'Pending',
        })
        .select()
        .single();

      if (refundError) {
        return { success: false, error: refundError.message };
      }

      await supabase
        .from('bookings')
        .update({ refund_requested: true })
        .eq('id', request.bookingId);

      return { success: true, refundId: refundData.id };
    } catch (error: any) {
      return { success: false, error: error.message || 'Refund request failed' };
    }
  }

  static async processRefund(
    refundId: string,
    approvedBy: string,
    stripeRefundId?: string
  ): Promise<boolean> {
    try {
      const { data: refundData, error: refundFetchError } = await supabase
        .from('refunds')
        .select('*, escrow_holds(*)')
        .eq('id', refundId)
        .single();

      if (refundFetchError || !refundData) {
        console.error('Refund not found:', refundFetchError);
        return false;
      }

      const { error: updateError } = await supabase
        .from('refunds')
        .update({
          status: 'Completed',
          approved_by: approvedBy,
          stripe_refund_id: stripeRefundId,
          processed_at: new Date().toISOString(),
        })
        .eq('id', refundId);

      if (updateError) {
        console.error('Error updating refund:', updateError);
        return false;
      }

      const escrowHold = refundData.escrow_holds;
      if (escrowHold) {
        await supabase
          .from('escrow_holds')
          .update({ status: 'Refunded' })
          .eq('id', escrowHold.id);

        await supabase
          .from('bookings')
          .update({ escrow_status: 'Refunded', payment_status: 'Refunded' })
          .eq('id', refundData.booking_id);

        const { data: walletData } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', escrowHold.customer_id)
          .single();

        if (walletData) {
          await supabase.from('transactions').insert({
            wallet_id: walletData.id,
            transaction_type: 'Refund',
            amount: refundData.amount,
            status: 'Completed',
            description: `Refund for booking #${refundData.booking_id.slice(0, 8)}`,
            booking_id: refundData.booking_id,
            refund_id: refundId,
            escrow_hold_id: escrowHold.id,
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error in processRefund:', error);
      return false;
    }
  }

  static async getEscrowHold(bookingId: string): Promise<EscrowHold | null> {
    try {
      const { data, error } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting escrow hold:', error);
      return null;
    }
  }

  static async checkEscrowExpiry(): Promise<void> {
    try {
      const { data: expiredHolds } = await supabase
        .from('escrow_holds')
        .select('*')
        .eq('status', 'Held')
        .lt('expires_at', new Date().toISOString());

      if (expiredHolds && expiredHolds.length > 0) {
        for (const hold of expiredHolds) {
          await this.releaseEscrow(hold.id, hold.booking_id);
        }
      }
    } catch (error) {
      console.error('Error checking escrow expiry:', error);
    }
  }

  static async getEscrowStatus(bookingId: string): Promise<{
    hasEscrow: boolean;
    status?: string;
    amount?: number;
    canRelease?: boolean;
    daysUntilExpiry?: number;
  }> {
    try {
      const escrow = await this.getEscrowHold(bookingId);

      if (!escrow) {
        return { hasEscrow: false };
      }

      const expiresAt = new Date(escrow.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        hasEscrow: true,
        status: escrow.status,
        amount: escrow.amount,
        canRelease: escrow.status === 'Held',
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
      };
    } catch (error) {
      console.error('Error getting escrow status:', error);
      return { hasEscrow: false };
    }
  }

  static async getUserEscrowHolds(userId: string): Promise<EscrowHold[]> {
    try {
      const { data, error } = await supabase
        .from('escrow_holds')
        .select('*')
        .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user escrow holds:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserEscrowHolds:', error);
      return [];
    }
  }

  static async getTotalEscrowAmount(userId: string): Promise<number> {
    try {
      const holds = await this.getUserEscrowHolds(userId);
      const heldFunds = holds
        .filter((hold) => hold.status === 'Held' && hold.provider_id === userId)
        .reduce((sum, hold) => sum + hold.provider_payout, 0);

      return heldFunds;
    } catch (error) {
      console.error('Error calculating total escrow:', error);
      return 0;
    }
  }
}

export default EscrowService;
