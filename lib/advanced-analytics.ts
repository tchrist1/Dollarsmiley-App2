import { supabase } from './supabase';

export interface AnalyticsTimeRange {
  start: string;
  end: string;
  label: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  revenueGrowth: number;
  projectedRevenue: number;
  topRevenueCategories: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
  }>;
}

export interface BookingMetrics {
  totalBookings: number;
  completedBookings: number;
  canceledBookings: number;
  completionRate: number;
  averageBookingValue: number;
  bookingsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  bookingTrends: Array<{
    date: string;
    bookings: number;
  }>;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  averageLifetimeValue: number;
  customersBySegment: Array<{
    segment: string;
    count: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    bookingCount: number;
  }>;
}

export interface PerformanceMetrics {
  responseTime: number;
  acceptanceRate: number;
  completionTime: number;
  customerSatisfaction: number;
  repeatBookingRate: number;
  conversionRate: number;
}

export interface MarketingMetrics {
  listingViews: number;
  profileViews: number;
  clickThroughRate: number;
  conversionRate: number;
  costPerAcquisition: number;
  topPerformingListings: Array<{
    id: string;
    title: string;
    views: number;
    bookings: number;
    revenue: number;
  }>;
}

export interface AdvancedAnalyticsDashboard {
  revenue: RevenueMetrics;
  bookings: BookingMetrics;
  customers: CustomerMetrics;
  performance: PerformanceMetrics;
  marketing: MarketingMetrics;
  timeRange: AnalyticsTimeRange;
}

export function getTimeRange(period: '7d' | '30d' | '90d' | '1y'): AnalyticsTimeRange {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      return { start: start.toISOString(), end: end.toISOString(), label: 'Last 7 Days' };
    case '30d':
      start.setDate(end.getDate() - 30);
      return { start: start.toISOString(), end: end.toISOString(), label: 'Last 30 Days' };
    case '90d':
      start.setDate(end.getDate() - 90);
      return { start: start.toISOString(), end: end.toISOString(), label: 'Last 90 Days' };
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      return { start: start.toISOString(), end: end.toISOString(), label: 'Last Year' };
  }
}

