import { supabase } from './supabase';

export interface StripeConnectAccount {
  id: string;
  user_id: string;
  stripe_account_id: string | null;
  account_status: 'Pending' | 'Active' | 'Restricted' | 'Disabled';
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  default_currency: string;
  country: string;
  details_submitted: boolean;
  requirements: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
    pending_verification?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface OnboardingStatus {
  isCreated: boolean;
  isOnboarded: boolean;
  canAcceptPayments: boolean;
  canReceivePayouts: boolean;
  needsAttention: boolean;
  requirements: string[];
}

export async function getStripeConnectAccount(
  userId: string
): Promise<StripeConnectAccount | null> {
  try {
    const { data, error } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return data as StripeConnectAccount | null;
  } catch (error) {
    console.error('Error fetching Stripe Connect account:', error);
    return null;
  }
}

export async function createStripeConnectAccount(userId: string): Promise<{
  success: boolean;
  accountId?: string;
  onboardingUrl?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'create' }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to create account' };
    }

    const data = await response.json();

    return {
      success: true,
      accountId: data.accountId,
      onboardingUrl: data.onboardingUrl,
    };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return { success: false, error: 'Failed to create account' };
  }
}

export async function refreshStripeConnectOnboarding(
  accountId: string
): Promise<{
  success: boolean;
  onboardingUrl?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'refresh', accountId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to refresh onboarding' };
    }

    const data = await response.json();

    return {
      success: true,
      onboardingUrl: data.onboardingUrl,
    };
  } catch (error) {
    console.error('Error refreshing Stripe Connect onboarding:', error);
    return { success: false, error: 'Failed to refresh onboarding' };
  }
}

export async function getStripeConnectStatus(userId: string): Promise<{
  success: boolean;
  status?: OnboardingStatus;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-onboarding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'status' }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to get status' };
    }

    const data = await response.json();

    if (data.status === 'not_created') {
      return {
        success: true,
        status: {
          isCreated: false,
          isOnboarded: false,
          canAcceptPayments: false,
          canReceivePayouts: false,
          needsAttention: false,
          requirements: [],
        },
      };
    }

    const currentlyDue = data.requirements?.currently_due || [];
    const pastDue = data.requirements?.past_due || [];

    return {
      success: true,
      status: {
        isCreated: true,
        isOnboarded: data.onboardingCompleted,
        canAcceptPayments: data.chargesEnabled,
        canReceivePayouts: data.payoutsEnabled,
        needsAttention: currentlyDue.length > 0 || pastDue.length > 0,
        requirements: [...currentlyDue, ...pastDue],
      },
    };
  } catch (error) {
    console.error('Error getting Stripe Connect status:', error);
    return { success: false, error: 'Failed to get status' };
  }
}

export function getAccountStatusColor(status: StripeConnectAccount['account_status']): string {
  switch (status) {
    case 'Active':
      return '#10B981';
    case 'Pending':
      return '#F59E0B';
    case 'Restricted':
      return '#EF4444';
    case 'Disabled':
      return '#6B7280';
    default:
      return '#6B7280';
  }
}

export function getAccountStatusIcon(status: StripeConnectAccount['account_status']): string {
  switch (status) {
    case 'Active':
      return '✅';
    case 'Pending':
      return '⏳';
    case 'Restricted':
      return '⚠️';
    case 'Disabled':
      return '🚫';
    default:
      return '❓';
  }
}

export function formatRequirement(requirement: string): string {
  const requirementMap: Record<string, string> = {
    'individual.address.city': 'City',
    'individual.address.line1': 'Street address',
    'individual.address.postal_code': 'Postal code',
    'individual.address.state': 'State',
    'individual.dob.day': 'Date of birth (day)',
    'individual.dob.month': 'Date of birth (month)',
    'individual.dob.year': 'Date of birth (year)',
    'individual.email': 'Email address',
    'individual.first_name': 'First name',
    'individual.last_name': 'Last name',
    'individual.phone': 'Phone number',
    'individual.ssn_last_4': 'Last 4 of SSN',
    'individual.verification.document': 'Verification document',
    'tos_acceptance.date': 'Terms of service acceptance',
    'tos_acceptance.ip': 'Terms of service IP',
    'business_profile.mcc': 'Business category',
    'business_profile.url': 'Business website',
    'external_account': 'Bank account',
  };

  return requirementMap[requirement] || requirement.replace(/_/g, ' ');
}

export function getOnboardingSteps(): Array<{
  step: number;
  title: string;
  description: string;
  icon: string;
}> {
  return [
    {
      step: 1,
      title: 'Create Account',
      description: 'Set up your Stripe Connect account',
      icon: '🔐',
    },
    {
      step: 2,
      title: 'Verify Identity',
      description: 'Provide identification and business details',
      icon: '🆔',
    },
    {
      step: 3,
      title: 'Add Bank Account',
      description: 'Link your bank account for payouts',
      icon: '🏦',
    },
    {
      step: 4,
      title: 'Start Earning',
      description: 'Accept payments and receive payouts',
      icon: '💰',
    },
  ];
}

export function getCurrentStep(status: OnboardingStatus): number {
  if (!status.isCreated) return 1;
  if (!status.isOnboarded) return 2;
  if (!status.canReceivePayouts) return 3;
  return 4;
}

export async function createDashboardLink(accountId: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-dashboard`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accountId }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    return null;
  }
}
