import { supabase } from './supabase';

export interface PaymentSettings {
  wallet_id: string;
  currency: string;
  payout_email: string | null;
  payout_method: 'BankTransfer' | 'PayPal' | 'Stripe' | null;
  payout_schedule: 'instant' | 'daily' | 'weekly' | 'monthly';
  min_payout_amount: number;
  auto_payout_enabled: boolean;
  notifications: {
    payment_received: boolean;
    payout_completed: boolean;
    low_balance: boolean;
    payment_failed: boolean;
  };
  tax_settings: {
    tax_id: string | null;
    business_name: string | null;
    business_address: string | null;
  };
}

export interface WalletSettings {
  id: string;
  user_id: string;
  currency: string;
  payout_email: string | null;
  payout_method: 'BankTransfer' | 'PayPal' | 'Stripe' | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function getWalletSettings(userId: string): Promise<WalletSettings | null> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return data as WalletSettings;
  } catch (error) {
    console.error('Error fetching wallet settings:', error);
    return null;
  }
}

export async function updateWalletSettings(
  userId: string,
  settings: {
    currency?: string;
    payout_email?: string;
    payout_method?: 'BankTransfer' | 'PayPal' | 'Stripe' | null;
    metadata?: Record<string, any>;
  }
): Promise<boolean> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (settings.currency !== undefined) {
      updateData.currency = settings.currency;
    }

    if (settings.payout_email !== undefined) {
      updateData.payout_email = settings.payout_email;
    }

    if (settings.payout_method !== undefined) {
      updateData.payout_method = settings.payout_method;
    }

    if (settings.metadata !== undefined) {
      updateData.metadata = settings.metadata;
    }

    const { error } = await supabase
      .from('wallets')
      .update(updateData)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating wallet settings:', error);
    return false;
  }
}

export async function getPaymentSettings(userId: string): Promise<PaymentSettings | null> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select(`
        id,
        currency,
        payout_email,
        payout_method,
        auto_payout_enabled,
        auto_payout_threshold,
        auto_payout_schedule,
        payout_day_of_week,
        payout_day_of_month,
        minimum_payout_amount,
        payout_notifications_enabled,
        last_auto_payout_at,
        metadata
      `)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const metadata = data.metadata || {};

    return {
      wallet_id: data.id,
      currency: data.currency,
      payout_email: data.payout_email,
      payout_method: data.payout_method,
      payout_schedule: (data.auto_payout_schedule?.toLowerCase() || 'weekly') as any,
      min_payout_amount: data.minimum_payout_amount || 50,
      auto_payout_enabled: data.auto_payout_enabled || false,
      notifications: {
        payment_received: metadata.notifications?.payment_received ?? true,
        payout_completed: data.payout_notifications_enabled ?? true,
        low_balance: metadata.notifications?.low_balance ?? true,
        payment_failed: metadata.notifications?.payment_failed ?? true,
      },
      tax_settings: {
        tax_id: metadata.tax_settings?.tax_id || null,
        business_name: metadata.tax_settings?.business_name || null,
        business_address: metadata.tax_settings?.business_address || null,
      },
    };
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return null;
  }
}

export async function updatePaymentSettings(
  userId: string,
  settings: Partial<PaymentSettings>
): Promise<boolean> {
  try {
    const currentWallet = await getWalletSettings(userId);
    if (!currentWallet) return false;

    const metadata = currentWallet.metadata || {};
    const updateData: any = { updated_at: new Date().toISOString() };

    if (settings.currency !== undefined) updateData.currency = settings.currency;
    if (settings.payout_email !== undefined) updateData.payout_email = settings.payout_email;
    if (settings.payout_method !== undefined) updateData.payout_method = settings.payout_method;
    if (settings.auto_payout_enabled !== undefined) updateData.auto_payout_enabled = settings.auto_payout_enabled;
    if (settings.min_payout_amount !== undefined) updateData.minimum_payout_amount = settings.min_payout_amount;

    if (settings.payout_schedule !== undefined) {
      updateData.auto_payout_schedule = settings.payout_schedule.charAt(0).toUpperCase() + settings.payout_schedule.slice(1);
    }

    const newMetadata = { ...metadata };

    if (settings.notifications !== undefined) {
      newMetadata.notifications = {
        ...metadata.notifications,
        ...settings.notifications,
      };

      if (settings.notifications.payout_completed !== undefined) {
        updateData.payout_notifications_enabled = settings.notifications.payout_completed;
      }
    }

    if (settings.tax_settings !== undefined) {
      newMetadata.tax_settings = {
        ...metadata.tax_settings,
        ...settings.tax_settings,
      };
    }

    updateData.metadata = newMetadata;

    const { error } = await supabase
      .from('wallets')
      .update(updateData)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return false;
  }
}

