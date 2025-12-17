import { supabase } from './supabase';

// Income Report Types
export interface IncomeReport {
  id: string;
  provider_id: string;
  report_type: 'monthly' | 'quarterly' | 'ytd' | 'annual';
  period_start: string;
  period_end: string;
  year: number;
  quarter?: number;
  month?: number;
  gross_income: number;
  platform_fees: number;
  processing_fees: number;
  refunds_issued: number;
  adjustments: number;
  net_income: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  avg_booking_value: number;
  payouts_received: number;
  pending_balance: number;
  created_at: string;
  updated_at: string;
}

export interface IncomeReportLineItem {
  id: string;
  report_id: string;
  transaction_id?: string;
  booking_id?: string;
  item_date: string;
  item_type: string;
  description: string;
  amount: number;
  category?: string;
  created_at: string;
}

export interface IncomeSummary {
  report_type: string;
  period_label: string;
  gross_income: number;
  net_income: number;
  total_bookings: number;
}

export interface TaxDocument {
  id: string;
  provider_id: string;
  tax_year: number;
  document_type: string;
  total_earnings: number;
  total_fees: number;
  net_earnings: number;
  document_data?: any;
  generated_at: string;
  is_finalized: boolean;
  finalized_at?: string;
}

// Generate monthly income report
export async function generateMonthlyIncomeReport(
  providerId: string,
  year: number,
  month: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_monthly_income_report', {
      p_provider_id: providerId,
      p_year: year,
      p_month: month,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return null;
  }
}

// Generate quarterly income report
export async function generateQuarterlyIncomeReport(
  providerId: string,
  year: number,
  quarter: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_quarterly_income_report', {
      p_provider_id: providerId,
      p_year: year,
      p_quarter: quarter,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating quarterly report:', error);
    return null;
  }
}

// Generate YTD income report
export async function generateYTDIncomeReport(
  providerId: string,
  year: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_ytd_income_report', {
      p_provider_id: providerId,
      p_year: year,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating YTD report:', error);
    return null;
  }
}

// Get provider income summary
export async function getProviderIncomeSummary(
  providerId: string,
  year?: number
): Promise<IncomeSummary[]> {
  try {
    const { data, error } = await supabase.rpc('get_provider_income_summary', {
      p_provider_id: providerId,
      p_year: year || null,
    });

    if (error) throw error;
    return (data || []) as IncomeSummary[];
  } catch (error) {
    console.error('Error fetching income summary:', error);
    return [];
  }
}

// Get income report by ID
export async function getIncomeReport(reportId: string): Promise<IncomeReport | null> {
  try {
    const { data, error } = await supabase
      .from('provider_income_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error) throw error;
    return data as IncomeReport;
  } catch (error) {
    console.error('Error fetching income report:', error);
    return null;
  }
}

// Get income reports for provider
export async function getProviderIncomeReports(
  providerId: string,
  reportType?: string,
  year?: number
): Promise<IncomeReport[]> {
  try {
    let query = supabase
      .from('provider_income_reports')
      .select('*')
      .eq('provider_id', providerId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as IncomeReport[];
  } catch (error) {
    console.error('Error fetching income reports:', error);
    return [];
  }
}

// Get report line items
export async function getReportLineItems(reportId: string): Promise<IncomeReportLineItem[]> {
  try {
    const { data, error } = await supabase
      .from('income_report_line_items')
      .select('*')
      .eq('report_id', reportId)
      .order('item_date', { ascending: false });

    if (error) throw error;
    return (data || []) as IncomeReportLineItem[];
  } catch (error) {
    console.error('Error fetching line items:', error);
    return [];
  }
}

// Generate tax document
export async function generateTaxDocument(
  providerId: string,
  taxYear: number,
  documentType: string = '1099'
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_tax_document', {
      p_provider_id: providerId,
      p_tax_year: taxYear,
      p_document_type: documentType,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating tax document:', error);
    return null;
  }
}

// Get tax documents for provider
export async function getProviderTaxDocuments(
  providerId: string,
  taxYear?: number
): Promise<TaxDocument[]> {
  try {
    let query = supabase
      .from('tax_documents')
      .select('*')
      .eq('provider_id', providerId)
      .order('tax_year', { ascending: false });

    if (taxYear) {
      query = query.eq('tax_year', taxYear);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as TaxDocument[];
  } catch (error) {
    console.error('Error fetching tax documents:', error);
    return [];
  }
}

// Get current month report
export async function getCurrentMonthReport(
  providerId: string
): Promise<IncomeReport | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data, error } = await supabase
      .from('provider_income_reports')
      .select('*')
      .eq('provider_id', providerId)
      .eq('report_type', 'monthly')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;
    return data as IncomeReport;
  } catch (error) {
    console.error('Error fetching current month report:', error);
    return null;
  }
}

