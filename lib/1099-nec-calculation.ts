import { supabase } from './supabase';
import { getCurrentW9 } from './w9-tax-information';

export interface Payment1099Data {
  id: string;
  transaction_id: string;
  provider_id: string;
  customer_id: string;
  booking_id?: string;
  amount: number;
  transaction_type: string;
  payment_date: string;
  description: string;
  is_refunded: boolean;
  metadata: Record<string, any>;
}

export interface Provider1099Summary {
  provider_id: string;
  tax_year: number;
  provider_name: string;
  provider_email: string;
  business_name?: string;
  tax_classification: string;
  ein?: string;
  ssn_last_4?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;

  // Box 1: Nonemployee compensation
  nonemployee_compensation: number;

  // Breakdown
  service_payments: number;
  tips_received: number;
  bonuses: number;
  other_income: number;

  // Deductions
  refunds_issued: number;
  platform_fees: number;

  // Summary
  total_gross_payments: number;
  total_deductions: number;
  net_reportable_income: number;

  // Transaction details
  payment_count: number;
  first_payment_date: string;
  last_payment_date: string;

  // Status
  meets_threshold: boolean; // $600 or more
  has_w9_on_file: boolean;
  w9_status: string;
  is_ready_for_filing: boolean;

  // Metadata
  calculated_at: string;
}

export interface Tax1099Report {
  tax_year: number;
  total_providers: number;
  providers_meeting_threshold: number;
  providers_with_w9: number;
  providers_ready_for_filing: number;
  total_reportable_amount: number;
  total_payments_made: number;
  providers: Provider1099Summary[];
}