export function getSupportedCurrencies(): Array<{
  code: string;
  name: string;
  symbol: string;
}> {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  ];
}

export function getPayoutMethods(): Array<{
  value: 'BankTransfer' | 'PayPal' | 'Stripe';
  label: string;
  description: string;
  icon: string;
  processingTime: string;
}> {
  return [
    {
      value: 'BankTransfer',
      label: 'Bank Transfer',
      description: 'Direct deposit to your bank account',
      icon: '🏦',
      processingTime: '1-3 business days',
    },
    {
      value: 'PayPal',
      label: 'PayPal',
      description: 'Transfer to your PayPal account',
      icon: '🅿️',
      processingTime: 'Instant to 30 minutes',
    },
    {
      value: 'Stripe',
      label: 'Stripe Express',
      description: 'Fast payout via Stripe',
      icon: '⚡',
      processingTime: 'Instant',
    },
  ];
}

export function getPayoutSchedules(): Array<{
  value: 'instant' | 'daily' | 'weekly' | 'monthly';
  label: string;
  description: string;
}> {
  return [
    {
      value: 'instant',
      label: 'Instant',
      description: 'As soon as funds are available',
    },
    {
      value: 'daily',
      label: 'Daily',
      description: 'Once per day at 12:00 AM',
    },
    {
      value: 'weekly',
      label: 'Weekly',
      description: 'Every Monday at 12:00 AM',
    },
    {
      value: 'monthly',
      label: 'Monthly',
      description: 'First day of each month',
    },
  ];
}

export function validatePayoutEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateTaxId(taxId: string, country: string = 'US'): boolean {
  if (country === 'US') {
    const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
    const einRegex = /^\d{2}-?\d{7}$/;
    return ssnRegex.test(taxId) || einRegex.test(taxId);
  }
  return taxId.length > 0;
}

export function formatMinPayoutAmount(amount: number, currency: string): string {
  const currencies = getSupportedCurrencies();
  const curr = currencies.find((c) => c.code === currency);
  const symbol = curr?.symbol || '$';

  return `${symbol}${amount.toFixed(2)}`;
}

export function getMinPayoutAmountOptions(currency: string): number[] {
  const baseCurrency = currency === 'USD' ? 1 : currency === 'EUR' ? 0.92 : 1;

  return [
    Math.round(25 / baseCurrency),
    Math.round(50 / baseCurrency),
    Math.round(100 / baseCurrency),
    Math.round(250 / baseCurrency),
    Math.round(500 / baseCurrency),
  ];
}

export async function validatePaymentSettings(
  settings: Partial<PaymentSettings>
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (settings.payout_email) {
    if (!validatePayoutEmail(settings.payout_email)) {
      errors.push('Invalid payout email address');
    }
  }

  if (settings.payout_method && !settings.payout_email) {
    errors.push('Payout email is required when payout method is set');
  }

  if (settings.min_payout_amount !== undefined) {
    if (settings.min_payout_amount < 1) {
      errors.push('Minimum payout amount must be at least $1');
    }
    if (settings.min_payout_amount > 10000) {
      errors.push('Minimum payout amount cannot exceed $10,000');
    }
  }

  if (settings.tax_settings?.tax_id) {
    if (!validateTaxId(settings.tax_settings.tax_id)) {
      errors.push('Invalid tax ID format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPaymentSettingsSummary(settings: PaymentSettings): {
  currency: string;
  payoutMethod: string;
  payoutSchedule: string;
  minPayout: string;
  autoPayout: string;
  notificationsEnabled: number;
} {
  const payoutMethods = getPayoutMethods();
  const payoutSchedules = getPayoutSchedules();

  const payoutMethod =
    payoutMethods.find((m) => m.value === settings.payout_method)?.label ||
    'Not configured';

  const payoutSchedule =
    payoutSchedules.find((s) => s.value === settings.payout_schedule)?.label || 'Weekly';

  const notificationsEnabled = Object.values(settings.notifications).filter(Boolean).length;

  return {
    currency: settings.currency,
    payoutMethod,
    payoutSchedule,
    minPayout: formatMinPayoutAmount(settings.min_payout_amount, settings.currency),
    autoPayout: settings.auto_payout_enabled ? 'Enabled' : 'Disabled',
    notificationsEnabled,
  };
}

export function getDaysOfWeek(): Array<{ value: number; label: string }> {
  return [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];
}

export function getDaysOfMonth(): Array<{ value: number; label: string }> {
  return Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    return { value: day, label: `${day}${getOrdinalSuffix(day)}` };
  });
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
