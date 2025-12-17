import { supabase } from './supabase';

export type CheckType = 'Basic' | 'Standard' | 'Premium' | 'Custom';
export type CheckStatus = 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Expired' | 'Cancelled';
export type CheckResult = 'Clear' | 'Consider' | 'Suspended';
export type ComponentType =
  | 'SSNTrace'
  | 'NationalCriminalSearch'
  | 'CountyCriminalSearch'
  | 'FederalCriminalSearch'
  | 'SexOffenderSearch'
  | 'GlobalWatchlistSearch'
  | 'MotorVehicleRecords'
  | 'EmploymentVerification'
  | 'EducationVerification'
  | 'ProfessionalLicenseVerification'
  | 'CreditCheck'
  | 'CivilCourtSearch';
export type AppealStatus = 'Pending' | 'UnderReview' | 'Approved' | 'Denied';

export interface BackgroundCheck {
  id: string;
  provider_id: string;
  check_type: CheckType;
  status: CheckStatus;
  external_check_id: string | null;
  service_provider: string;
  consent_given: boolean;
  consent_given_at: string | null;
  initiated_by: string | null;
  initiated_at: string;
  completed_at: string | null;
  expires_at: string | null;
  result: CheckResult | null;
  result_details: Record<string, any>;
  pdf_report_url: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackgroundCheckComponent {
  id: string;
  background_check_id: string;
  component_type: ComponentType;
  status: CheckStatus;
  result: CheckResult | null;
  records_found: number;
  result_data: Record<string, any>;
  completed_at: string | null;
  created_at: string;
}

export interface BackgroundCheckAppeal {
  id: string;
  background_check_id: string;
  provider_id: string;
  appeal_reason: string;
  supporting_documents: string[];
  status: AppealStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution: string | null;
  created_at: string;
}

/**
 * Get provider's background checks
 */
export async function getProviderBackgroundChecks(
  providerId: string
): Promise<BackgroundCheck[]> {
  try {
    const { data, error } = await supabase
      .from('background_checks')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching background checks:', error);
    return [];
  }
}

/**
 * Get single background check with details
 */
export async function getBackgroundCheckDetails(
  checkId: string
): Promise<BackgroundCheck | null> {
  try {
    const { data, error } = await supabase
      .from('background_checks')
      .select('*')
      .eq('id', checkId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching background check:', error);
    return null;
  }
}

/**
 * Get background check components
 */
export async function getBackgroundCheckComponents(
  checkId: string
): Promise<BackgroundCheckComponent[]> {
  try {
    const { data, error } = await supabase
      .from('background_check_components')
      .select('*')
      .eq('background_check_id', checkId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching check components:', error);
    return [];
  }
}

/**
 * Get latest background check for provider
 */
export async function getLatestBackgroundCheck(
  providerId: string
): Promise<BackgroundCheck | null> {
  try {
    const { data, error } = await supabase
      .from('background_checks')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching latest background check:', error);
    return null;
  }
}

/**
 * Create background check
 */
export async function createBackgroundCheck(
  providerId: string,
  checkType: CheckType,
  consentGiven: boolean
): Promise<{ success: boolean; check_id?: string; error?: string }> {
  try {
    if (!consentGiven) {
      return {
        success: false,
        error: 'Consent must be given to proceed with background check',
      };
    }

    const { data, error } = await supabase.rpc(
      'create_background_check_with_components',
      {
        provider_id_param: providerId,
        check_type_param: checkType,
        consent_given_param: consentGiven,
      }
    );

    if (error) throw error;

    return {
      success: true,
      check_id: data,
    };
  } catch (error: any) {
    console.error('Error creating background check:', error);
    return {
      success: false,
      error: error.message || 'Failed to create background check',
    };
  }
}

/**
 * Get background check appeals for check
 */
export async function getBackgroundCheckAppeals(
  checkId: string
): Promise<BackgroundCheckAppeal[]> {
  try {
    const { data, error } = await supabase
      .from('background_check_appeals')
      .select('*')
      .eq('background_check_id', checkId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching appeals:', error);
    return [];
  }
}

/**
 * Create background check appeal
 */
export async function createBackgroundCheckAppeal(
  checkId: string,
  providerId: string,
  appealReason: string,
  supportingDocuments: string[]
): Promise<{ success: boolean; appeal_id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('background_check_appeals')
      .insert([
        {
          background_check_id: checkId,
          provider_id: providerId,
          appeal_reason: appealReason,
          supporting_documents: supportingDocuments,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      appeal_id: data.id,
    };
  } catch (error: any) {
    console.error('Error creating appeal:', error);
    return {
      success: false,
      error: error.message || 'Failed to create appeal',
    };
  }
}

/**
 * Check if background check is expired or expiring soon
 */
export function isBackgroundCheckExpired(check: BackgroundCheck): boolean {
  if (!check.expires_at) return false;
  const expiryDate = new Date(check.expires_at);
  const today = new Date();
  return expiryDate < today;
}

export function isBackgroundCheckExpiringSoon(
  check: BackgroundCheck,
  daysThreshold: number = 30
): boolean {
  if (!check.expires_at) return false;
  const expiryDate = new Date(check.expires_at);
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return expiryDate <= thresholdDate && expiryDate > today;
}

/**
 * Get status color
 */
export function getCheckStatusColor(status: CheckStatus): string {
  const colors: Record<CheckStatus, string> = {
    Pending: '#F59E0B',
    InProgress: '#3B82F6',
    Completed: '#10B981',
    Failed: '#EF4444',
    Expired: '#6B7280',
    Cancelled: '#6B7280',
  };
  return colors[status];
}

/**
 * Get result color
 */
export function getCheckResultColor(result: CheckResult): string {
  const colors: Record<CheckResult, string> = {
    Clear: '#10B981',
    Consider: '#F59E0B',
    Suspended: '#EF4444',
  };
  return colors[result];
}

/**
 * Get component type display name
 */
export function getComponentTypeDisplay(type: ComponentType): string {
  const displayNames: Record<ComponentType, string> = {
    SSNTrace: 'SSN Trace',
    NationalCriminalSearch: 'National Criminal Search',
    CountyCriminalSearch: 'County Criminal Search',
    FederalCriminalSearch: 'Federal Criminal Search',
    SexOffenderSearch: 'Sex Offender Registry',
    GlobalWatchlistSearch: 'Global Watchlist',
    MotorVehicleRecords: 'Motor Vehicle Records',
    EmploymentVerification: 'Employment Verification',
    EducationVerification: 'Education Verification',
    ProfessionalLicenseVerification: 'Professional License',
    CreditCheck: 'Credit Check',
    CivilCourtSearch: 'Civil Court Records',
  };
  return displayNames[type];
}

/**
 * Get check type details
 */
export function getCheckTypeDetails(type: CheckType): {
  name: string;
  description: string;
  duration: string;
  price: number;
  components: ComponentType[];
} {
  const details: Record<
    CheckType,
    {
      name: string;
      description: string;
      duration: string;
      price: number;
      components: ComponentType[];
    }
  > = {
    Basic: {
      name: 'Basic Check',
      description: 'Essential criminal background screening',
      duration: '1-2 business days',
      price: 29.99,
      components: ['SSNTrace', 'NationalCriminalSearch', 'SexOffenderSearch'],
    },
    Standard: {
      name: 'Standard Check',
      description: 'Comprehensive criminal and driving records',
      duration: '3-5 business days',
      price: 59.99,
      components: [
        'SSNTrace',
        'NationalCriminalSearch',
        'CountyCriminalSearch',
        'SexOffenderSearch',
        'MotorVehicleRecords',
      ],
    },
    Premium: {
      name: 'Premium Check',
      description: 'Full verification including employment and education',
      duration: '5-7 business days',
      price: 99.99,
      components: [
        'SSNTrace',
        'NationalCriminalSearch',
        'CountyCriminalSearch',
        'FederalCriminalSearch',
        'SexOffenderSearch',
        'GlobalWatchlistSearch',
        'MotorVehicleRecords',
        'EmploymentVerification',
        'EducationVerification',
      ],
    },
    Custom: {
      name: 'Custom Check',
      description: 'Choose specific verification components',
      duration: 'Varies',
      price: 0,
      components: [],
    },
  };
  return details[type];
}

/**
 * Get check progress percentage
 */
export function getCheckProgress(
  components: BackgroundCheckComponent[]
): number {
  if (components.length === 0) return 0;
  const completed = components.filter((c) => c.status === 'Completed').length;
  return Math.round((completed / components.length) * 100);
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(check: BackgroundCheck): number | null {
  if (!check.expires_at) return null;
  const expiryDate = new Date(check.expires_at);
  const today = new Date();
  const diff = expiryDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Validate background check form
 */
export function validateBackgroundCheckForm(
  checkType: CheckType | '',
  consentGiven: boolean
): { valid: boolean; error?: string } {
  if (!checkType) {
    return {
      valid: false,
      error: 'Please select a background check type',
    };
  }

  if (!consentGiven) {
    return {
      valid: false,
      error: 'You must provide consent to proceed with background check',
    };
  }

  return { valid: true };
}

/**
 * Get result description
 */
export function getResultDescription(result: CheckResult): string {
  const descriptions: Record<CheckResult, string> = {
    Clear: 'No records found. You are approved to provide services.',
    Consider:
      'Some records found that require review. Your account may have limited access.',
    Suspended:
      'Records found that prevent service provision. Please contact support or file an appeal.',
  };
  return descriptions[result];
}

/**
 * Subscribe to background check updates
 */
export function subscribeToBackgroundCheckUpdates(
  checkId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel(`background-check-${checkId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'background_checks',
        filter: `id=eq.${checkId}`,
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'background_check_components',
        filter: `background_check_id=eq.${checkId}`,
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Can provider file appeal
 */
export function canFileAppeal(check: BackgroundCheck): boolean {
  return (
    check.status === 'Completed' &&
    (check.result === 'Consider' || check.result === 'Suspended')
  );
}

/**
 * Get consent disclosure text
 */
export function getConsentDisclosure(): string[] {
  return [
    'I authorize the platform to obtain consumer reports about me from a consumer reporting agency for employment purposes.',
    'I understand that if my application is approved, my consent will remain on file and the platform may obtain consumer reports about me throughout my period of service.',
    'I understand that information contained in my application, or otherwise disclosed by me before or during my service, may be used in connection with the procurement of such reports.',
    'I certify that all information I provided on this application is true and complete.',
    'I understand that any false information or omission may disqualify me from further consideration and may result in dismissal if discovered at a later date.',
  ];
}
