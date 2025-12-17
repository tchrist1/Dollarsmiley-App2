import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

export interface IncomeStatementData {
  period: {
    start: string;
    end: string;
    label: string;
  };
  provider: {
    id: string;
    name: string;
    email: string;
  };
  revenue: {
    gross_earnings: number;
    service_revenue: number;
    tips: number;
    other_income: number;
    total_revenue: number;
  };
  expenses: {
    platform_fees: number;
    payment_processing_fees: number;
    refunds: number;
    chargebacks: number;
    other_expenses: number;
    total_expenses: number;
  };
  summary: {
    net_income: number;
    gross_margin: number;
    net_margin: number;
    transaction_count: number;
    completed_bookings: number;
    cancelled_bookings: number;
    average_transaction: number;
  };
  breakdown_by_category?: Array<{
    category_name: string;
    revenue: number;
    percentage: number;
    booking_count: number;
  }>;
}

// Fetch income statement data
export async function fetchIncomeStatementData(
  providerId: string,
  startDate: string,
  endDate: string
): Promise<IncomeStatementData | null> {
  try {
    // Get provider info
    const { data: provider, error: providerError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', providerId)
      .single();

    if (providerError) throw providerError;

    // Get bookings for the period
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        `
        *,
        listing:service_listings (
          category:categories (name)
        )
      `
      )
      .eq('provider_id', providerId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (bookingsError) throw bookingsError;

    // Get transactions for the period
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', providerId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (transactionsError) throw transactionsError;

    // Calculate revenue
    const completedBookings = bookings?.filter((b) => b.status === 'Completed') || [];
    const serviceRevenue = completedBookings.reduce(
      (sum, b) => sum + (b.total_price || 0),
      0
    );

    const tips =
      transactions
        ?.filter((t) => t.type === 'Earning' && t.description?.toLowerCase().includes('tip'))
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const otherIncome =
      transactions
        ?.filter((t) => t.type === 'Earning' && !t.booking_id)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const totalRevenue = serviceRevenue + tips + otherIncome;

    // Calculate expenses
    const platformFees =
      transactions
        ?.filter((t) => t.type === 'Fee')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

    const paymentProcessingFees =
      transactions
        ?.filter((t) => t.type === 'Fee' && t.description?.toLowerCase().includes('processing'))
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

    const refunds = bookings?.filter((b) => b.status === 'Refunded').length || 0;
    const refundAmount =
      bookings
        ?.filter((b) => b.status === 'Refunded')
        .reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

    const totalExpenses = platformFees + paymentProcessingFees + refundAmount;

    // Calculate summary
    const netIncome = totalRevenue - totalExpenses;
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    const completedCount = completedBookings.length;
    const cancelledCount = bookings?.filter((b) => b.status === 'Cancelled').length || 0;
    const avgTransaction = completedCount > 0 ? serviceRevenue / completedCount : 0;

    // Category breakdown
    const categoryMap = new Map<string, { revenue: number; count: number }>();

    completedBookings.forEach((booking) => {
      const categoryName = booking.listing?.category?.name || 'Other';
      const existing = categoryMap.get(categoryName) || { revenue: 0, count: 0 };
      categoryMap.set(categoryName, {
        revenue: existing.revenue + (booking.total_price || 0),
        count: existing.count + 1,
      });
    });

    const breakdown = Array.from(categoryMap.entries()).map(([name, data]) => ({
      category_name: name,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      booking_count: data.count,
    }));

    breakdown.sort((a, b) => b.revenue - a.revenue);

    return {
      period: {
        start: startDate,
        end: endDate,
        label: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      },
      provider: {
        id: provider.id,
        name: provider.full_name,
        email: provider.email,
      },
      revenue: {
        gross_earnings: serviceRevenue,
        service_revenue: serviceRevenue,
        tips,
        other_income: otherIncome,
        total_revenue: totalRevenue,
      },
      expenses: {
        platform_fees: platformFees,
        payment_processing_fees: paymentProcessingFees,
        refunds: refundAmount,
        chargebacks: 0,
        other_expenses: 0,
        total_expenses: totalExpenses,
      },
      summary: {
        net_income: netIncome,
        gross_margin: grossMargin,
        net_margin: netMargin,
        transaction_count: transactions?.length || 0,
        completed_bookings: completedCount,
        cancelled_bookings: cancelledCount,
        average_transaction: avgTransaction,
      },
      breakdown_by_category: breakdown,
    };
  } catch (error) {
    console.error('Error fetching income statement data:', error);
    return null;
  }
}

// Generate HTML income statement
export function generateIncomeStatementHTML(data: IncomeStatementData): string {
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
  <title>Income Statement - ${data.provider.name}</title>
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
      max-width: 800px;
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
    .company-name {
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
    .line-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .line-item.sub-item {
      padding-left: 24px;
      font-size: 14px;
    }
    .line-item.total {
      font-weight: 700;
      font-size: 18px;
      border-top: 2px solid #111827;
      border-bottom: 3px double #111827;
      padding: 16px 0;
      margin-top: 8px;
    }
    .line-item.subtotal {
      font-weight: 600;
      border-top: 1px solid #111827;
      margin-top: 4px;
    }
    .label {
      color: #374151;
    }
    .value {
      font-weight: 600;
      color: #111827;
      text-align: right;
      min-width: 120px;
    }
    .value.positive {
      color: #10B981;
    }
    .value.negative {
      color: #EF4444;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 24px;
    }
    .summary-card {
      background: #F9FAFB;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3B82F6;
    }
    .summary-card.green { border-left-color: #10B981; }
    .summary-card.red { border-left-color: #EF4444; }
    .summary-card.orange { border-left-color: #F59E0B; }
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
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .breakdown-table th {
      background: #F9FAFB;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E5E7EB;
    }
    .breakdown-table td {
      padding: 12px;
      border-bottom: 1px solid #F3F4F6;
      font-size: 14px;
    }
    .breakdown-table th:last-child,
    .breakdown-table td:last-child {
      text-align: right;
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
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Income Statement</h1>
      <div class="company-name">${data.provider.name}</div>
      <div class="period">Period: ${data.period.label}</div>
      <div class="generated">Generated on ${generatedDate}</div>
    </div>

    <!-- Revenue Section -->
    <div class="section">
      <div class="section-title">Revenue</div>
      <div class="line-item sub-item">
        <span class="label">Service Revenue</span>
        <span class="value">${formatCurrency(data.revenue.service_revenue)}</span>
      </div>
      ${
        data.revenue.tips > 0
          ? `
      <div class="line-item sub-item">
        <span class="label">Tips</span>
        <span class="value">${formatCurrency(data.revenue.tips)}</span>
      </div>
      `
          : ''
      }
      ${
        data.revenue.other_income > 0
          ? `
      <div class="line-item sub-item">
        <span class="label">Other Income</span>
        <span class="value">${formatCurrency(data.revenue.other_income)}</span>
      </div>
      `
          : ''
      }
      <div class="line-item subtotal">
        <span class="label">Total Revenue</span>
        <span class="value positive">${formatCurrency(data.revenue.total_revenue)}</span>
      </div>
    </div>

    <!-- Expenses Section -->
    <div class="section">
      <div class="section-title">Expenses</div>
      <div class="line-item sub-item">
        <span class="label">Platform Fees</span>
        <span class="value">${formatCurrency(data.expenses.platform_fees)}</span>
      </div>
      <div class="line-item sub-item">
        <span class="label">Payment Processing Fees</span>
        <span class="value">${formatCurrency(data.expenses.payment_processing_fees)}</span>
      </div>
      ${
        data.expenses.refunds > 0
          ? `
      <div class="line-item sub-item">
        <span class="label">Refunds</span>
        <span class="value">${formatCurrency(data.expenses.refunds)}</span>
      </div>
      `
          : ''
      }
      ${
        data.expenses.other_expenses > 0
          ? `
      <div class="line-item sub-item">
        <span class="label">Other Expenses</span>
        <span class="value">${formatCurrency(data.expenses.other_expenses)}</span>
      </div>
      `
          : ''
      }
      <div class="line-item subtotal">
        <span class="label">Total Expenses</span>
        <span class="value negative">${formatCurrency(data.expenses.total_expenses)}</span>
      </div>
    </div>

    <!-- Net Income -->
    <div class="section">
      <div class="line-item total">
        <span class="label">Net Income</span>
        <span class="value ${data.summary.net_income >= 0 ? 'positive' : 'negative'}">
          ${formatCurrency(data.summary.net_income)}
        </span>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="section">
      <div class="section-title">Key Metrics</div>
      <div class="summary-grid">
        <div class="summary-card green">
          <div class="summary-label">Gross Margin</div>
          <div class="summary-value">${data.summary.gross_margin.toFixed(1)}%</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Net Margin</div>
          <div class="summary-value">${data.summary.net_margin.toFixed(1)}%</div>
        </div>
        <div class="summary-card orange">
          <div class="summary-label">Completed Bookings</div>
          <div class="summary-value">${data.summary.completed_bookings}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Average Transaction</div>
          <div class="summary-value">${formatCurrency(data.summary.average_transaction)}</div>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    ${
      data.breakdown_by_category && data.breakdown_by_category.length > 0
        ? `
    <div class="section">
      <div class="section-title">Revenue by Category</div>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Bookings</th>
            <th>Percentage</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${data.breakdown_by_category
            .map(
              (item) => `
            <tr>
              <td>${item.category_name}</td>
              <td>${item.booking_count}</td>
              <td>${item.percentage.toFixed(1)}%</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(item.revenue)}</td>
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

    <!-- Disclaimer -->
    <div class="disclaimer">
      <strong>Disclaimer:</strong> This income statement is generated for informational purposes only.
      Please consult with a qualified accountant or financial advisor for official financial reporting
      and tax purposes.
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>This document was automatically generated and is for reference only.</p>
      <p>Provider ID: ${data.provider.id}</p>
    </div>
  </div>
</body>
</html>
`;
}

// Save and share income statement
export async function saveAndShareIncomeStatement(
  data: IncomeStatementData
): Promise<void> {
  try {
    const html = generateIncomeStatementHTML(data);

    const startDate = new Date(data.period.start).toISOString().split('T')[0];
    const endDate = new Date(data.period.end).toISOString().split('T')[0];
    const fileName = `income_statement_${startDate}_to_${endDate}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, html);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Income Statement',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error saving and sharing income statement:', error);
    throw error;
  }
}

// Generate income statement
export async function generateIncomeStatement(
  providerId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const data = await fetchIncomeStatementData(providerId, startDate, endDate);

  if (!data) {
    throw new Error('Failed to fetch income statement data');
  }

  await saveAndShareIncomeStatement(data);
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

// Get predefined date ranges
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
