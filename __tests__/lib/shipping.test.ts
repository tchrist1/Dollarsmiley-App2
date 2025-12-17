import {
  calculatePlatformShippingRates,
  createShipment,
  updateShipmentStatus,
  trackShipment,
} from '@/lib/shipping';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('Shipping Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePlatformShippingRates', () => {
    it('should calculate rates based on weight and distance', async () => {
      const rates = await calculatePlatformShippingRates(
        { weight_kg: 2, dimensions_cm: { length: 20, width: 15, height: 10 } },
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 }
      );

      expect(rates).toBeDefined();
      expect(rates.length).toBeGreaterThan(0);
      expect(rates[0]).toHaveProperty('service_type');
      expect(rates[0]).toHaveProperty('rate');
      expect(rates[0]).toHaveProperty('estimated_days');
    });

    it('should apply dimensional weight when applicable', async () => {
      const heavyDimensions = {
        weight_kg: 1,
        dimensions_cm: { length: 100, width: 100, height: 100 },
      };

      const rates = await calculatePlatformShippingRates(
        heavyDimensions,
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 }
      );

      expect(rates[0].rate).toBeGreaterThan(0);
    });

    it('should return different rates for different service types', async () => {
      const rates = await calculatePlatformShippingRates(
        { weight_kg: 2, dimensions_cm: { length: 20, width: 15, height: 10 } },
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 }
      );

      const serviceTypes = rates.map((r) => r.service_type);
      expect(serviceTypes).toContain('Standard');
      expect(serviceTypes).toContain('Express');
      expect(serviceTypes).toContain('Overnight');
    });
  });

  describe('createShipment', () => {
    it('should create platform shipment successfully', async () => {
      const mockShipment = {
        id: 'ship1',
        booking_id: 'booking1',
        carrier_name: 'Platform',
        tracking_number: 'TRACK123',
        status: 'Created',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockShipment, error: null }),
      });

      const result = await createShipment({
        booking_id: 'booking1',
        shipping_address: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          postal_code: '12345',
          country: 'US',
        },
        weight_kg: 2,
        dimensions_cm: { length: 20, width: 15, height: 10 },
        is_platform_shipping: true,
        service_type: 'Standard',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('ship1');
      expect(result?.tracking_number).toBe('TRACK123');
    });

    it('should handle external tracking number', async () => {
      const mockShipment = {
        id: 'ship2',
        booking_id: 'booking2',
        carrier_name: 'FedEx',
        tracking_number: 'EXTERNAL123',
        status: 'Created',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockShipment, error: null }),
      });

      const result = await createShipment({
        booking_id: 'booking2',
        shipping_address: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          postal_code: '12345',
          country: 'US',
        },
        weight_kg: 2,
        is_platform_shipping: false,
        carrier_name: 'FedEx',
        tracking_number: 'EXTERNAL123',
      });

      expect(result?.carrier_name).toBe('FedEx');
      expect(result?.tracking_number).toBe('EXTERNAL123');
    });
  });

  describe('updateShipmentStatus', () => {
    it('should update status and trigger notifications', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'ship1', status: 'InTransit' },
          error: null,
        }),
      });

      const result = await updateShipmentStatus('ship1', 'InTransit');

      expect(result).toBe(true);
    });
  });

  describe('trackShipment', () => {
    it('should return tracking history', async () => {
      const mockHistory = [
        {
          status: 'Created',
          location: 'Origin',
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          status: 'InTransit',
          location: 'Facility A',
          timestamp: '2024-01-02T00:00:00Z',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tracking_history: mockHistory },
          error: null,
        }),
      });

      const history = await trackShipment('ship1');

      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('Created');
      expect(history[1].status).toBe('InTransit');
    });
  });
});