// Get current quarter report
export async function getCurrentQuarterReport(
  providerId: string
): Promise<IncomeReport | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);

    const { data, error } = await supabase
      .from('provider_income_reports')
      .select('*')
      .eq('provider_id', providerId)
      .eq('report_type', 'quarterly')
      .eq('year', year)
      .eq('quarter', quarter)
      .maybeSingle();

    if (error) throw error;
    return data as IncomeReport;
  } catch (error) {
    console.error('Error fetching current quarter report:', error);
    return null;
  }
}

// Get current YTD report
export async function getCurrentYTDReport(providerId: string): Promise<IncomeReport | null> {
  try {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from('provider_income_reports')
      .select('*')
      .eq('provider_id', providerId)
      .eq('report_type', 'ytd')
      .eq('year', year)
      .maybeSingle();

    if (error) throw error;
    return data as IncomeReport;
  } catch (error) {
    console.error('Error fetching YTD report:', error);
    return null;
  }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format period label
export function formatPeriodLabel(report: IncomeReport): string {
  if (report.report_type === 'monthly' && report.month) {
    const date = new Date(report.year, report.month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (report.report_type === 'quarterly' && report.quarter) {
    return `Q${report.quarter} ${report.year}`;
  }

  if (report.report_type === 'ytd') {
    return `YTD ${report.year}`;
  }

  return `${report.year}`;
}

// Calculate take-home percentage
export function calculateTakeHomePercentage(report: IncomeReport): number {
  if (report.gross_income === 0) return 0;
  return (report.net_income / report.gross_income) * 100;
}

// Get report comparison
export function compareReports(
  current: IncomeReport,
  previous: IncomeReport
): {
  grossChange: number;
  netChange: number;
  bookingsChange: number;
  grossPercentage: number;
  netPercentage: number;
  bookingsPercentage: number;
} {
  const grossChange = current.gross_income - previous.gross_income;
  const netChange = current.net_income - previous.net_income;
  const bookingsChange = current.total_bookings - previous.total_bookings;

  const grossPercentage =
    previous.gross_income > 0 ? (grossChange / previous.gross_income) * 100 : 0;
  const netPercentage = previous.net_income > 0 ? (netChange / previous.net_income) * 100 : 0;
  const bookingsPercentage =
    previous.total_bookings > 0 ? (bookingsChange / previous.total_bookings) * 100 : 0;

  return {
    grossChange,
    netChange,
    bookingsChange,
    grossPercentage,
    netPercentage,
    bookingsPercentage,
  };
}

// Get month name
export function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || '';
}

// Get quarter months
export function getQuarterMonths(quarter: number): string {
  const quarters: Record<number, string> = {
    1: 'Jan - Mar',
    2: 'Apr - Jun',
    3: 'Jul - Sep',
    4: 'Oct - Dec',
  };
  return quarters[quarter] || '';
}

// Export report data for download
export function exportReportToCSV(
  report: IncomeReport,
  lineItems: IncomeReportLineItem[]
): string {
  let csv = 'Income Report\n\n';
  csv += `Period,${formatPeriodLabel(report)}\n`;
  csv += `Report Type,${report.report_type.toUpperCase()}\n\n`;

  csv += 'Summary\n';
  csv += `Gross Income,${formatCurrency(report.gross_income)}\n`;
  csv += `Platform Fees,${formatCurrency(report.platform_fees)}\n`;
  csv += `Processing Fees,${formatCurrency(report.processing_fees)}\n`;
  csv += `Refunds,${formatCurrency(report.refunds_issued)}\n`;
  csv += `Net Income,${formatCurrency(report.net_income)}\n`;
  csv += `Total Bookings,${report.total_bookings}\n`;
  csv += `Completed Bookings,${report.completed_bookings}\n\n`;

  csv += 'Line Items\n';
  csv += 'Date,Type,Description,Amount,Category\n';

  lineItems.forEach((item) => {
    csv += `${item.item_date},${item.item_type},${item.description},${formatCurrency(item.amount)},${item.category || ''}\n`;
  });

  return csv;
}
