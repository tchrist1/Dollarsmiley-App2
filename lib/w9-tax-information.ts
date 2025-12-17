import { supabase } from './supabase';

export type TaxClassification =
  | 'individual'
  | 'c_corporation'
  | 's_corporation'
  | 'partnership'
  | 'trust_estate'
  | 'llc_c'
  | 'llc_s'
  | 'llc_partnership'
  | 'llc_disregarded'
  | 'other';

export type W9Status = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface W9TaxInformation {
  id: string;
  provider_id: string;
  tax_classification: TaxClassification;
  business_name?: string;
  federal_tax_classification?: string;
  other_classification_description?: string;
  ein?: string;
  ssn_last_4?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_exempt_from_backup_withholding: boolean;
  exemption_code?: string;
  fatca_exemption_code?: string;
  signature_data: string;
  signature_date: string;
  certification_text: string;
  ip_address: string;
  user_agent: string;
  status: W9Status;
  admin_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface W9SubmissionData {
  tax_classification: TaxClassification;
  business_name?: string;
  federal_tax_classification?: string;
  other_classification_description?: string;
  ein?: string;
  ssn_last_4?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
  is_exempt_from_backup_withholding: boolean;
  exemption_code?: string;
  fatca_exemption_code?: string;
  signature_data: string;
}

export interface W9SubmissionHistory {
  id: string;
  tax_information_id: string;
  provider_id: string;
  action: string;
  performed_by?: string;
  notes?: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Get current W-9 for provider
export async function getCurrentW9(providerId: string): Promise<W9TaxInformation | null> {
  try {
    const { data, error } = await supabase
      .from('provider_tax_information')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_current', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching current W-9:', error);
    return null;
  }
}

// Get W-9 status
export async function getW9Status(providerId: string): Promise<W9Status | 'not_submitted'> {
  try {
    const { data, error } = await supabase.rpc('get_w9_status', {
      user_id: providerId,
    });

    if (error) throw error;
    return data as W9Status | 'not_submitted';
  } catch (error) {
    console.error('Error fetching W-9 status:', error);
    return 'not_submitted';
  }
}

// Check if provider needs W-9
export async function providerNeedsW9(providerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('provider_needs_w9', {
      user_id: providerId,
    });

    if (error) throw error;
    return data as boolean;
  } catch (error) {
    console.error('Error checking W-9 requirement:', error);
    return true;
  }
}

// Submit W-9 form
export async function submitW9(
  providerId: string,
  formData: W9SubmissionData
): Promise<{ success: boolean; data?: W9TaxInformation; error?: string }> {
  try {
    // Get IP address and user agent
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent || 'Unknown';

    // Prepare certification text
    const certificationText = `Under penalties of perjury, I certify that:
1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and
2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and
3. I am a U.S. citizen or other U.S. person; and
4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.`;

    const { data, error } = await supabase
      .from('provider_tax_information')
      .insert({
        provider_id: providerId,
        ...formData,
        certification_text: certificationText,
        ip_address: ipAddress,
        user_agent: userAgent,
        signature_date: new Date().toISOString(),
        status: 'pending',
        is_current: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error submitting W-9:', error);
    return { success: false, error: error.message };
  }
}

// Update W-9 form (for pending forms only)
export async function updateW9(
  w9Id: string,
  formData: Partial<W9SubmissionData>
): Promise<{ success: boolean; data?: W9TaxInformation; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('provider_tax_information')
      .update({
        ...formData,
        signature_date: new Date().toISOString(),
      })
      .eq('id', w9Id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating W-9:', error);
    return { success: false, error: error.message };
  }
}

// Get W-9 submission history
export async function getW9History(providerId: string): Promise<W9SubmissionHistory[]> {
  try {
    const { data, error } = await supabase
      .from('w9_submission_history')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching W-9 history:', error);
    return [];
  }
}

// Admin: Get pending W-9 submissions
export async function getPendingW9Submissions(): Promise<W9TaxInformation[]> {
  try {
    const { data, error } = await supabase
      .from('provider_tax_information')
      .select(
        `
        *,
        provider:profiles!provider_tax_information_provider_id_fkey(
          id,
          full_name,
          email
        )
      `
      )
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending W-9 submissions:', error);
    return [];
  }
}

// Admin: Approve W-9
export async function approveW9(
  w9Id: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_tax_information')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes,
      })
      .eq('id', w9Id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error approving W-9:', error);
    return { success: false, error: error.message };
  }
}

// Admin: Reject W-9
export async function rejectW9(
  w9Id: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_tax_information')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: reason,
      })
      .eq('id', w9Id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting W-9:', error);
    return { success: false, error: error.message };
  }
}

// Admin: Request revision
export async function requestW9Revision(
  w9Id: string,
  adminId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_tax_information')
      .update({
        status: 'needs_revision',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: notes,
      })
      .eq('id', w9Id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error requesting W-9 revision:', error);
    return { success: false, error: error.message };
  }
}

// Get all W-9 submissions for a provider
export async function getAllW9Submissions(providerId: string): Promise<W9TaxInformation[]> {
  try {
    const { data, error } = await supabase
      .from('provider_tax_information')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all W-9 submissions:', error);
    return [];
  }
}

// Helper: Get client IP address
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'Unknown';
  } catch (error) {
    console.error('Error fetching IP:', error);
    return 'Unknown';
  }
}

// Helper: Format tax classification for display
export function formatTaxClassification(classification: TaxClassification): string {
  const labels: Record<TaxClassification, string> = {
    individual: 'Individual/Sole Proprietor',
    c_corporation: 'C Corporation',
    s_corporation: 'S Corporation',
    partnership: 'Partnership',
    trust_estate: 'Trust/Estate',
    llc_c: 'LLC (C Corp)',
    llc_s: 'LLC (S Corp)',
    llc_partnership: 'LLC (Partnership)',
    llc_disregarded: 'LLC (Disregarded Entity)',
    other: 'Other',
  };
  return labels[classification] || classification;
}

// Helper: Format status for display
export function formatW9Status(status: W9Status | 'not_submitted'): string {
  const labels: Record<W9Status | 'not_submitted', string> = {
    not_submitted: 'Not Submitted',
    pending: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    needs_revision: 'Needs Revision',
  };
  return labels[status] || status;
}

// Helper: Get status color
export function getW9StatusColor(status: W9Status | 'not_submitted'): string {
  const colors: Record<W9Status | 'not_submitted', string> = {
    not_submitted: '#6B7280',
    pending: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
    needs_revision: '#F59E0B',
  };
  return colors[status] || '#6B7280';
}

// Validate EIN format
export function validateEIN(ein: string): boolean {
  const einPattern = /^\d{2}-\d{7}$/;
  return einPattern.test(ein);
}

// Validate SSN last 4 digits
export function validateSSNLast4(ssn: string): boolean {
  const ssnPattern = /^\d{4}$/;
  return ssnPattern.test(ssn);
}

// Validate ZIP code
export function validateZipCode(zip: string): boolean {
  const zipPattern = /^\d{5}(-\d{4})?$/;
  return zipPattern.test(zip);
}

// Format EIN for display
export function formatEIN(ein: string): string {
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  }
  return ein;
}

// Check if W-9 is expired (older than 3 years)
export function isW9Expired(submittedAt: string): boolean {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  return new Date(submittedAt) < threeYearsAgo;
}

// Get W-9 requirements based on earnings
export function needsW9ForPayouts(totalEarnings: number): boolean {
  // IRS requires W-9 if payments will exceed $600 in a year
  return totalEarnings >= 600;
}
