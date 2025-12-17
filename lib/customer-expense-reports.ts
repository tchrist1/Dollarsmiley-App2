import { supabase } from './supabase';

// Customer Expense Report Types
export interface CustomerExpenseReport {
  id: string;
  customer_id: string;
  report_type: 'monthly' | 'quarterly' | 'ytd' | 'annual';
  period_start: string;
  period_end: string;
  year: number;
  quarter?: number;
  month?: number;
  total_spent: number;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  refunds_received: number;
  avg_booking_cost: number;
  deposits_paid: number;
  balance_payments: number;
  tax_deductible_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseLineItem {
  id: string;
  report_id: string;
  transaction_id?: string;
  booking_id?: string;
  item_date: string;
  item_type: string;
  description: string;
  amount: number;
  category?: string;
  provider_name?: string;
  is_tax_deductible: boolean;
  created_at: string;
}

export interface SpendingCategory {
  category_name: string;
  total_spent: number;
  booking_count: number;
  percentage: number;
}

export interface ExpenseSummary {
  report_type: string;
  period_label: string;
  total_spent: number;
  total_bookings: number;
  avg_booking_cost: number;
}

// Generate monthly expense report
export async function generateMonthlyExpenseReport(
  customerId: string,
  year: number,
  month: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_monthly_expense_report', {
      p_customer_id: customerId,
      p_year: year,
      p_month: month,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating monthly expense report:', error);
    return null;
  }
}

// Generate quarterly expense report
export async function generateQuarterlyExpenseReport(
  customerId: string,
  year: number,
  quarter: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_quarterly_expense_report', {
      p_customer_id: customerId,
      p_year: year,
      p_quarter: quarter,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating quarterly expense report:', error);
    return null;
  }
}

// Generate YTD expense report
export async function generateYTDExpenseReport(
  customerId: string,
  year: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_ytd_expense_report', {
      p_customer_id: customerId,
      p_year: year,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating YTD expense report:', error);
    return null;
  }
}

// Get customer expense summary
export async function getCustomerExpenseSummary(
  customerId: string,
  year?: number
): Promise<ExpenseSummary[]> {
  try {
    const { data, error } = await supabase.rpc('get_customer_expense_summary', {
      p_customer_id: customerId,
      p_year: year || null,
    });

    if (error) throw error;
    return (data || []) as ExpenseSummary[];
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    return [];
  }
}

// Get expense report by ID
export async function getExpenseReport(reportId: string): Promise<CustomerExpenseReport | null> {
  try {
    const { data, error } = await supabase
      .from('customer_expense_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (error) throw error;
    return data as CustomerExpenseReport;
  } catch (error) {
    console.error('Error fetching expense report:', error);
    return null;
  }
}

// Get expense reports for customer
export async function getCustomerExpenseReports(
  customerId: string,
  reportType?: string,
  year?: number
): Promise<CustomerExpenseReport[]> {
  try {
    let query = supabase
      .from('customer_expense_reports')
      .select('*')
      .eq('customer_id', customerId)
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
    return (data || []) as CustomerExpenseReport[];
  } catch (error) {
    console.error('Error fetching expense reports:', error);
    return [];
  }
}

// Get expense line items
export async function getExpenseLineItems(reportId: string): Promise<ExpenseLineItem[]> {
  try {
    const { data, error } = await supabase
      .from('expense_report_line_items')
      .select('*')
      .eq('report_id', reportId)
      .order('item_date', { ascending: false });

    if (error) throw error;
    return (data || []) as ExpenseLineItem[];
  } catch (error) {
    console.error('Error fetching expense line items:', error);
    return [];
  }
}

// Get spending by category
export async function getSpendingByCategory(
  customerId: string,
  year?: number
): Promise<SpendingCategory[]> {
  try {
    const { data, error } = await supabase.rpc('get_customer_spending_by_category', {
      p_customer_id: customerId,
      p_year: year || null,
    });

    if (error) throw error;
    return (data || []) as SpendingCategory[];
  } catch (error) {
    console.error('Error fetching spending by category:', error);
    return [];
  }
}

// Get current month report
export async function getCurrentMonthExpenseReport(
  customerId: string
): Promise<CustomerExpenseReport | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data, error } = await supabase
      .from('customer_expense_reports')
      .select('*')
      .eq('customer_id', customerId)
      .eq('report_type', 'monthly')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error) throw error;
    return data as CustomerExpenseReport;
  } catch (error) {
    console.error('Error fetching current month expense report:', error);
    return null;
  }
}

