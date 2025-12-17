import { supabase } from './supabase';

export type InsuranceType =
  | 'GeneralLiability'
  | 'ProfessionalLiability'
  | 'WorkersCompensation'
  | 'CommercialAuto'
  | 'UmbrellaPolicy';

export type InsuranceStatus = 'Active' | 'Expired' | 'Cancelled';
export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface BusinessInsurance {
  id: string;
  business_profile_id: string;
  insurance_type: InsuranceType;
  provider_name: string;
  policy_number: string;
  coverage_amount: number;
  effective_date: string;
  expiration_date: string;
  status: InsuranceStatus;
  verification_status: VerificationStatus;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateInsuranceInput {
  business_profile_id: string;
  insurance_type: InsuranceType;
  provider_name: string;
  policy_number: string;
  coverage_amount: number;
  effective_date: string;
  expiration_date: string;
  certificate_url?: string;
  notes?: string;
}

export interface UpdateInsuranceInput {
  provider_name?: string;
  policy_number?: string;
  coverage_amount?: number;
  effective_date?: string;
  expiration_date?: string;
  status?: InsuranceStatus;
  certificate_url?: string;
  notes?: string;
}

/**
 * Get all insurance policies for a business profile
 */
export async function getBusinessInsurance(
  businessProfileId: string
): Promise<BusinessInsurance[]> {
  try {
    const { data, error } = await supabase
      .from('business_insurance')
      .select('*')
      .eq('business_profile_id', businessProfileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching business insurance:', error);
    return [];
  }
}

/**
 * Get single insurance policy
 */
export async function getInsuranceById(
  insuranceId: string
): Promise<BusinessInsurance | null> {
  try {
    const { data, error } = await supabase
      .from('business_insurance')
      .select('*')
      .eq('id', insuranceId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching insurance:', error);
    return null;
  }
}

/**
 * Get active insurance policies
 */
export async function getActiveInsurance(
  businessProfileId: string
): Promise<BusinessInsurance[]> {
  try {
    const { data, error } = await supabase
      .from('business_insurance')
      .select('*')
      .eq('business_profile_id', businessProfileId)
      .eq('status', 'Active')
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active insurance:', error);
    return [];
  }
}

/**
 * Create new insurance policy
 */
export async function createInsurance(
  input: CreateInsuranceInput
): Promise<BusinessInsurance | null> {
  try {
    const { data, error } = await supabase
      .from('business_insurance')
      .insert([
        {
          business_profile_id: input.business_profile_id,
          insurance_type: input.insurance_type,
          provider_name: input.provider_name,
          policy_number: input.policy_number,
          coverage_amount: input.coverage_amount,
          effective_date: input.effective_date,
          expiration_date: input.expiration_date,
          certificate_url: input.certificate_url || null,
          notes: input.notes || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating insurance:', error);
    return null;
  }
}

/**
 * Update insurance policy
 */
export async function updateInsurance(
  insuranceId: string,
  input: UpdateInsuranceInput
): Promise<BusinessInsurance | null> {
  try {
    const { data, error } = await supabase
      .from('business_insurance')
      .update(input)
      .eq('id', insuranceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating insurance:', error);
    return null;
  }
}

/**
 * Delete insurance policy
 */
export async function deleteInsurance(insuranceId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('business_insurance')
      .delete()
      .eq('id', insuranceId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting insurance:', error);
    return false;
  }
}

/**
 * Check if insurance is expired
 */
export function isInsuranceExpired(insurance: BusinessInsurance): boolean {
  const expiryDate = new Date(insurance.expiration_date);
  const today = new Date();
  return expiryDate < today;
}

/**
 * Check if insurance is expiring soon
 */
export function isInsuranceExpiringSoon(
  insurance: BusinessInsurance,
  daysThreshold: number = 30
): boolean {
  const expiryDate = new Date(insurance.expiration_date);
  const today = new Date();
  const thresholdDate = new Date(today);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return expiryDate <= thresholdDate && expiryDate > today;
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(
  insurance: BusinessInsurance
): number | null {
  const expiryDate = new Date(insurance.expiration_date);
  const today = new Date();
  const diff = expiryDate.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get insurance type display name
 */
export function getInsuranceTypeDisplay(type: InsuranceType): string {
  const displayNames: Record<InsuranceType, string> = {
    GeneralLiability: 'General Liability',
    ProfessionalLiability: 'Professional Liability (E&O)',
    WorkersCompensation: 'Workers Compensation',
    CommercialAuto: 'Commercial Auto',
    UmbrellaPolicy: 'Umbrella Policy',
  };
  return displayNames[type];
}

/**
 * Get insurance type description
 */
export function getInsuranceTypeDescription(type: InsuranceType): string {
  const descriptions: Record<InsuranceType, string> = {
    GeneralLiability:
      'Covers bodily injury, property damage, and personal injury claims',
    ProfessionalLiability:
      'Protects against negligence claims and professional mistakes',
    WorkersCompensation:
      'Covers employee injuries and illnesses on the job',
    CommercialAuto: 'Covers vehicles used for business purposes',
    UmbrellaPolicy:
      'Provides additional liability coverage beyond primary policies',
  };
  return descriptions[type];
}

/**
 * Get all insurance types
 */
export function getInsuranceTypes(): Array<{
  value: InsuranceType;
  label: string;
  description: string;
  recommended: boolean;
}> {
  return [
    {
      value: 'GeneralLiability',
      label: 'General Liability',
      description: 'Covers bodily injury, property damage, and personal injury claims',
      recommended: true,
    },
    {
      value: 'ProfessionalLiability',
      label: 'Professional Liability (E&O)',
      description: 'Protects against negligence claims and professional mistakes',
      recommended: true,
    },
    {
      value: 'WorkersCompensation',
      label: 'Workers Compensation',
      description: 'Required if you have employees',
      recommended: false,
    },
    {
      value: 'CommercialAuto',
      label: 'Commercial Auto',
      description: 'Required if you use vehicles for business',
      recommended: false,
    },
    {
      value: 'UmbrellaPolicy',
      label: 'Umbrella Policy',
      description: 'Additional liability coverage',
      recommended: false,
    },
  ];
}

/**
 * Get minimum coverage recommendations by insurance type
 */
export function getMinimumCoverageRecommendation(
  type: InsuranceType
): number {
  const minimums: Record<InsuranceType, number> = {
    GeneralLiability: 1000000,
    ProfessionalLiability: 1000000,
    WorkersCompensation: 100000,
    CommercialAuto: 500000,
    UmbrellaPolicy: 1000000,
  };
  return minimums[type];
}

/**
 * Format coverage amount
 */
export function formatCoverageAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
}

/**
 * Get status color
 */
export function getInsuranceStatusColor(status: InsuranceStatus): string {
  const colors: Record<InsuranceStatus, string> = {
    Active: '#10B981',
    Expired: '#EF4444',
    Cancelled: '#6B7280',
  };
  return colors[status];
}

/**
 * Get verification status color
 */
export function getVerificationStatusColor(
  status: VerificationStatus
): string {
  const colors: Record<VerificationStatus, string> = {
    Pending: '#F59E0B',
    Verified: '#10B981',
    Rejected: '#EF4444',
  };
  return colors[status];
}

/**
 * Validate insurance form
 */
export function validateInsuranceForm(
  input: Partial<CreateInsuranceInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.insurance_type) {
    errors.push('Insurance type is required');
  }

  if (!input.provider_name || input.provider_name.trim().length === 0) {
    errors.push('Insurance provider name is required');
  }

  if (!input.policy_number || input.policy_number.trim().length === 0) {
    errors.push('Policy number is required');
  }

  if (!input.coverage_amount || input.coverage_amount <= 0) {
    errors.push('Coverage amount must be greater than 0');
  }

  if (input.insurance_type && input.coverage_amount) {
    const minCoverage = getMinimumCoverageRecommendation(
      input.insurance_type
    );
    if (input.coverage_amount < minCoverage) {
      errors.push(
        `Minimum recommended coverage for ${getInsuranceTypeDisplay(input.insurance_type)} is ${formatCoverageAmount(minCoverage)}`
      );
    }
  }

  if (!input.effective_date) {
    errors.push('Effective date is required');
  }

  if (!input.expiration_date) {
    errors.push('Expiration date is required');
  }

  if (input.effective_date && input.expiration_date) {
    const effective = new Date(input.effective_date);
    const expiration = new Date(input.expiration_date);
    if (expiration <= effective) {
      errors.push('Expiration date must be after effective date');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get insurance coverage summary
 */
export function getInsuranceCoverageSummary(
  policies: BusinessInsurance[]
): {
  totalCoverage: number;
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  verifiedCount: number;
  types: InsuranceType[];
} {
  const active = policies.filter((p) => p.status === 'Active');
  const expiring = active.filter((p) => isInsuranceExpiringSoon(p));
  const expired = policies.filter((p) => isInsuranceExpired(p));
  const verified = policies.filter(
    (p) => p.verification_status === 'Verified'
  );

  const totalCoverage = active.reduce(
    (sum, p) => sum + p.coverage_amount,
    0
  );

  const types = Array.from(
    new Set(active.map((p) => p.insurance_type))
  ) as InsuranceType[];

  return {
    totalCoverage,
    activeCount: active.length,
    expiringCount: expiring.length,
    expiredCount: expired.length,
    verifiedCount: verified.length,
    types,
  };
}

/**
 * Check if business has required insurance
 */
export function hasRequiredInsurance(
  policies: BusinessInsurance[]
): boolean {
  const activeVerified = policies.filter(
    (p) =>
      p.status === 'Active' &&
      p.verification_status === 'Verified' &&
      !isInsuranceExpired(p)
  );

  const hasGeneralLiability = activeVerified.some(
    (p) => p.insurance_type === 'GeneralLiability'
  );

  return hasGeneralLiability;
}

/**
 * Get missing required insurance types
 */
export function getMissingRequiredInsurance(
  policies: BusinessInsurance[]
): InsuranceType[] {
  const activeVerified = policies.filter(
    (p) =>
      p.status === 'Active' &&
      p.verification_status === 'Verified' &&
      !isInsuranceExpired(p)
  );

  const existingTypes = new Set(
    activeVerified.map((p) => p.insurance_type)
  );

  const missing: InsuranceType[] = [];

  if (!existingTypes.has('GeneralLiability')) {
    missing.push('GeneralLiability');
  }

  return missing;
}