export async function getRevenueMetrics(
  userId: string,
  timeRange: AnalyticsTimeRange
): Promise<RevenueMetrics> {
  try {
    // Get all completed bookings with earnings
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        *,
        listing:service_listings(category_id, categories(name)),
        earnings:wallet_transactions!wallet_transactions_booking_id_fkey(amount)
      `)
      .eq('provider_id', userId)
      .eq('status', 'Completed')
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    const totalRevenue = bookings?.reduce((sum, b) => {
      const earnings = b.earnings?.[0]?.amount || 0;
      return sum + earnings;
    }, 0) || 0;

    const averageOrderValue = bookings && bookings.length > 0
      ? totalRevenue / bookings.length
      : 0;

    // Get previous period for growth calculation
    const prevPeriodStart = new Date(timeRange.start);
    const periodLength = new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime();
    prevPeriodStart.setTime(prevPeriodStart.getTime() - periodLength);

    const { data: prevBookings } = await supabase
      .from('bookings')
      .select('*, earnings:wallet_transactions!wallet_transactions_booking_id_fkey(amount)')
      .eq('provider_id', userId)
      .eq('status', 'Completed')
      .gte('created_at', prevPeriodStart.toISOString())
      .lt('created_at', timeRange.start);

    const prevRevenue = prevBookings?.reduce((sum, b) => {
      const earnings = b.earnings?.[0]?.amount || 0;
      return sum + earnings;
    }, 0) || 0;

    const revenueGrowth = prevRevenue > 0
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
      : 0;

    // Project revenue for next period
    const projectedRevenue = totalRevenue * (1 + revenueGrowth / 100);

    // Category breakdown
    const categoryMap = new Map<string, number>();
    bookings?.forEach(booking => {
      const category = booking.listing?.categories?.name || 'Other';
      const earnings = booking.earnings?.[0]?.amount || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + earnings);
    });

    const topRevenueCategories = Array.from(categoryMap.entries())
      .map(([category, revenue]) => ({
        category,
        revenue,
        percentage: (revenue / totalRevenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Daily revenue
    const dailyMap = new Map<string, number>();
    bookings?.forEach(booking => {
      const date = new Date(booking.created_at).toISOString().split('T')[0];
      const earnings = booking.earnings?.[0]?.amount || 0;
      dailyMap.set(date, (dailyMap.get(date) || 0) + earnings);
    });

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      averageOrderValue,
      revenueGrowth,
      projectedRevenue,
      topRevenueCategories,
      dailyRevenue,
    };
  } catch (error) {
    console.error('Error getting revenue metrics:', error);
    throw error;
  }
}

export async function getBookingMetrics(
  userId: string,
  timeRange: AnalyticsTimeRange
): Promise<BookingMetrics> {
  try {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'Completed').length || 0;
    const canceledBookings = bookings?.filter(b => b.status === 'Canceled').length || 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

    const totalValue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
    const averageBookingValue = totalBookings > 0 ? totalValue / totalBookings : 0;

    // Status breakdown
    const statusMap = new Map<string, number>();
    bookings?.forEach(booking => {
      statusMap.set(booking.status, (statusMap.get(booking.status) || 0) + 1);
    });

    const bookingsByStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: (count / totalBookings) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Daily trends
    const dailyMap = new Map<string, number>();
    bookings?.forEach(booking => {
      const date = new Date(booking.created_at).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });

    const bookingTrends = Array.from(dailyMap.entries())
      .map(([date, bookings]) => ({ date, bookings }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalBookings,
      completedBookings,
      canceledBookings,
      completionRate,
      averageBookingValue,
      bookingsByStatus,
      bookingTrends,
    };
  } catch (error) {
    console.error('Error getting booking metrics:', error);
    throw error;
  }
}

export async function getCustomerMetrics(
  userId: string,
  timeRange: AnalyticsTimeRange
): Promise<CustomerMetrics> {
  try {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('customer_id, total_price, created_at, customer:profiles!bookings_customer_id_fkey(id, full_name)')
      .eq('provider_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    const customerMap = new Map<string, {
      firstBooking: string;
      totalSpent: number;
      bookingCount: number;
      name: string;
    }>();

    bookings?.forEach(booking => {
      const customerId = booking.customer_id;
      const existing = customerMap.get(customerId);

      if (!existing) {
        customerMap.set(customerId, {
          firstBooking: booking.created_at,
          totalSpent: booking.total_price || 0,
          bookingCount: 1,
          name: booking.customer?.full_name || 'Unknown',
        });
      } else {
        existing.totalSpent += booking.total_price || 0;
        existing.bookingCount += 1;
        if (booking.created_at < existing.firstBooking) {
          existing.firstBooking = booking.created_at;
        }
      }
    });

    const totalCustomers = customerMap.size;

    // Determine new vs returning
    let newCustomers = 0;
    let returningCustomers = 0;

    customerMap.forEach((data, customerId) => {
      if (data.bookingCount === 1) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    });

    const retentionRate = totalCustomers > 0
      ? (returningCustomers / totalCustomers) * 100
      : 0;

    const totalRevenue = Array.from(customerMap.values())
      .reduce((sum, c) => sum + c.totalSpent, 0);

    const averageLifetimeValue = totalCustomers > 0
      ? totalRevenue / totalCustomers
      : 0;

    // Top customers
    const topCustomers = Array.from(customerMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalSpent: data.totalSpent,
        bookingCount: data.bookingCount,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Segment customers
    const customersBySegment = [
      {
        segment: 'High Value',
        count: Array.from(customerMap.values()).filter(c => c.totalSpent > averageLifetimeValue * 2).length,
        revenue: Array.from(customerMap.values())
          .filter(c => c.totalSpent > averageLifetimeValue * 2)
          .reduce((sum, c) => sum + c.totalSpent, 0),
      },
      {
        segment: 'Regular',
        count: Array.from(customerMap.values())
          .filter(c => c.totalSpent >= averageLifetimeValue && c.totalSpent <= averageLifetimeValue * 2)
          .length,
        revenue: Array.from(customerMap.values())
          .filter(c => c.totalSpent >= averageLifetimeValue && c.totalSpent <= averageLifetimeValue * 2)
          .reduce((sum, c) => sum + c.totalSpent, 0),
      },
      {
        segment: 'Low Value',
        count: Array.from(customerMap.values()).filter(c => c.totalSpent < averageLifetimeValue).length,
        revenue: Array.from(customerMap.values())
          .filter(c => c.totalSpent < averageLifetimeValue)
          .reduce((sum, c) => sum + c.totalSpent, 0),
      },
    ];

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      retentionRate,
      averageLifetimeValue,
      customersBySegment,
      topCustomers,
    };
  } catch (error) {
    console.error('Error getting customer metrics:', error);
    throw error;
  }
}

export async function getPerformanceMetrics(
  userId: string,
  timeRange: AnalyticsTimeRange
): Promise<PerformanceMetrics> {
  try {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, reviews(rating)')
      .eq('provider_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    // Response time (hours between booking request and acceptance)
    const acceptedBookings = bookings?.filter(b => b.accepted_at) || [];
    const totalResponseTime = acceptedBookings.reduce((sum, b) => {
      const requested = new Date(b.created_at).getTime();
      const accepted = new Date(b.accepted_at).getTime();
      return sum + (accepted - requested) / (1000 * 60 * 60); // hours
    }, 0);
    const responseTime = acceptedBookings.length > 0
      ? totalResponseTime / acceptedBookings.length
      : 0;

    // Acceptance rate
    const totalRequests = bookings?.length || 0;
    const acceptedCount = acceptedBookings.length;
    const acceptanceRate = totalRequests > 0 ? (acceptedCount / totalRequests) * 100 : 0;

    // Completion time (hours from start to completion)
    const completedBookings = bookings?.filter(b => b.status === 'Completed') || [];
    const totalCompletionTime = completedBookings.reduce((sum, b) => {
      const start = new Date(b.scheduled_date).getTime();
      const completed = new Date(b.updated_at).getTime();
      return sum + (completed - start) / (1000 * 60 * 60); // hours
    }, 0);
    const completionTime = completedBookings.length > 0
      ? totalCompletionTime / completedBookings.length
      : 0;

    // Customer satisfaction (average rating)
    const ratings = bookings?.flatMap(b => b.reviews?.map(r => r.rating) || []) || [];
    const customerSatisfaction = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    // Repeat booking rate
    const { data: allCustomers } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('provider_id', userId);

    const customerBookingCounts = new Map<string, number>();
    allCustomers?.forEach(b => {
      customerBookingCounts.set(
        b.customer_id,
        (customerBookingCounts.get(b.customer_id) || 0) + 1
      );
    });

    const repeatCustomers = Array.from(customerBookingCounts.values())
      .filter(count => count > 1).length;
    const repeatBookingRate = customerBookingCounts.size > 0
      ? (repeatCustomers / customerBookingCounts.size) * 100
      : 0;

    // Conversion rate (bookings / listing views)
    const { data: analytics } = await supabase
      .from('listing_analytics')
      .select('views')
      .eq('listing_id', userId)
      .gte('date', timeRange.start)
      .lte('date', timeRange.end);

    const totalViews = analytics?.reduce((sum, a) => sum + a.views, 0) || 0;
    const conversionRate = totalViews > 0
      ? (totalRequests / totalViews) * 100
      : 0;

    return {
      responseTime,
      acceptanceRate,
      completionTime,
      customerSatisfaction,
      repeatBookingRate,
      conversionRate,
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    throw error;
  }
}

export async function getMarketingMetrics(
  userId: string,
  timeRange: AnalyticsTimeRange
): Promise<MarketingMetrics> {
  try {
    // Get listing performance
    const { data: listings } = await supabase
      .from('service_listings')
      .select(`
        id,
        title,
        analytics:listing_analytics(views, clicks),
        bookings(id, total_price, status)
      `)
      .eq('user_id', userId);

    let totalViews = 0;
    let totalClicks = 0;

    const listingPerformance = listings?.map(listing => {
      const views = listing.analytics?.reduce((sum: number, a: any) => sum + (a.views || 0), 0) || 0;
      const clicks = listing.analytics?.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0) || 0;
      const bookings = listing.bookings?.filter((b: any) => b.status === 'Completed').length || 0;
      const revenue = listing.bookings?.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0;

      totalViews += views;
      totalClicks += clicks;

      return {
        id: listing.id,
        title: listing.title,
        views,
        bookings,
        revenue,
      };
    }) || [];

    const clickThroughRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    // Profile views
    const { data: profileAnalytics } = await supabase
      .from('profile_views')
      .select('count')
      .eq('profile_id', userId)
      .gte('date', timeRange.start)
      .lte('date', timeRange.end);

    const profileViews = profileAnalytics?.reduce((sum, a) => sum + a.count, 0) || 0;

    // Conversion rate
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    const totalBookings = bookings?.length || 0;
    const conversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;

    // Cost per acquisition (if using featured listings)
    const { data: featuredCosts } = await supabase
      .from('featured_listings')
      .select('amount_paid')
      .eq('user_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    const totalMarketingCost = featuredCosts?.reduce((sum, f) => sum + f.amount_paid, 0) || 0;
    const costPerAcquisition = totalBookings > 0 ? totalMarketingCost / totalBookings : 0;

    // Top performing listings
    const topPerformingListings = listingPerformance
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      listingViews: totalViews,
      profileViews,
      clickThroughRate,
      conversionRate,
      costPerAcquisition,
      topPerformingListings,
    };
  } catch (error) {
    console.error('Error getting marketing metrics:', error);
    throw error;
  }
}

export async function getAdvancedAnalytics(
  userId: string,
  period: '7d' | '30d' | '90d' | '1y' = '30d'
): Promise<AdvancedAnalyticsDashboard> {
  try {
    const timeRange = getTimeRange(period);

    const [revenue, bookings, customers, performance, marketing] = await Promise.all([
      getRevenueMetrics(userId, timeRange),
      getBookingMetrics(userId, timeRange),
      getCustomerMetrics(userId, timeRange),
      getPerformanceMetrics(userId, timeRange),
      getMarketingMetrics(userId, timeRange),
    ]);

    return {
      revenue,
      bookings,
      customers,
      performance,
      marketing,
      timeRange,
    };
  } catch (error) {
    console.error('Error getting advanced analytics:', error);
    throw error;
  }
}

export function formatMetricValue(value: number, type: 'currency' | 'percentage' | 'number' | 'time'): string {
  switch (type) {
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'time':
      if (value < 1) {
        return `${Math.round(value * 60)}m`;
      } else if (value < 24) {
        return `${value.toFixed(1)}h`;
      } else {
        return `${Math.round(value / 24)}d`;
      }
    case 'number':
    default:
      return value.toLocaleString();
  }
}
