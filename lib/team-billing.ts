import { supabase } from './supabase';

export type BillingCycle = 'monthly' | 'annual';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'void' | 'refunded';
export type PaymentMethodType = 'card' | 'bank_account' | 'paypal';
export type UsageType = 'booking' | 'listing' | 'storage' | 'api_call' | 'sms' | 'email' | 'feature_access';
export type CreditTransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'adjustment';

export interface TeamPaymentMethod {
  id: string;
  team_id: string;
  type: PaymentMethodType;
  stripe_payment_method_id?: string;
  is_default: boolean;
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  bank_last4?: string;
  bank_name?: string;
  billing_email?: string;
  billing_name?: string;
  billing_address?: any;
  is_active: boolean;
  created_at: string;
}

export interface TeamSubscription {
  id: string;
  team_id: string;
  stripe_subscription_id?: string;
  plan_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  status: string;
  seats_included: number;
  seats_used: number;
  price_per_seat: number;
  base_price: number;
  total_price: number;
  currency: string;
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  metadata?: any;
  created_at: string;
}

export interface TeamInvoice {
  id: string;
  team_id: string;
  subscription_id?: string;
  stripe_invoice_id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  description?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  line_items: any[];
  billing_period_start?: string;
  billing_period_end?: string;
  due_date?: string;
  paid_at?: string;
  pdf_url?: string;
  hosted_url?: string;
  notes?: string;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  team_id: string;
  member_id?: string;
  usage_type: UsageType;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  team_id: string;
  transaction_type: CreditTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  performed_by?: string;
  created_at: string;
}

export interface BillingSummary {
  subscription: TeamSubscription | null;
  total_spent: number;
  current_usage: number;
  credit_balance: number;
  next_invoice_date?: string;
}

// Payment Methods
export async function getTeamPaymentMethods(teamId: string): Promise<TeamPaymentMethod[]> {
  try {
    const { data, error } = await supabase
      .from('team_payment_methods')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting payment methods:', error);
    return [];
  }
}

export async function getDefaultPaymentMethod(teamId: string): Promise<TeamPaymentMethod | null> {
  try {
    const { data, error } = await supabase
      .from('team_payment_methods')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting default payment method:', error);
    return null;
  }
}

export async function setDefaultPaymentMethod(
  teamId: string,
  paymentMethodId: string
): Promise<boolean> {
  try {
    // Remove default from all methods
    await supabase
      .from('team_payment_methods')
      .update({ is_default: false })
      .eq('team_id', teamId);

    // Set new default
    const { error } = await supabase
      .from('team_payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return false;
  }
}

export async function deletePaymentMethod(
  teamId: string,
  paymentMethodId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_payment_methods')
      .update({ is_active: false })
      .eq('id', paymentMethodId)
      .eq('team_id', teamId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return false;
  }
}

// Subscriptions
export async function getTeamSubscription(teamId: string): Promise<TeamSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('team_subscriptions')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting team subscription:', error);
    return null;
  }
}

export async function getSubscriptionHistory(teamId: string): Promise<TeamSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('team_subscriptions')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting subscription history:', error);
    return [];
  }
}

// Invoices
export async function getTeamInvoices(
  teamId: string,
  options?: {
    limit?: number;
    status?: InvoiceStatus;
  }
): Promise<TeamInvoice[]> {
  try {
    let query = supabase
      .from('team_invoices')
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
    console.error('Error getting invoices:', error);
    return [];
  }
}

