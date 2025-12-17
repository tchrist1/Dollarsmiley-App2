import { supabase } from './supabase';

export interface PayoutRequest {
  id: string;
  wallet_id: string;
  amount: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  payout_method: string;
  payout_details: {
    account_email?: string;
    account_last4?: string;
    bank_name?: string;
  };
  requested_at: string;
  processed_at: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_paid_out: number;
  currency: string;
  payout_email: string | null;
  payout_method: string | null;
}

export interface PayoutRequestInput {
  amount: number;
  payout_method: string;
  payout_details?: {
    account_email?: string;
    account_last4?: string;
    bank_name?: string;
  };
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return data as Wallet;
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return null;
  }
}

export async function getPayoutRequests(
  walletId: string,
  status?: PayoutRequest['status']
): Promise<PayoutRequest[]> {
  try {
    let query = supabase
      .from('payout_requests')
      .select('*')
      .eq('wallet_id', walletId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) throw error;

    return (data || []) as PayoutRequest[];
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    return [];
  }
}

export async function getPendingPayoutRequests(walletId: string): Promise<PayoutRequest[]> {
  return getPayoutRequests(walletId, 'Pending');
}

export async function createPayoutRequest(
  walletId: string,
  input: PayoutRequestInput
): Promise<{ success: boolean; request?: PayoutRequest; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('payout_requests')
      .insert({
        wallet_id: walletId,
        amount: input.amount,
        payout_method: input.payout_method,
        payout_details: input.payout_details || {},
        status: 'Pending',
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, request: data as PayoutRequest };
  } catch (error: any) {
    console.error('Error creating payout request:', error);
    return { success: false, error: error.message || 'Failed to create payout request' };
  }
}

export async function cancelPayoutRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payout_requests')
      .update({ status: 'Cancelled' })
      .eq('id', requestId)
      .eq('status', 'Pending');

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error cancelling payout request:', error);
    return false;
  }
}

export async function validatePayoutRequest(
  wallet: Wallet,
  amount: number
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (amount > wallet.balance) {
    errors.push('Amount exceeds available balance');
  }

  const minPayout = 10;
  if (amount < minPayout) {
    errors.push(`Minimum payout amount is $${minPayout}`);
  }

  const maxPayout = 100000;
  if (amount > maxPayout) {
    errors.push(`Maximum payout amount is $${maxPayout.toLocaleString()}`);
  }

  if (!wallet.payout_method) {
    errors.push('Payout method not configured');
  }

  if (!wallet.payout_email) {
    errors.push('Payout email not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPayoutStatusColor(status: PayoutRequest['status']): string {
  switch (status) {
    case 'Completed':
      return '#10B981';
    case 'Processing':
      return '#3B82F6';
    case 'Pending':
      return '#F59E0B';
    case 'Failed':
      return '#EF4444';
    case 'Cancelled':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}

export function getPayoutStatusIcon(status: PayoutRequest['status']): string {
  switch (status) {
    case 'Completed':
      return '✅';
    case 'Processing':
      return '⏳';
    case 'Pending':
      return '🕐';
    case 'Failed':
      return '❌';
    case 'Cancelled':
      return '🚫';
    default:
      return '❓';
  }
}

export function formatPayoutMethod(method: string): string {
  const methods: Record<string, string> = {
    BankTransfer: 'Bank Transfer',
    PayPal: 'PayPal',
    Stripe: 'Stripe Express',
    Venmo: 'Venmo',
    CashApp: 'Cash App',
  };

  return methods[method] || method;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function getEstimatedArrival(method: string): string {
  const estimates: Record<string, string> = {
    BankTransfer: '1-3 business days',
    PayPal: 'Instant to 30 minutes',
    Stripe: 'Instant',
    Venmo: 'Instant to 1 hour',
    CashApp: 'Instant',
  };

  return estimates[method] || '1-3 business days';
}

export function canCancelPayout(request: PayoutRequest): boolean {
  return request.status === 'Pending';
}

export function getPayoutRequestSummary(requests: PayoutRequest[]): {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalAmount: number;
  pendingAmount: number;
} {
  const summary = {
    total: requests.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalAmount: 0,
    pendingAmount: 0,
  };

  requests.forEach((request) => {
    summary.totalAmount += request.amount;

    switch (request.status) {
      case 'Pending':
        summary.pending++;
        summary.pendingAmount += request.amount;
        break;
      case 'Processing':
        summary.processing++;
        summary.pendingAmount += request.amount;
        break;
      case 'Completed':
        summary.completed++;
        break;
      case 'Failed':
        summary.failed++;
        break;
    }
  });

  return summary;
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getPayoutFee(amount: number, method: string): number {
  const fees: Record<string, number> = {
    BankTransfer: 0,
    PayPal: amount * 0.01,
    Stripe: amount * 0.005,
    Venmo: 0,
    CashApp: 0,
  };

  return fees[method] || 0;
}

export function getPayoutTotal(amount: number, method: string): number {
  const fee = getPayoutFee(amount, method);
  return amount - fee;
}