// Calculate 1099-NEC for a single provider
export async function calculate1099ForProvider(
  providerId: string,
  taxYear: number
): Promise<Provider1099Summary | null> {
  try {
    // Get provider info and W-9
    const { data: provider, error: providerError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', providerId)
      .single();

    if (providerError) throw providerError;

    const w9 = await getCurrentW9(providerId);

    // Get date range for tax year
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear}-12-31`;

    // Get all completed bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, total_price, booking_date, status')
      .eq('provider_id', providerId)
      .eq('status', 'Completed')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (bookingsError) throw bookingsError;

    // Get all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('provider_id', providerId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (transactionsError) throw transactionsError;

    // Calculate service payments from completed bookings
    const servicePayments = (bookings || []).reduce(
      (sum, booking) => sum + (booking.total_price || 0),
      0
    );

    // Calculate tips received
    const tipsReceived =
      transactions
        ?.filter((t) => t.transaction_type === 'Tip')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calculate bonuses and other income
    const bonuses =
      transactions
        ?.filter((t) => t.transaction_type === 'Bonus')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

    const otherIncome =
      transactions
        ?.filter(
          (t) =>
            t.transaction_type === 'Adjustment' &&
            t.amount > 0 &&
            !['Tip', 'Bonus'].includes(t.transaction_type)
        )
        .reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calculate deductions
    const refundsIssued =
      transactions
        ?.filter((t) => t.transaction_type === 'Refund')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    const platformFees =
      transactions
        ?.filter((t) => t.transaction_type === 'Fee')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    // Calculate totals
    const totalGrossPayments = servicePayments + tipsReceived + bonuses + otherIncome;
    const totalDeductions = refundsIssued + platformFees;

    // For 1099-NEC, we report gross payments (before platform fees)
    // Platform fees are NOT deducted on the 1099-NEC form
    const nonemployeeCompensation = servicePayments + tipsReceived + bonuses + otherIncome;
    const netReportableIncome = totalGrossPayments - totalDeductions;

    // Get payment dates
    const allDates = [
      ...(bookings || []).map((b) => b.booking_date),
      ...(transactions || []).map((t) => t.created_at),
    ].sort();

    const firstPaymentDate = allDates[0] || startDate;
    const lastPaymentDate = allDates[allDates.length - 1] || endDate;

    // Check thresholds
    const meetsThreshold = nonemployeeCompensation >= 600;
    const hasW9 = w9 !== null && w9.status === 'approved';
    const isReadyForFiling = meetsThreshold && hasW9;

    return {
      provider_id: providerId,
      tax_year: taxYear,
      provider_name: provider.full_name,
      provider_email: provider.email,
      business_name: w9?.business_name,
      tax_classification: w9?.tax_classification || 'unknown',
      ein: w9?.ein,
      ssn_last_4: w9?.ssn_last_4,
      address_line_1: w9?.address_line_1 || '',
      address_line_2: w9?.address_line_2,
      city: w9?.city || '',
      state: w9?.state || '',
      zip_code: w9?.zip_code || '',
      nonemployee_compensation: nonemployeeCompensation,
      service_payments: servicePayments,
      tips_received: tipsReceived,
      bonuses,
      other_income: otherIncome,
      refunds_issued: refundsIssued,
      platform_fees: platformFees,
      total_gross_payments: totalGrossPayments,
      total_deductions: totalDeductions,
      net_reportable_income: netReportableIncome,
      payment_count: (bookings?.length || 0) + (transactions?.length || 0),
      first_payment_date: firstPaymentDate,
      last_payment_date: lastPaymentDate,
      meets_threshold: meetsThreshold,
      has_w9_on_file: hasW9,
      w9_status: w9?.status || 'not_submitted',
      is_ready_for_filing: isReadyForFiling,
      calculated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error calculating 1099 for provider:', error);
    return null;
  }
}

// Calculate 1099-NEC for all providers
export async function calculateAll1099sForYear(
  taxYear: number
): Promise<Tax1099Report> {
  try {
    // Get all providers who received payments
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear}-12-31`;

    // Get unique providers from bookings
    const { data: bookingProviders, error: bookingsError } = await supabase
      .from('bookings')
      .select('provider_id')
      .eq('status', 'Completed')
      .gte('booking_date', startDate)
      .lte('booking_date', endDate);

    if (bookingsError) throw bookingsError;

    // Get unique providers from transactions
    const { data: transactionProviders, error: transactionsError } = await supabase
      .from('transactions')
      .select('provider_id')
      .not('provider_id', 'is', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (transactionsError) throw transactionsError;

    // Combine and deduplicate provider IDs
    const providerIds = Array.from(
      new Set([
        ...(bookingProviders || []).map((b) => b.provider_id),
        ...(transactionProviders || []).map((t) => t.provider_id),
      ])
    ).filter(Boolean);

    // Calculate 1099 for each provider
    const providers: Provider1099Summary[] = [];
    for (const providerId of providerIds) {
      const summary = await calculate1099ForProvider(providerId, taxYear);
      if (summary) {
        providers.push(summary);
      }
    }

    // Calculate totals
    const totalProviders = providers.length;
    const providersMeetingThreshold = providers.filter((p) => p.meets_threshold).length;
    const providersWithW9 = providers.filter((p) => p.has_w9_on_file).length;
    const providersReadyForFiling = providers.filter((p) => p.is_ready_for_filing).length;
    const totalReportableAmount = providers
      .filter((p) => p.meets_threshold)
      .reduce((sum, p) => sum + p.nonemployee_compensation, 0);
    const totalPaymentsMade = providers.reduce(
      (sum, p) => sum + p.total_gross_payments,
      0
    );

    return {
      tax_year: taxYear,
      total_providers: totalProviders,
      providers_meeting_threshold: providersMeetingThreshold,
      providers_with_w9: providersWithW9,
      providers_ready_for_filing: providersReadyForFiling,
      total_reportable_amount: totalReportableAmount,
      total_payments_made: totalPaymentsMade,
      providers: providers.sort((a, b) => b.nonemployee_compensation - a.nonemployee_compensation),
    };
  } catch (error) {
    console.error('Error calculating all 1099s:', error);
    return {
      tax_year: taxYear,
      total_providers: 0,
      providers_meeting_threshold: 0,
      providers_with_w9: 0,
      providers_ready_for_filing: 0,
      total_reportable_amount: 0,
      total_payments_made: 0,
      providers: [],
    };
  }
}

// Get providers who need W-9 for upcoming filing
export async function getProvidersNeedingW9(taxYear: number): Promise<Provider1099Summary[]> {
  const report = await calculateAll1099sForYear(taxYear);
  return report.providers.filter((p) => p.meets_threshold && !p.has_w9_on_file);
}

// Get providers ready for 1099 filing
export async function getProvidersReadyForFiling(taxYear: number): Promise<Provider1099Summary[]> {
  const report = await calculateAll1099sForYear(taxYear);
  return report.providers.filter((p) => p.is_ready_for_filing);
}

// Generate 1099-NEC data in standardized format
export async function generate1099NECData(
  providerId: string,
  taxYear: number
): Promise<{
  form: string;
  taxYear: number;
  payer: {
    name: string;
    ein: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  recipient: {
    name: string;
    tin: string;
    tinType: 'EIN' | 'SSN';
    address: string;
    city: string;
    state: string;
    zip: string;
    accountNumber?: string;
  };
  box1_nonemployee_compensation: number;
  box4_federal_income_tax_withheld: number;
  box5_state_tax_withheld: number;
  box6_state: string;
  box7_state_income: number;
} | null> {
  try {
    const summary = await calculate1099ForProvider(providerId, taxYear);
    if (!summary || !summary.is_ready_for_filing) {
      return null;
    }

    // Payer information (your business)
    // This would come from your business settings
    const payerInfo = {
      name: 'Your Business Name', // TODO: Get from settings
      ein: 'XX-XXXXXXX', // TODO: Get from settings
      address: '123 Business St', // TODO: Get from settings
      city: 'Business City', // TODO: Get from settings
      state: 'CA', // TODO: Get from settings
      zip: '12345', // TODO: Get from settings
    };

    return {
      form: '1099-NEC',
      taxYear,
      payer: payerInfo,
      recipient: {
        name: summary.business_name || summary.provider_name,
        tin: summary.ein || `***-**-${summary.ssn_last_4}`,
        tinType: summary.ein ? 'EIN' : 'SSN',
        address: summary.address_line_1,
        city: summary.city,
        state: summary.state,
        zip: summary.zip_code,
        accountNumber: summary.provider_id,
      },
      box1_nonemployee_compensation: summary.nonemployee_compensation,
      box4_federal_income_tax_withheld: 0, // Not implemented
      box5_state_tax_withheld: 0, // Not implemented
      box6_state: '', // Not implemented
      box7_state_income: 0, // Not implemented
    };
  } catch (error) {
    console.error('Error generating 1099-NEC data:', error);
    return null;
  }
}

// Export 1099 data to CSV for all providers
export async function export1099DataToCSV(taxYear: number): Promise<string> {
  const report = await calculateAll1099sForYear(taxYear);

  const headers = [
    'Provider ID',
    'Provider Name',
    'Business Name',
    'Tax Classification',
    'EIN',
    'SSN Last 4',
    'Address',
    'City',
    'State',
    'ZIP',
    'Nonemployee Compensation (Box 1)',
    'Service Payments',
    'Tips',
    'Bonuses',
    'Other Income',
    'Total Gross',
    'Payment Count',
    'First Payment',
    'Last Payment',
    'Meets Threshold',
    'Has W-9',
    'W-9 Status',
    'Ready for Filing',
  ];

  const rows = report.providers
    .filter((p) => p.meets_threshold)
    .map((p) => [
      p.provider_id,
      p.provider_name,
      p.business_name || '',
      p.tax_classification,
      p.ein || '',
      p.ssn_last_4 || '',
      p.address_line_1,
      p.city,
      p.state,
      p.zip_code,
      p.nonemployee_compensation.toFixed(2),
      p.service_payments.toFixed(2),
      p.tips_received.toFixed(2),
      p.bonuses.toFixed(2),
      p.other_income.toFixed(2),
      p.total_gross_payments.toFixed(2),
      p.payment_count,
      p.first_payment_date,
      p.last_payment_date,
      p.meets_threshold ? 'Yes' : 'No',
      p.has_w9_on_file ? 'Yes' : 'No',
      p.w9_status,
      p.is_ready_for_filing ? 'Yes' : 'No',
    ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}

// Helper: Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper: Get current tax year
export function getCurrentTaxYear(): number {
  const now = new Date();
  // If it's January, might still be working on previous year
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

// Helper: Get available tax years
export function getAvailableTaxYears(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
}

// Helper: Check if filing deadline has passed
export function hasFilingDeadlinePassed(taxYear: number): boolean {
  const deadline = new Date(taxYear + 1, 0, 31); // January 31 of following year
  return new Date() > deadline;
}

// Helper: Get filing deadline
export function getFilingDeadline(taxYear: number): Date {
  return new Date(taxYear + 1, 0, 31); // January 31 of following year
}

// Helper: Get days until filing deadline
export function getDaysUntilDeadline(taxYear: number): number {
  const deadline = getFilingDeadline(taxYear);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Validate 1099 data is complete
export function validate1099Data(summary: Provider1099Summary): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!summary.has_w9_on_file) {
    errors.push('No W-9 on file');
  }

  if (!summary.meets_threshold) {
    errors.push('Does not meet $600 threshold');
  }

  if (!summary.ein && !summary.ssn_last_4) {
    errors.push('Missing tax identification number');
  }

  if (!summary.address_line_1 || !summary.city || !summary.state || !summary.zip_code) {
    errors.push('Incomplete address information');
  }

  if (summary.nonemployee_compensation <= 0) {
    errors.push('No reportable compensation');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Get 1099 filing checklist
export function get1099FilingChecklist(report: Tax1099Report): Array<{
  item: string;
  completed: boolean;
  details?: string;
}> {
  return [
    {
      item: 'Identify providers meeting $600 threshold',
      completed: report.providers_meeting_threshold > 0,
      details: `${report.providers_meeting_threshold} of ${report.total_providers} providers`,
    },
    {
      item: 'Collect W-9 forms from all eligible providers',
      completed: report.providers_with_w9 === report.providers_meeting_threshold,
      details: `${report.providers_with_w9} of ${report.providers_meeting_threshold} have W-9`,
    },
    {
      item: 'Calculate nonemployee compensation',
      completed: true,
      details: `Total: ${formatCurrency(report.total_reportable_amount)}`,
    },
    {
      item: 'Verify provider information',
      completed: report.providers_ready_for_filing === report.providers_meeting_threshold,
      details: `${report.providers_ready_for_filing} of ${report.providers_meeting_threshold} ready`,
    },
    {
      item: 'File forms by January 31 deadline',
      completed: false,
      details: `${getDaysUntilDeadline(report.tax_year)} days remaining`,
    },
  ];
}
