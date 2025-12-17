import { searchListings, getActiveFilterCount, getFilterSummary } from '@/lib/enhanced-search';
import { supabase } from '@/lib/supabase';
import { FilterOptions } from '@/components/FilterModal';

jest.mock('@/lib/supabase');

describe('Enhanced Search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchListings', () => {
    it('should search with custom service filter', async () => {
      const mockData = [
        {
          id: '1',
          title: 'Custom Service',
          listing_type: 'CustomService',
          base_price: 100,
          fulfillment_options: [{ fulfillment_type: 'Shipping' }],
          value_added_services: [{ id: '1', is_active: true }],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const filters: FilterOptions = {
        categories: [],
        location: '',
        priceMin: '',
        priceMax: '',
        minRating: 0,
        listingType: 'CustomService',
        fulfillmentTypes: ['Shipping'],
        hasVAS: true,
      };

      const results = await searchListings('test', filters);

      expect(results).toHaveLength(1);
      expect(results[0].listing_type).toBe('CustomService');
    });

    it('should filter by fulfillment types', async () => {
      const mockData = [
        {
          id: '1',
          fulfillment_options: [
            { fulfillment_type: 'Pickup' },
            { fulfillment_type: 'Shipping' },
          ],
        },
        {
          id: '2',
          fulfillment_options: [{ fulfillment_type: 'DropOff' }],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const filters: FilterOptions = {
        categories: [],
        location: '',
        priceMin: '',
        priceMax: '',
        minRating: 0,
        fulfillmentTypes: ['Pickup'],
      };

      const results = await searchListings('', filters);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should filter by VAS availability', async () => {
      const mockData = [
        {
          id: '1',
          value_added_services: [
            { id: '1', is_active: true },
            { id: '2', is_active: true },
          ],
        },
        {
          id: '2',
          value_added_services: [{ id: '3', is_active: false }],
        },
        {
          id: '3',
          value_added_services: [],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const filters: FilterOptions = {
        categories: [],
        location: '',
        priceMin: '',
        priceMax: '',
        minRating: 0,
        hasVAS: true,
      };

      const results = await searchListings('', filters);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });
  });

  describe('getActiveFilterCount', () => {
    it('should count active filters correctly', () => {
      const filters: FilterOptions = {
        categories: ['cat1', 'cat2'],
        location: '',
        priceMin: '10',
        priceMax: '100',
        minRating: 4,
        verified: true,
        listingType: 'CustomService',
        fulfillmentTypes: ['Pickup', 'Shipping'],
        hasVAS: true,
      };

      const count = getActiveFilterCount(filters);

      expect(count).toBe(7);
    });

    it('should return 0 for default filters', () => {
      const filters: FilterOptions = {
        categories: [],
        location: '',
        priceMin: '',
        priceMax: '',
        minRating: 0,
        listingType: 'all',
        fulfillmentTypes: [],
        shippingMode: 'all',
      };

      const count = getActiveFilterCount(filters);

      expect(count).toBe(0);
    });
  });

  describe('getFilterSummary', () => {
    it('should generate correct summary', () => {
      const filters: FilterOptions = {
        categories: ['cat1', 'cat2'],
        location: '',
        priceMin: '10',
        priceMax: '100',
        minRating: 4,
        listingType: 'CustomService',
        fulfillmentTypes: ['Pickup', 'Shipping'],
        hasVAS: true,
      };

      const summary = getFilterSummary(filters);

      expect(summary).toContain('2 categories');
      expect(summary).toContain('$10-$100');
      expect(summary).toContain('4+ stars');
      expect(summary).toContain('Custom Services');
      expect(summary).toContain('Pickup, Shipping');
      expect(summary).toContain('With Add-ons');
    });
  });
});
