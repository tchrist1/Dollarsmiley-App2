import { supabase } from './supabase';

export interface Transaction {
  id: string;
  wallet_id: string;
  booking_id: string | null;
  transaction_type: 'Earning' | 'Payout' | 'Refund' | 'Fee' | 'Adjustment';
  amount: number;
  status: 'Pending' | 'Completed' | 'Failed' | 'Cancelled';
  description: string;
  reference_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  completed_at: string | null;
  booking?: {
    id: string;
    title: string;
    customer?: {
      full_name: string;
    };
  };
}

export interface TransactionStats {
  totalEarnings: number;
  totalPayouts: number;
  totalRefunds: number;
  totalFees: number;
  pendingAmount: number;
  completedTransactions: number;
}

export interface TransactionFilters {
  type?: Transaction['transaction_type'];
  status?: Transaction['status'];
  startDate?: string;
  endDate?: string;
  search?: string;
}

export async function getWalletByUserId(userId: string) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: userId })
          .select()
          .single();

        if (createError) throw createError;
        return newWallet;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting wallet:', error);
    return null;
  }
}

export async function getTransactions(
  walletId: string,
  filters?: TransactionFilters,
  limit: number = 50,
  offset: number = 0
): Promise<Transaction[]> {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          customer:profiles!customer_id(full_name)
        )
      `)
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.type) {
      query = query.eq('transaction_type', filters.type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,reference_id.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

export async function getTransactionStats(
  walletId: string,
  startDate?: string,
  endDate?: string
): Promise<TransactionStats> {
  try {
    let query = supabase
      .from('transactions')
      .select('transaction_type, amount, status')
      .eq('wallet_id', walletId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats: TransactionStats = {
      totalEarnings: 0,
      totalPayouts: 0,
      totalRefunds: 0,
      totalFees: 0,
      pendingAmount: 0,
      completedTransactions: 0,
    };

    data?.forEach((transaction) => {
      const amount = Math.abs(transaction.amount);

      if (transaction.status === 'Completed') {
        stats.completedTransactions++;

        switch (transaction.transaction_type) {
          case 'Earning':
            stats.totalEarnings += amount;
            break;
          case 'Payout':
            stats.totalPayouts += amount;
            break;
          case 'Refund':
            stats.totalRefunds += amount;
            break;
          case 'Fee':
            stats.totalFees += amount;
            break;
        }
      }

      if (transaction.status === 'Pending') {
        stats.pendingAmount += amount;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    return {
      totalEarnings: 0,
      totalPayouts: 0,
      totalRefunds: 0,
      totalFees: 0,
      pendingAmount: 0,
      completedTransactions: 0,
    };
  }
}

export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          customer:profiles!customer_id(full_name),
          provider:profiles!provider_id(full_name)
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

export async function getMonthlyTransactions(
  walletId: string,
  year: number,
  month: number
): Promise<Transaction[]> {
  try {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        booking:bookings(id, title)
      `)
      .eq('wallet_id', walletId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching monthly transactions:', error);
    return [];
  }
}

export async function getYearlyTransactionSummary(
  walletId: string,
  year: number
): Promise<Record<number, TransactionStats>> {
  try {
    const startDate = new Date(year, 0, 1).toISOString();
    const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_type, amount, status, created_at')
      .eq('wallet_id', walletId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const monthlyStats: Record<number, TransactionStats> = {};

    for (let month = 1; month <= 12; month++) {
      monthlyStats[month] = {
        totalEarnings: 0,
        totalPayouts: 0,
        totalRefunds: 0,
        totalFees: 0,
        pendingAmount: 0,
        completedTransactions: 0,
      };
    }

    data?.forEach((transaction) => {
      const month = new Date(transaction.created_at).getMonth() + 1;
      const amount = Math.abs(transaction.amount);

      if (transaction.status === 'Completed') {
        monthlyStats[month].completedTransactions++;

        switch (transaction.transaction_type) {
          case 'Earning':
            monthlyStats[month].totalEarnings += amount;
            break;
          case 'Payout':
            monthlyStats[month].totalPayouts += amount;
            break;
          case 'Refund':
            monthlyStats[month].totalRefunds += amount;
            break;
          case 'Fee':
            monthlyStats[month].totalFees += amount;
            break;
        }
      }

      if (transaction.status === 'Pending') {
        monthlyStats[month].pendingAmount += amount;
      }
    });

    return monthlyStats;
  } catch (error) {
    console.error('Error fetching yearly summary:', error);
    return {};
  }
}

export function getTransactionTypeLabel(type: Transaction['transaction_type']): string {
  const labels: Record<string, string> = {
    Earning: 'Earning',
    Payout: 'Payout',
    Refund: 'Refund',
    Fee: 'Fee',
    Adjustment: 'Adjustment',
  };
  return labels[type] || type;
}

export function getTransactionTypeColor(type: Transaction['transaction_type']): string {
  const colors: Record<string, string> = {
    Earning: '#10B981', // Green
    Payout: '#3B82F6', // Blue
    Refund: '#F59E0B', // Orange
    Fee: '#EF4444', // Red
    Adjustment: '#8B5CF6', // Purple
  };
  return colors[type] || '#6B7280';
}

export function getTransactionStatusColor(status: Transaction['status']): string {
  const colors: Record<string, string> = {
    Completed: '#10B981', // Green
    Pending: '#F59E0B', // Orange
    Failed: '#EF4444', // Red
    Cancelled: '#6B7280', // Gray
  };
  return colors[status] || '#6B7280';
}

export function formatAmount(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTransactionDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatTransactionDate(dateString);
}

export async function exportTransactionsToCSV(
  walletId: string,
  filters?: TransactionFilters
): Promise<string> {
  try {
    const transactions = await getTransactions(walletId, filters, 10000, 0);

    const headers = [
      'Date',
      'Type',
      'Description',
      'Amount',
      'Status',
      'Reference',
      'Booking',
    ];

    const rows = transactions.map((t) => [
      formatTransactionDateTime(t.created_at),
      getTransactionTypeLabel(t.transaction_type),
      t.description,
      formatAmount(t.amount),
      t.status,
      t.reference_id || '',
      t.booking?.title || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  } catch (error) {
    console.error('Error exporting transactions:', error);
    throw error;
  }
}

export function groupTransactionsByDate(
  transactions: Transaction[]
): Record<string, Transaction[]> {
  const grouped: Record<string, Transaction[]> = {};

  transactions.forEach((transaction) => {
    const date = formatTransactionDate(transaction.created_at);

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(transaction);
  });

  return grouped;
}

export function calculateNetAmount(transactions: Transaction[]): number {
  return transactions.reduce((sum, transaction) => {
    if (transaction.status !== 'Completed') return sum;

    switch (transaction.transaction_type) {
      case 'Earning':
      case 'Refund':
        return sum + Math.abs(transaction.amount);
      case 'Payout':
      case 'Fee':
        return sum - Math.abs(transaction.amount);
      default:
        return sum + transaction.amount;
    }
  }, 0);
}
