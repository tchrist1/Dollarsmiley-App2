import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export interface ExpenseReportData {
  period: {
    start: string;
    end: string;
    label: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
  };
  expenses: Array<{
    id: string;
    date: string;
    provider_name: string;
    service_name: string;
    category_name: string;
    expense_category_name?: string;
    description: string;
    amount: number;
    status: string;
    payment_method?: string;
    reference_id?: string;
    is_tax_deductible?: boolean;
    tags?: string[];
  }>;
  summary: {
    total_expenses: number;
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    refunded_amount: number;
    tax_deductible_amount: number;
    average_expense: number;
  };
  breakdown_by_category?: Array<{
    category_name: string;
    amount: number;
    percentage: number;
    booking_count: number;
  }>;
  breakdown_by_expense_category?: Array<{
    category_name: string;
    amount: number;
    percentage: number;
    booking_count: number;
    is_tax_deductible: boolean;
  }>;
  breakdown_by_month?: Array<{
    month: string;
    amount: number;
    booking_count: number;
  }>;
}

// Fetch expense report data
export async function fetchExpenseReportData(
  customerId: string,
  startDate: string,
  endDate: string
): Promise<ExpenseReportData | null> {
  try {
    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Get bookings for the period
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        provider:profiles!bookings_provider_id_fkey (full_name),
        listing:service_listings (
          title,
          category:categories (name)
        ),
        categorization:booking_expense_categorizations (
          expense_category:expense_categories (
            name,
            is_tax_deductible
          )
        ),
        tags:booking_expense_tags (
          tag:expense_tags (name)
        )
      `
      )
      .eq('customer_id', customerId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .order('booking_date', { ascending: true });

    if (bookingsError) throw bookingsError;

    // Format expenses
    const expenses = (bookings || []).map((booking: any) => ({
      id: booking.id,
      date: booking.booking_date,
      provider_name: booking.provider?.full_name || 'Unknown Provider',
      service_name: booking.listing?.title || 'Service',
      category_name: booking.listing?.category?.name || 'Other',
      expense_category_name:
        booking.categorization?.expense_category?.name || 'Uncategorized',
      description: `${booking.listing?.title} - ${booking.provider?.full_name}`,
      amount: booking.total_price || 0,
      status: booking.status,
      payment_method: booking.payment_method,
      reference_id: booking.id,
      is_tax_deductible: booking.categorization?.expense_category?.is_tax_deductible || false,
      tags: booking.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
    }));

    // Calculate totals
    const completedExpenses = expenses.filter((e) => e.status === 'Completed');
    const totalExpenses = completedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const refundedExpenses = expenses.filter((e) => e.status === 'Refunded');
    const refundedAmount = refundedExpenses.reduce((sum, e) => sum + e.amount, 0);

    const taxDeductibleAmount = completedExpenses
      .filter((e) => e.is_tax_deductible)
      .reduce((sum, e) => sum + e.amount, 0);

    const completedCount = completedExpenses.length;
    const cancelledCount = expenses.filter((e) => e.status === 'Cancelled').length;
    const avgExpense = completedCount > 0 ? totalExpenses / completedCount : 0;

    // Service category breakdown
    const categoryMap = new Map<string, { amount: number; count: number }>();
    completedExpenses.forEach((expense) => {
      const existing = categoryMap.get(expense.category_name) || { amount: 0, count: 0 };
      categoryMap.set(expense.category_name, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, data]) => ({
      category_name: name,
      amount: data.amount,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      booking_count: data.count,
    }));
    categoryBreakdown.sort((a, b) => b.amount - a.amount);

    // Expense category breakdown
    const expenseCategoryMap = new Map<
      string,
      { amount: number; count: number; is_tax_deductible: boolean }
    >();
    completedExpenses.forEach((expense) => {
      const existing = expenseCategoryMap.get(expense.expense_category_name) || {
        amount: 0,
        count: 0,
        is_tax_deductible: expense.is_tax_deductible || false,
      };
      expenseCategoryMap.set(expense.expense_category_name, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
        is_tax_deductible: expense.is_tax_deductible || false,
      });
    });

    const expenseCategoryBreakdown = Array.from(expenseCategoryMap.entries()).map(
      ([name, data]) => ({
        category_name: name,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        booking_count: data.count,
        is_tax_deductible: data.is_tax_deductible,
      })
    );
    expenseCategoryBreakdown.sort((a, b) => b.amount - a.amount);

    // Monthly breakdown
    const monthMap = new Map<string, { amount: number; count: number }>();
    completedExpenses.forEach((expense) => {
      const monthKey = new Date(expense.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      const existing = monthMap.get(monthKey) || { amount: 0, count: 0 };
      monthMap.set(monthKey, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    });

    const monthlyBreakdown = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      amount: data.amount,
      booking_count: data.count,
    }));

    return {
      period: {
        start: startDate,
        end: endDate,
        label: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      },
      customer: {
        id: customer.id,
        name: customer.full_name,
        email: customer.email,
      },
      expenses,
      summary: {
        total_expenses: totalExpenses,
        total_bookings: expenses.length,
        completed_bookings: completedCount,
        cancelled_bookings: cancelledCount,
        refunded_amount: refundedAmount,
        tax_deductible_amount: taxDeductibleAmount,
        average_expense: avgExpense,
      },
      breakdown_by_category: categoryBreakdown,
      breakdown_by_expense_category: expenseCategoryBreakdown,
      breakdown_by_month: monthlyBreakdown,
    };
  } catch (error) {
    console.error('Error fetching expense report data:', error);
    return null;
  }
}

// Generate HTML expense report
export function generateExpenseReportHTML(data: ExpenseReportData): string {
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense Report - ${data.customer.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      padding: 40px 20px;
      background: #F9FAFB;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 60px 50px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3B82F6;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    h1 {
      color: #111827;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .customer-name {
      font-size: 20px;
      color: #374151;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .period {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 4px;
    }
    .generated {
      font-size: 12px;
      color: #9CA3AF;
      margin-top: 8px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: #F9FAFB;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3B82F6;
    }
    .summary-card.primary { border-left-color: #3B82F6; }
    .summary-card.success { border-left-color: #10B981; }
    .summary-card.warning { border-left-color: #F59E0B; }
    .summary-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6B7280;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    .expense-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .expense-table thead {
      background: #F9FAFB;
      border-bottom: 2px solid #E5E7EB;
    }
    .expense-table th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #6B7280;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .expense-table td {
      padding: 12px 8px;
      border-bottom: 1px solid #F3F4F6;
    }
    .expense-table th:last-child,
    .expense-table td:last-child {
      text-align: right;
    }
    .expense-table tbody tr:hover {
      background: #F9FAFB;
    }
    .amount {
      font-weight: 600;
      color: #111827;
    }
    .status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status.completed { background: #D1FAE5; color: #065F46; }
    .status.cancelled { background: #FEE2E2; color: #991B1B; }
    .status.refunded { background: #FEF3C7; color: #92400E; }
    .tax-deductible {
      display: inline-block;
      padding: 2px 6px;
      background: #D1FAE5;
      color: #065F46;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 6px;
    }
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .breakdown-table th {
      background: #F9FAFB;
      padding: 10px 8px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E5E7EB;
    }
    .breakdown-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #F3F4F6;
    }
    .breakdown-table th:last-child,
    .breakdown-table td:last-child {
      text-align: right;
    }
    .chart-bar {
      height: 8px;
      background: linear-gradient(to right, #3B82F6, #60A5FA);
      border-radius: 4px;
      margin-top: 4px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    .disclaimer {
      margin-top: 40px;
      padding: 16px;
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 4px;
      font-size: 12px;
      color: #92400E;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; }
      .expense-table tbody tr:hover { background: transparent; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Expense Report</h1>
      <div class="customer-name">${data.customer.name}</div>
      <div class="period">Period: ${data.period.label}</div>
      <div class="generated">Generated on ${generatedDate}</div>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="summary-card primary">
        <div class="summary-label">Total Expenses</div>
        <div class="summary-value">${formatCurrency(data.summary.total_expenses)}</div>
      </div>
      <div class="summary-card success">
        <div class="summary-label">Tax Deductible</div>
        <div class="summary-value">${formatCurrency(data.summary.tax_deductible_amount)}</div>
      </div>
      <div class="summary-card warning">
        <div class="summary-label">Total Bookings</div>
        <div class="summary-value">${data.summary.completed_bookings}</div>
      </div>
    </div>

    <!-- Expense Details -->
    <div class="section">
      <div class="section-title">Expense Details</div>
      <table class="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Service</th>
            <th>Provider</th>
            <th>Category</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.expenses
            .filter((e) => e.status === 'Completed')
            .map(
              (expense) => `
            <tr>
              <td>${formatDate(expense.date)}</td>
              <td>
                ${expense.service_name}
                ${expense.is_tax_deductible ? '<span class="tax-deductible">Tax Deductible</span>' : ''}
              </td>
              <td>${expense.provider_name}</td>
              <td>${expense.expense_category_name}</td>
              <td><span class="status ${expense.status.toLowerCase()}">${expense.status}</span></td>
              <td class="amount">${formatCurrency(expense.amount)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Breakdown by Expense Category -->
    ${
      data.breakdown_by_expense_category && data.breakdown_by_expense_category.length > 0
        ? `
    <div class="section">
      <div class="section-title">Expenses by Category</div>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Bookings</th>
            <th>Percentage</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.breakdown_by_expense_category
            .map(
              (item) => `
            <tr>
              <td>
                ${item.category_name}
                ${item.is_tax_deductible ? '<span class="tax-deductible">Tax Ded.</span>' : ''}
              </td>
              <td>${item.booking_count}</td>
              <td>
                ${item.percentage.toFixed(1)}%
                <div class="chart-bar" style="width: ${item.percentage}%;"></div>
              </td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- Service Category Breakdown -->
    ${
      data.breakdown_by_category && data.breakdown_by_category.length > 0
        ? `
    <div class="section">
      <div class="section-title">Expenses by Service Type</div>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Service Type</th>
            <th>Bookings</th>
            <th>Percentage</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.breakdown_by_category
            .map(
              (item) => `
            <tr>
              <td>${item.category_name}</td>
              <td>${item.booking_count}</td>
              <td>
                ${item.percentage.toFixed(1)}%
                <div class="chart-bar" style="width: ${item.percentage}%;"></div>
              </td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- Monthly Breakdown -->
    ${
      data.breakdown_by_month && data.breakdown_by_month.length > 1
        ? `
    <div class="section">
      <div class="section-title">Monthly Breakdown</div>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Bookings</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.breakdown_by_month
            .map(
              (item) => `
            <tr>
              <td>${item.month}</td>
              <td>${item.booking_count}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : ''
    }

    <!-- Summary Section -->
    <div class="section">
      <div class="section-title">Report Summary</div>
      <table class="breakdown-table">
        <tbody>
          <tr>
            <td><strong>Total Bookings</strong></td>
            <td style="text-align: right;">${data.summary.total_bookings}</td>
          </tr>
          <tr>
            <td><strong>Completed Bookings</strong></td>
            <td style="text-align: right;">${data.summary.completed_bookings}</td>
          </tr>
          <tr>
            <td><strong>Cancelled Bookings</strong></td>
            <td style="text-align: right;">${data.summary.cancelled_bookings}</td>
          </tr>
          <tr>
            <td><strong>Average Expense</strong></td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(data.summary.average_expense)}</td>
          </tr>
          ${
            data.summary.refunded_amount > 0
              ? `
          <tr>
            <td><strong>Refunded Amount</strong></td>
            <td style="text-align: right; color: #F59E0B; font-weight: 600;">${formatCurrency(data.summary.refunded_amount)}</td>
          </tr>
          `
              : ''
          }
          <tr style="border-top: 2px solid #111827;">
            <td><strong>Total Expenses</strong></td>
            <td style="text-align: right; font-size: 18px; font-weight: 700; color: #111827;">
              ${formatCurrency(data.summary.total_expenses)}
            </td>
          </tr>
          <tr style="background: #D1FAE5;">
            <td><strong>Tax Deductible Amount</strong></td>
            <td style="text-align: right; font-weight: 700; color: #065F46;">
              ${formatCurrency(data.summary.tax_deductible_amount)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer">
      <strong>Important:</strong> This expense report is generated for informational and record-keeping purposes.
      Please consult with a qualified tax professional or accountant to verify tax-deductible expenses and
      proper documentation requirements for your jurisdiction.
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This document was automatically generated and is for reference only.</p>
      <p>Customer ID: ${data.customer.id}</p>
    </div>
  </div>
</body>
</html>
`;
}

// Save and share expense report
export async function saveAndShareExpenseReport(data: ExpenseReportData): Promise<void> {
  try {
    const html = generateExpenseReportHTML(data);

    const startDate = new Date(data.period.start).toISOString().split('T')[0];
    const endDate = new Date(data.period.end).toISOString().split('T')[0];
    const fileName = `expense_report_${startDate}_to_${endDate}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, html);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Expense Report',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error saving and sharing expense report:', error);
    throw error;
  }
}

// Generate expense report
export async function generateExpenseReport(
  customerId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const data = await fetchExpenseReportData(customerId, startDate, endDate);

  if (!data) {
    throw new Error('Failed to fetch expense report data');
  }

  await saveAndShareExpenseReport(data);
}

// Helper: Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper: Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get predefined date ranges (same as income statement)
export function getDateRanges(): Array<{
  label: string;
  start: string;
  end: string;
}> {
  const now = new Date();
  const ranges = [];

  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  ranges.push({
    label: 'This Month',
    start: currentMonthStart.toISOString().split('T')[0],
    end: currentMonthEnd.toISOString().split('T')[0],
  });

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  ranges.push({
    label: 'Last Month',
    start: lastMonthStart.toISOString().split('T')[0],
    end: lastMonthEnd.toISOString().split('T')[0],
  });

  // Current quarter
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
  ranges.push({
    label: 'This Quarter',
    start: quarterStart.toISOString().split('T')[0],
    end: quarterEnd.toISOString().split('T')[0],
  });

  // Year to date
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  ranges.push({
    label: 'Year to Date',
    start: ytdStart.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  });

  // Last year
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
  ranges.push({
    label: 'Last Year',
    start: lastYearStart.toISOString().split('T')[0],
    end: lastYearEnd.toISOString().split('T')[0],
  });

  return ranges;
}