export async function getInvoice(invoiceId: string): Promise<TeamInvoice | null> {
  try {
    const { data, error } = await supabase
      .from('team_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return null;
  }
}

export async function getOverdueInvoices(teamId: string): Promise<TeamInvoice[]> {
  try {
    const { data, error } = await supabase
      .from('team_invoices')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting overdue invoices:', error);
    return [];
  }
}

// Usage Tracking
export async function recordUsage(
  teamId: string,
  memberId: string | null,
  usageType: UsageType,
  quantity: number,
  unitPrice: number,
  description?: string,
  referenceType?: string,
  referenceId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('record_team_usage', {
      p_team_id: teamId,
      p_member_id: memberId,
      p_usage_type: usageType,
      p_quantity: quantity,
      p_unit_price: unitPrice,
      p_description: description,
      p_reference_type: referenceType,
      p_reference_id: referenceId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording usage:', error);
    return null;
  }
}

export async function getTeamUsage(
  teamId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    memberId?: string;
    usageType?: UsageType;
  }
): Promise<UsageRecord[]> {
  try {
    let query = supabase
      .from('team_usage_records')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (options?.startDate) {
      query = query.gte('period_start', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('period_end', options.endDate);
    }

    if (options?.memberId) {
      query = query.eq('member_id', options.memberId);
    }

    if (options?.usageType) {
      query = query.eq('usage_type', options.usageType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting team usage:', error);
    return [];
  }
}

export async function getCurrentMonthUsage(teamId: string): Promise<number> {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('team_usage_records')
      .select('total_price')
      .eq('team_id', teamId)
      .gte('period_start', startOfMonth.toISOString());

    if (error) throw error;

    const total = data?.reduce((sum, record) => sum + Number(record.total_price), 0) || 0;
    return total;
  } catch (error) {
    console.error('Error getting current month usage:', error);
    return 0;
  }
}

// Credits
export async function addTeamCredits(
  teamId: string,
  amount: number,
  transactionType: CreditTransactionType,
  description: string,
  performedBy?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('add_team_credits', {
      p_team_id: teamId,
      p_amount: amount,
      p_transaction_type: transactionType,
      p_description: description,
      p_performed_by: performedBy,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding team credits:', error);
    return null;
  }
}

export async function getTeamCreditBalance(teamId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('credit_balance')
      .eq('id', teamId)
      .single();

    if (error) throw error;
    return Number(data?.credit_balance || 0);
  } catch (error) {
    console.error('Error getting credit balance:', error);
    return 0;
  }
}

export async function getCreditHistory(teamId: string, limit: number = 50): Promise<CreditTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('team_credits')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting credit history:', error);
    return [];
  }
}

// Billing Summary
export async function getBillingSummary(
  teamId: string,
  periodMonths: number = 12
): Promise<BillingSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_team_billing_summary', {
      p_team_id: teamId,
      p_period_months: periodMonths,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting billing summary:', error);
    return null;
  }
}

// Utility functions
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function formatCardBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };
  return brands[brand.toLowerCase()] || brand;
}

export function getInvoiceStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'paid':
      return '#10B981'; // green
    case 'pending':
      return '#F59E0B'; // orange
    case 'overdue':
      return '#EF4444'; // red
    case 'void':
    case 'refunded':
      return '#6B7280'; // gray
    default:
      return '#3B82F6'; // blue
  }
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getUsageTypeLabel(type: UsageType): string {
  switch (type) {
    case 'booking':
      return 'Booking';
    case 'listing':
      return 'Listing';
    case 'storage':
      return 'Storage';
    case 'api_call':
      return 'API Call';
    case 'sms':
      return 'SMS';
    case 'email':
      return 'Email';
    case 'feature_access':
      return 'Feature Access';
  }
}

export function getCreditTransactionLabel(type: CreditTransactionType): string {
  switch (type) {
    case 'purchase':
      return 'Purchase';
    case 'usage':
      return 'Usage';
    case 'refund':
      return 'Refund';
    case 'bonus':
      return 'Bonus';
    case 'adjustment':
      return 'Adjustment';
  }
}

export function calculateProration(
  currentPrice: number,
  newPrice: number,
  daysRemaining: number,
  totalDays: number
): number {
  const unusedAmount = (currentPrice * daysRemaining) / totalDays;
  const newAmount = (newPrice * daysRemaining) / totalDays;
  return newAmount - unusedAmount;
}

export function isSubscriptionActive(subscription: TeamSubscription): boolean {
  return subscription.status === 'active' && !subscription.cancel_at_period_end;
}

export function isInTrialPeriod(subscription: TeamSubscription): boolean {
  if (!subscription.trial_end) return false;
  return new Date(subscription.trial_end) > new Date();
}

export function getDaysUntilDue(invoice: TeamInvoice): number {
  if (!invoice.due_date) return 0;
  const now = new Date();
  const dueDate = new Date(invoice.due_date);
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