// Get current quarter report
export async function getCurrentQuarterExpenseReport(
  customerId: string
): Promise<CustomerExpenseReport | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);

    const { data, error } = await supabase
      .from('customer_expense_reports')
      .select('*')
      .eq('customer_id', customerId)
      .eq('report_type', 'quarterly')
      .eq('year', year)
      .eq('quarter', quarter)
      .maybeSingle();

    if (error) throw error;
    return data as CustomerExpenseReport;
  } catch (error) {
    console.error('Error fetching current quarter expense report:', error);
    return null;
  }
}

// Get current YTD report
export async function getCurrentYTDExpenseReport(
  customerId: string
): Promise<CustomerExpenseReport | null> {
  try {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from('customer_expense_reports')
      .select('*')
      .eq('customer_id', customerId)
      .eq('report_type', 'ytd')
      .eq('year', year)
      .maybeSingle();

    if (error) throw error;
    return data as CustomerExpenseReport;
  } catch (error) {
    console.error('Error fetching YTD expense report:', error);
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
export function formatExpensePeriodLabel(report: CustomerExpenseReport): string {
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

// Calculate savings from refunds
export function calculateSavingsPercentage(report: CustomerExpenseReport): number {
  if (report.total_spent === 0) return 0;
  return (report.refunds_received / (report.total_spent + report.refunds_received)) * 100;
}

// Get report comparison
export function compareExpenseReports(
  current: CustomerExpenseReport,
  previous: CustomerExpenseReport
): {
  spendingChange: number;
  bookingsChange: number;
  avgCostChange: number;
  spendingPercentage: number;
  bookingsPercentage: number;
  avgCostPercentage: number;
} {
  const spendingChange = current.total_spent - previous.total_spent;
  const bookingsChange = current.total_bookings - previous.total_bookings;
  const avgCostChange = current.avg_booking_cost - previous.avg_booking_cost;

  const spendingPercentage =
    previous.total_spent > 0 ? (spendingChange / previous.total_spent) * 100 : 0;
  const bookingsPercentage =
    previous.total_bookings > 0 ? (bookingsChange / previous.total_bookings) * 100 : 0;
  const avgCostPercentage =
    previous.avg_booking_cost > 0 ? (avgCostChange / previous.avg_booking_cost) * 100 : 0;

  return {
    spendingChange,
    bookingsChange,
    avgCostChange,
    spendingPercentage,
    bookingsPercentage,
    avgCostPercentage,
  };
}

// Export expense report to CSV
export function exportExpenseReportToCSV(
  report: CustomerExpenseReport,
  lineItems: ExpenseLineItem[]
): string {
  let csv = 'Expense Report\n\n';
  csv += `Period,${formatExpensePeriodLabel(report)}\n`;
  csv += `Report Type,${report.report_type.toUpperCase()}\n\n`;

  csv += 'Summary\n';
  csv += `Total Spent,${formatCurrency(report.total_spent)}\n`;
  csv += `Total Bookings,${report.total_bookings}\n`;
  csv += `Completed Bookings,${report.completed_bookings}\n`;
  csv += `Average Booking Cost,${formatCurrency(report.avg_booking_cost)}\n`;
  csv += `Refunds Received,${formatCurrency(report.refunds_received)}\n`;
  csv += `Deposits Paid,${formatCurrency(report.deposits_paid)}\n`;
  csv += `Balance Payments,${formatCurrency(report.balance_payments)}\n\n`;

  csv += 'Expense Details\n';
  csv += 'Date,Type,Description,Amount,Category,Provider\n';

  lineItems.forEach((item) => {
    csv += `${item.item_date},${item.item_type},${item.description},${formatCurrency(item.amount)},${item.category || ''},${item.provider_name || ''}\n`;
  });

  return csv;
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

// Calculate completion rate
export function calculateCompletionRate(report: CustomerExpenseReport): number {
  if (report.total_bookings === 0) return 0;
  return (report.completed_bookings / report.total_bookings) * 100;
}

// Get spending trend
export function getSpendingTrend(reports: CustomerExpenseReport[]): 'up' | 'down' | 'stable' {
  if (reports.length < 2) return 'stable';

  const latest = reports[0].total_spent;
  const previous = reports[1].total_spent;
  const diff = latest - previous;
  const threshold = previous * 0.05; // 5% threshold

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}
