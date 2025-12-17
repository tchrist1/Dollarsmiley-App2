import {
  getUserGrowthData,
  getRevenueData,
  getBookingsData,
  getAnalyticsOverview,
} from '@/lib/analytics';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
        eq: jest.fn(() => Promise.resolve({
          data: [],
          error: null,
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({
      data: null,
      error: null,
    })),
  },
}));

describe('Analytics Functions', () => {
  describe('getUserGrowthData', () => {
    it('should return chart data for user growth', async () => {
      const result = await getUserGrowthData(7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle different time ranges', async () => {
      const result30 = await getUserGrowthData(30);
      const result90 = await getUserGrowthData(90);

      expect(result30).toBeDefined();
      expect(result90).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const result = await getUserGrowthData(7);
      expect(result).toBeDefined();
    });
  });

  describe('getRevenueData', () => {
    it('should return revenue data', async () => {
      const result = await getRevenueData(30);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should format revenue correctly', async () => {
      const result = await getRevenueData(7);

      result.forEach(item => {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('value');
        expect(typeof item.value).toBe('number');
      });
    });
  });

  describe('getBookingsData', () => {
    it('should return bookings data', async () => {
      const result = await getBookingsData(30);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAnalyticsOverview', () => {
    it('should return complete overview', async () => {
      const result = await getAnalyticsOverview();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalBookings');
      expect(result).toHaveProperty('activeProviders');
    });

    it('should return numeric values', async () => {
      const result = await getAnalyticsOverview();

      expect(typeof result.totalUsers).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(typeof result.totalBookings).toBe('number');
    });
  });
});
