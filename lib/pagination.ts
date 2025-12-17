/**
 * Pagination Utilities
 *
 * Provides cursor-based and offset-based pagination helpers
 */

import { supabase } from './supabase';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    page: number;
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Offset-based pagination (for simple lists)
 */
export async function paginateQuery<T>(
  query: any,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<T>> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  // Get total count
  const countQuery = query;
  const { count } = await countQuery.select('*', { count: 'exact', head: true });

  // Get paginated data
  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      hasMore: offset + limit < (count || 0),
    },
  };
}

/**
 * Cursor-based pagination (for infinite scroll)
 */
export async function paginateCursor<T>(
  tableName: string,
  options: {
    cursor?: string;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, any>;
  } = {}
): Promise<PaginatedResponse<T>> {
  const {
    cursor,
    limit = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
    filters = {},
  } = options;

  let query = supabase.from(tableName).select('*');

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      query = query.eq(key, value);
    }
  });

  // Apply cursor
  if (cursor) {
    const operator = orderDirection === 'desc' ? 'lt' : 'gt';
    query = query[operator](orderBy, cursor);
  }

  // Apply ordering and limit
  query = query.order(orderBy, { ascending: orderDirection === 'asc' }).limit(limit + 1);

  const { data, error } = await query;

  if (error) throw error;

  const hasMore = (data?.length || 0) > limit;
  const items = hasMore ? data!.slice(0, limit) : data || [];
  const nextCursor = hasMore ? items[items.length - 1][orderBy] : undefined;

  return {
    data: items as T[],
    pagination: {
      page: 1,
      limit,
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Hook for pagination state management
 */
export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = React.useState(initialPage);
  const [limit, setLimit] = React.useState(initialLimit);
  const [total, setTotal] = React.useState(0);

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  const firstPage = () => goToPage(1);
  const lastPage = () => goToPage(totalPages);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    setPage,
    setLimit,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
  };
}

import React from 'react';

/**
 * Hook for infinite scroll pagination
 */
export function useInfiniteScroll<T>(
  fetcher: (cursor?: string) => Promise<PaginatedResponse<T>>
) {
  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [hasMore, setHasMore] = React.useState(true);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const result = await fetcher(cursor);
      setData((prev) => [...prev, ...result.data]);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore, fetcher]);

  const refresh = React.useCallback(async () => {
    setData([]);
    setCursor(undefined);
    setHasMore(true);
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result.data);
      setCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    refresh,
  };
}

/**
 * Paginate cart items
 */
export async function paginateCartItems(
  userId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<any>> {
  const query = supabase
    .from('cart_items')
    .select('*, listings:service_listings(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return await paginateQuery(query, options);
}

/**
 * Paginate payout schedules
 */
export async function paginatePayouts(
  providerId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<any>> {
  const query = supabase
    .from('payout_schedules')
    .select('*')
    .eq('provider_id', providerId)
    .order('scheduled_payout_date', { ascending: false });

  return await paginateQuery(query, options);
}

/**
 * Paginate bookings
 */
export async function paginateBookings(
  userId: string,
  role: 'customer' | 'provider',
  options: PaginationOptions = {}
): Promise<PaginatedResponse<any>> {
  const column = role === 'customer' ? 'customer_id' : 'provider_id';

  const query = supabase
    .from('bookings')
    .select('*, listings:service_listings(*), customer:profiles!customer_id(*)')
    .eq(column, userId)
    .order('created_at', { ascending: false });

  return await paginateQuery(query, options);
}

/**
 * Paginate notifications
 */
export async function paginateNotifications(
  userId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<any>> {
  return await paginateCursor('notifications', {
    ...options,
    filters: { user_id: userId },
    orderBy: 'created_at',
    orderDirection: 'desc',
  });
}
