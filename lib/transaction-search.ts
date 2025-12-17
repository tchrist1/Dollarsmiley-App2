import { supabase } from './supabase';
import type { Transaction } from './transactions';

export interface SearchResult {
  transaction: Transaction;
  matchType: 'description' | 'reference' | 'amount' | 'booking';
  matchText: string;
}

export interface SearchSuggestion {
  type: 'recent' | 'common' | 'amount';
  text: string;
  count?: number;
}

export async function searchTransactions(
  walletId: string,
  searchTerm: string,
  limit: number = 50
): Promise<SearchResult[]> {
  if (!searchTerm.trim()) return [];

  try {
    const term = searchTerm.trim().toLowerCase();

    const { data, error } = await supabase
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
      .or(
        `description.ilike.%${term}%,reference_id.ilike.%${term}%`
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const results: SearchResult[] = [];

    data?.forEach((transaction) => {
      if (transaction.description?.toLowerCase().includes(term)) {
        results.push({
          transaction: transaction as Transaction,
          matchType: 'description',
          matchText: transaction.description,
        });
      } else if (transaction.reference_id?.toLowerCase().includes(term)) {
        results.push({
          transaction: transaction as Transaction,
          matchType: 'reference',
          matchText: transaction.reference_id,
        });
      } else if (transaction.booking?.title?.toLowerCase().includes(term)) {
        results.push({
          transaction: transaction as Transaction,
          matchType: 'booking',
          matchText: transaction.booking.title,
        });
      }
    });

    if (!isNaN(Number(term))) {
      const amountMatches = data?.filter((t) =>
        t.amount.toString().includes(term)
      );

      amountMatches?.forEach((transaction) => {
        if (!results.find((r) => r.transaction.id === transaction.id)) {
          results.push({
            transaction: transaction as Transaction,
            matchType: 'amount',
            matchText: transaction.amount.toString(),
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Error searching transactions:', error);
    return [];
  }
}

export async function getSearchSuggestions(
  walletId: string,
  partialTerm: string
): Promise<SearchSuggestion[]> {
  if (!partialTerm.trim() || partialTerm.length < 2) return [];

  try {
    const term = partialTerm.trim().toLowerCase();

    const { data, error } = await supabase
      .from('transactions')
      .select('description, transaction_type')
      .eq('wallet_id', walletId)
      .ilike('description', `%${term}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const descriptionMap = new Map<string, number>();

    data?.forEach((transaction) => {
      const desc = transaction.description.toLowerCase();
      if (desc.includes(term)) {
        const count = descriptionMap.get(desc) || 0;
        descriptionMap.set(desc, count + 1);
      }
    });

    const suggestions: SearchSuggestion[] = Array.from(descriptionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({
        type: 'common',
        text,
        count,
      }));

    return suggestions;
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

export async function getCommonSearchTerms(
  walletId: string,
  limit: number = 10
): Promise<SearchSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('description')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const wordFrequency = new Map<string, number>();

    data?.forEach((transaction) => {
      const words = transaction.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3);

      words.forEach((word) => {
        const count = wordFrequency.get(word) || 0;
        wordFrequency.set(word, count + 1);
      });
    });

    const suggestions: SearchSuggestion[] = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text, count]) => ({
        type: 'common',
        text,
        count,
      }));

    return suggestions;
  } catch (error) {
    console.error('Error getting common search terms:', error);
    return [];
  }
}

export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '**$1**');
}

export function getSearchMatchLabel(matchType: SearchResult['matchType']): string {
  const labels: Record<SearchResult['matchType'], string> = {
    description: 'Description',
    reference: 'Reference ID',
    amount: 'Amount',
    booking: 'Booking',
  };
  return labels[matchType];
}

export function parseSearchQuery(query: string): {
  terms: string[];
  filters: {
    minAmount?: number;
    maxAmount?: number;
    type?: string;
  };
} {
  const terms: string[] = [];
  const filters: any = {};

  const tokens = query.trim().split(/\s+/);

  tokens.forEach((token) => {
    if (token.startsWith('amount:')) {
      const amountStr = token.substring(7);
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        filters.minAmount = amount;
        filters.maxAmount = amount;
      }
    } else if (token.startsWith('min:')) {
      const amountStr = token.substring(4);
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        filters.minAmount = amount;
      }
    } else if (token.startsWith('max:')) {
      const amountStr = token.substring(4);
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        filters.maxAmount = amount;
      }
    } else if (token.startsWith('type:')) {
      filters.type = token.substring(5);
    } else {
      terms.push(token);
    }
  });

  return { terms, filters };
}

export async function advancedSearch(
  walletId: string,
  query: string,
  limit: number = 50
): Promise<Transaction[]> {
  const { terms, filters } = parseSearchQuery(query);

  try {
    let supabaseQuery = supabase
      .from('transactions')
      .select(`
        *,
        booking:bookings(
          id,
          title,
          customer:profiles!customer_id(full_name)
        )
      `)
      .eq('wallet_id', walletId);

    if (terms.length > 0) {
      const searchTerm = terms.join(' ');
      supabaseQuery = supabaseQuery.or(
        `description.ilike.%${searchTerm}%,reference_id.ilike.%${searchTerm}%`
      );
    }

    if (filters.minAmount !== undefined) {
      supabaseQuery = supabaseQuery.gte('amount', filters.minAmount);
    }

    if (filters.maxAmount !== undefined) {
      supabaseQuery = supabaseQuery.lte('amount', filters.maxAmount);
    }

    if (filters.type) {
      supabaseQuery = supabaseQuery.ilike('transaction_type', filters.type);
    }

    supabaseQuery = supabaseQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await supabaseQuery;

    if (error) throw error;

    return (data || []) as Transaction[];
  } catch (error) {
    console.error('Error in advanced search:', error);
    return [];
  }
}

export function getSearchPlaceholder(): string {
  const placeholders = [
    'Search by description...',
    'Search by reference ID...',
    'Search by amount...',
    'Search by booking...',
    'Try "payment", "refund", etc...',
  ];

  return placeholders[Math.floor(Math.random() * placeholders.length)];
}

export function formatSearchResultCount(count: number): string {
  if (count === 0) return 'No results found';
  if (count === 1) return '1 result found';
  return `${count} results found`;
}
