import { supabase } from './supabase';
import { ChartData, DistributionData } from './analytics';

// Transaction Analytics Types
export interface TransactionTrend {
  date: string;
  total_transactions: number;
  successful_volume: number;
  platform_fees: number;
  success_rate: number;
}

export interface RevenueByCategory {
  category_name: string;
  total_revenue: number;
  transaction_count: number;
  avg_transaction_value: number;
}

export interface ProviderEarningsSummary {
  total_earnings: number;
  platform_fees_paid: number;
  net_earnings: number;
  total_transactions: number;
  completed_bookings: number;
  avg_booking_value: number;
  total_refunds: number;
  total_disputes: number;
}

export interface PaymentMethodPerformance {
  payment_method: string;
  total_transactions: number;
  success_rate: number;
  total_volume: number;
}

export interface DailyTransactionAnalytics {
  date: string;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  refunded_transactions: number;
  total_volume: number;
  successful_volume: number;
  refunded_volume: number;
  platform_fees: number;
  processing_fees: number;
  net_revenue: number;
  avg_transaction_value: number;
  unique_customers: number;
  unique_providers: number;
}

// Get transaction trends
export async function getTransactionTrends(days: number = 30): Promise<TransactionTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_transaction_trends', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as TransactionTrend[];
  } catch (error) {
    console.error('Error fetching transaction trends:', error);
    return [];
  }
}

// Get revenue by category
export async function getRevenueByCategory(days: number = 30): Promise<RevenueByCategory[]> {
  try {
    const { data, error } = await supabase.rpc('get_revenue_by_category', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as RevenueByCategory[];
  } catch (error) {
    console.error('Error fetching revenue by category:', error);
    return [];
  }
}

// Get provider earnings summary
export async function getProviderEarningsSummary(
  providerId: string,
  days: number = 30
): Promise<ProviderEarningsSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_provider_earnings_summary', {
      p_provider_id: providerId,
      p_days: days,
    });

    if (error) throw error;
    return data as ProviderEarningsSummary;
  } catch (error) {
    console.error('Error fetching provider earnings:', error);
    return null;
  }
}

// Get payment method performance
export async function getPaymentMethodPerformance(
  days: number = 30
): Promise<PaymentMethodPerformance[]> {
  try {
    const { data, error } = await supabase.rpc('get_payment_method_performance', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as PaymentMethodPerformance[];
  } catch (error) {
    console.error('Error fetching payment method performance:', error);
    return [];
  }
}

// Get daily transaction analytics
export async function getDailyTransactionAnalytics(
  days: number = 30
): Promise<DailyTransactionAnalytics[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('transaction_analytics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as DailyTransactionAnalytics[];
  } catch (error) {
    console.error('Error fetching daily transaction analytics:', error);
    return [];
  }
}

// Get transaction volume chart data
export async function getTransactionVolumeChart(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getTransactionTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const volumes = trends.map((t) => Number(t.successful_volume) || 0);

    return {
      labels,
      datasets: [{ data: volumes }],
    };
  } catch (error) {
    console.error('Error generating transaction volume chart:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get platform fees chart data
export async function getPlatformFeesChart(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getTransactionTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const fees = trends.map((t) => Number(t.platform_fees) || 0);

    return {
      labels,
      datasets: [{ data: fees }],
    };
  } catch (error) {
    console.error('Error generating platform fees chart:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get success rate chart data
export async function getSuccessRateChart(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getTransactionTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const rates = trends.map((t) => Number(t.success_rate) || 0);

    return {
      labels,
      datasets: [{ data: rates }],
    };
  } catch (error) {
    console.error('Error generating success rate chart:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get revenue distribution by category (pie chart)
export async function getRevenueDistributionByCategory(
  days: number = 30
): Promise<DistributionData[]> {
  try {
    const categories = await getRevenueByCategory(days);

    const colors = [
      '#007AFF',
      '#34C759',
      '#FF9500',
      '#FF3B30',
      '#5856D6',
      '#AF52DE',
      '#FF2D55',
      '#5AC8FA',
    ];

    return categories.slice(0, 6).map((cat, index) => ({
      name: cat.category_name,
      value: Number(cat.total_revenue),
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  } catch (error) {
    console.error('Error generating revenue distribution:', error);
    return [];
  }
}

// Get payment method distribution (pie chart)
export async function getPaymentMethodDistribution(
  days: number = 30
): Promise<DistributionData[]> {
  try {
    const methods = await getPaymentMethodPerformance(days);

    const colors: Record<string, string> = {
      'credit_card': '#007AFF',
      'debit_card': '#34C759',
      'paypal': '#FF9500',
      'cashapp': '#00D632',
      'venmo': '#3D95CE',
      'bank_transfer': '#5856D6',
    };

    return methods.map((method) => ({
      name: formatPaymentMethod(method.payment_method),
      value: Number(method.total_volume),
      color: colors[method.payment_method] || '#8E8E93',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  } catch (error) {
    console.error('Error generating payment method distribution:', error);
    return [];
  }
}

// Get transaction count trends
export async function getTransactionCountTrends(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getTransactionTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const counts = trends.map((t) => t.total_transactions);

    return {
      labels,
      datasets: [{ data: counts }],
    };
  } catch (error) {
    console.error('Error generating transaction count trends:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Calculate transaction analytics summary
export async function getTransactionAnalyticsSummary(days: number = 30) {
  try {
    const analytics = await getDailyTransactionAnalytics(days);

    if (analytics.length === 0) {
      return {
        totalTransactions: 0,
        totalVolume: 0,
        totalFees: 0,
        totalRefunds: 0,
        avgTransactionValue: 0,
        successRate: 0,
        totalCustomers: 0,
        totalProviders: 0,
      };
    }

    const totalTransactions = analytics.reduce((sum, a) => sum + a.total_transactions, 0);
    const successfulTransactions = analytics.reduce(
      (sum, a) => sum + a.successful_transactions,
      0
    );
    const totalVolume = analytics.reduce((sum, a) => sum + Number(a.successful_volume), 0);
    const totalFees = analytics.reduce((sum, a) => sum + Number(a.platform_fees), 0);
    const totalRefunds = analytics.reduce((sum, a) => sum + Number(a.refunded_volume), 0);
    const uniqueCustomers = new Set(analytics.map((a) => a.unique_customers)).size;
    const uniqueProviders = new Set(analytics.map((a) => a.unique_providers)).size;

    return {
      totalTransactions,
      totalVolume: totalVolume.toFixed(2),
      totalFees: totalFees.toFixed(2),
      totalRefunds: totalRefunds.toFixed(2),
      avgTransactionValue: totalTransactions > 0 ? (totalVolume / totalTransactions).toFixed(2) : '0',
      successRate: totalTransactions > 0
        ? ((successfulTransactions / totalTransactions) * 100).toFixed(1)
        : '0',
      totalCustomers: uniqueCustomers,
      totalProviders: uniqueProviders,
    };
  } catch (error) {
    console.error('Error calculating transaction summary:', error);
    return {
      totalTransactions: 0,
      totalVolume: '0',
      totalFees: '0',
      totalRefunds: '0',
      avgTransactionValue: '0',
      successRate: '0',
      totalCustomers: 0,
      totalProviders: 0,
    };
  }
}

// Format payment method for display
function formatPaymentMethod(method: string): string {
  const formatted: Record<string, string> = {
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    paypal: 'PayPal',
    cashapp: 'Cash App',
    venmo: 'Venmo',
    bank_transfer: 'Bank Transfer',
  };

  return formatted[method] || method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Format currency
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

// Format percentage
export function formatPercentage(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
}

// Get growth rate
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
