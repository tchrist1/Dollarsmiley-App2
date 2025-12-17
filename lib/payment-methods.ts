import { supabase } from './supabase';

export interface PaymentMethod {
  id: string;
  user_id: string;
  payment_type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_account' | 'venmo' | 'cashapp';
  is_default: boolean;
  stripe_payment_method_id: string | null;
  paypal_email: string | null;
  card_last4: string | null;
  card_brand: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodInput {
  payment_type: PaymentMethod['payment_type'];
  is_default?: boolean;
  stripe_payment_method_id?: string;
  paypal_email?: string;
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodInput {
  is_default?: boolean;
  metadata?: Record<string, any>;
}

export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []) as PaymentMethod[];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

export async function getPaymentMethodById(
  paymentMethodId: string
): Promise<PaymentMethod | null> {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .single();

    if (error) throw error;

    return data as PaymentMethod;
  } catch (error) {
    console.error('Error fetching payment method:', error);
    return null;
  }
}

export async function getDefaultPaymentMethod(
  userId: string
): Promise<PaymentMethod | null> {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();

    if (error) throw error;

    return data as PaymentMethod | null;
  } catch (error) {
    console.error('Error fetching default payment method:', error);
    return null;
  }
}

export async function createPaymentMethod(
  userId: string,
  input: CreatePaymentMethodInput
): Promise<PaymentMethod | null> {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        payment_type: input.payment_type,
        is_default: input.is_default || false,
        stripe_payment_method_id: input.stripe_payment_method_id || null,
        paypal_email: input.paypal_email || null,
        card_last4: input.card_last4 || null,
        card_brand: input.card_brand || null,
        card_exp_month: input.card_exp_month || null,
        card_exp_year: input.card_exp_year || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return data as PaymentMethod;
  } catch (error) {
    console.error('Error creating payment method:', error);
    return null;
  }
}

export async function updatePaymentMethod(
  paymentMethodId: string,
  input: UpdatePaymentMethodInput
): Promise<PaymentMethod | null> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.is_default !== undefined) {
      updateData.is_default = input.is_default;
    }

    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata;
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', paymentMethodId)
      .select()
      .single();

    if (error) throw error;

    return data as PaymentMethod;
  } catch (error) {
    console.error('Error updating payment method:', error);
    return null;
  }
}

export async function deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', paymentMethodId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return false;
  }
}

export async function setDefaultPaymentMethod(
  paymentMethodId: string
): Promise<boolean> {
  try {
    const result = await updatePaymentMethod(paymentMethodId, { is_default: true });
    return result !== null;
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return false;
  }
}

export function getPaymentMethodIcon(type: PaymentMethod['payment_type']): string {
  const icons: Record<PaymentMethod['payment_type'], string> = {
    card: '💳',
    paypal: '🅿️',
    apple_pay: '🍎',
    google_pay: '🔵',
    bank_account: '🏦',
    venmo: '💙',
    cashapp: '💰',
  };
  return icons[type] || '💳';
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method.payment_type) {
    case 'card':
      if (method.card_brand && method.card_last4) {
        const brand = method.card_brand.charAt(0).toUpperCase() + method.card_brand.slice(1);
        return `${brand} •••• ${method.card_last4}`;
      }
      return 'Credit/Debit Card';

    case 'paypal':
      if (method.paypal_email) {
        return `PayPal (${method.paypal_email})`;
      }
      return 'PayPal';

    case 'bank_account':
      if (method.card_last4) {
        return `Bank Account •••• ${method.card_last4}`;
      }
      return 'Bank Account';

    case 'apple_pay':
      return 'Apple Pay';

    case 'google_pay':
      return 'Google Pay';

    case 'venmo':
      if (method.metadata?.username) {
        return `Venmo (@${method.metadata.username})`;
      }
      return 'Venmo';

    case 'cashapp':
      if (method.metadata?.cashtag) {
        return `Cash App ($${method.metadata.cashtag})`;
      }
      return 'Cash App';

    default:
      return 'Payment Method';
  }
}

export function getPaymentMethodDetails(method: PaymentMethod): string {
  if (method.payment_type === 'card' && method.card_exp_month && method.card_exp_year) {
    const month = method.card_exp_month.toString().padStart(2, '0');
    const year = method.card_exp_year.toString().slice(-2);
    return `Expires ${month}/${year}`;
  }

  if (method.payment_type === 'paypal' && method.paypal_email) {
    return method.paypal_email;
  }

  if (method.created_at) {
    const date = new Date(method.created_at);
    return `Added ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }

  return '';
}

export function isPaymentMethodExpired(method: PaymentMethod): boolean {
  if (method.payment_type !== 'card' || !method.card_exp_month || !method.card_exp_year) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (method.card_exp_year < currentYear) {
    return true;
  }

  if (method.card_exp_year === currentYear && method.card_exp_month < currentMonth) {
    return true;
  }

  return false;
}

export function isPaymentMethodExpiringSoon(method: PaymentMethod): boolean {
  if (method.payment_type !== 'card' || !method.card_exp_month || !method.card_exp_year) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const expiryDate = new Date(method.card_exp_year, method.card_exp_month - 1);
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  return expiryDate <= threeMonthsFromNow && expiryDate > now;
}

export function getCardBrandName(brand: string | null): string {
  if (!brand) return 'Card';

  const brandNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };

  return brandNames[brand.toLowerCase()] || brand;
}

export async function validatePaymentMethod(method: PaymentMethod): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  if (isPaymentMethodExpired(method)) {
    errors.push('This payment method has expired');
  }

  if (method.payment_type === 'card' && !method.card_last4) {
    errors.push('Card information is incomplete');
  }

  if (method.payment_type === 'paypal' && !method.paypal_email) {
    errors.push('PayPal email is missing');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function formatPaymentMethodForDisplay(method: PaymentMethod): {
  icon: string;
  title: string;
  subtitle: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isDefault: boolean;
} {
  return {
    icon: getPaymentMethodIcon(method.payment_type),
    title: getPaymentMethodLabel(method),
    subtitle: getPaymentMethodDetails(method),
    isExpired: isPaymentMethodExpired(method),
    isExpiringSoon: isPaymentMethodExpiringSoon(method),
    isDefault: method.is_default,
  };
}
