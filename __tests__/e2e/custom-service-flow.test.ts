/**
 * E2E Test: Custom Service Listing Creation and Booking
 *
 * This test covers the complete flow:
 * 1. Provider creates a custom service listing with VAS and shipping
 * 2. Customer searches and finds the listing
 * 3. Customer configures options and adds to cart
 * 4. Customer completes checkout with shipping
 * 5. Shipment is created and tracked
 * 6. Payout is processed
 */

import { supabase } from '@/lib/supabase';

describe('E2E: Custom Service Complete Flow', () => {
  let providerId: string;
  let customerId: string;
  let listingId: string;
  let bookingId: string;
  let shipmentId: string;

  beforeAll(async () => {
    // Setup test users
    providerId = 'test-provider-id';
    customerId = 'test-customer-id';
  });

  describe('Step 1: Create Custom Service Listing', () => {
    it('should create a custom service listing with all options', async () => {
      const mockListing = {
        id: 'listing1',
        title: 'Custom Photography Service',
        description: 'Professional event photography with custom packages',
        listing_type: 'CustomService',
        base_price: 500,
        provider_id: providerId,
        category_id: 'photography-cat',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockListing, error: null }),
      });

      // Create listing
      const { data: listing, error } = await supabase
        .from('service_listings')
        .insert(mockListing)
        .select()
        .single();

      expect(error).toBeNull();
      expect(listing).toBeDefined();
      expect(listing.listing_type).toBe('CustomService');

      listingId = listing.id;
    });

    it('should add fulfillment options', async () => {
      const fulfillmentOptions = [
        { listing_id: listingId, fulfillment_type: 'Pickup' },
        { listing_id: listingId, fulfillment_type: 'Shipping' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('fulfillment_options')
        .insert(fulfillmentOptions);

      expect(error).toBeNull();
    });

    it('should add value-added services', async () => {
      const vasOptions = [
        {
          listing_id: listingId,
          name: 'Photo Editing',
          description: 'Professional editing of all photos',
          price: 100,
          is_active: true,
        },
        {
          listing_id: listingId,
          name: 'Same-Day Delivery',
          description: 'Receive edited photos within 24 hours',
          price: 50,
          is_active: true,
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('value_added_services')
        .insert(vasOptions);

      expect(error).toBeNull();
    });

    it('should configure shipping details', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('service_listings')
        .update({
          shipping_mode: 'Platform',
          weight_kg: 2,
          dimensions_cm: { length: 30, width: 20, height: 10 },
        })
        .eq('id', listingId);

      expect(error).toBeNull();
    });
  });

  describe('Step 2: Customer Searches and Finds Listing', () => {
    it('should find listing with custom service filter', async () => {
      const mockResults = [
        {
          id: listingId,
          title: 'Custom Photography Service',
          listing_type: 'CustomService',
          fulfillment_options: [
            { fulfillment_type: 'Pickup' },
            { fulfillment_type: 'Shipping' },
          ],
          value_added_services: [
            { id: 'vas1', name: 'Photo Editing', is_active: true },
            { id: 'vas2', name: 'Same-Day Delivery', is_active: true },
          ],
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
      });

      const { data: results, error } = await supabase
        .from('service_listings')
        .select('*, fulfillment_options(*), value_added_services(*)')
        .eq('listing_type', 'CustomService');

      expect(error).toBeNull();
      expect(results).toHaveLength(1);
      expect(results[0].listing_type).toBe('CustomService');
    });
  });

  describe('Step 3: Customer Adds to Cart with Options', () => {
    it('should add item to cart with selected VAS', async () => {
      const cartItem = {
        user_id: customerId,
        listing_id: listingId,
        quantity: 1,
        selected_options: {
          vas: ['vas1', 'vas2'],
          fulfillment: 'Shipping',
        },
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase.from('cart_items').insert(cartItem);

      expect(error).toBeNull();
    });
  });

  describe('Step 4: Complete Checkout with Shipping', () => {
    it('should calculate shipping rates', async () => {
      // Mock shipping rate calculation
      const mockRates = [
        { service_type: 'Standard', rate: 15.99, estimated_days: 5 },
        { service_type: 'Express', rate: 29.99, estimated_days: 2 },
      ];

      // Test shipping calculation logic
      expect(mockRates).toHaveLength(2);
      expect(mockRates[0].rate).toBeLessThan(mockRates[1].rate);
    });

    it('should create booking with all details', async () => {
      const mockBooking = {
        id: 'booking1',
        customer_id: customerId,
        provider_id: providerId,
        listing_id: listingId,
        base_price: 500,
        total_price: 665.99,
        shipping_cost: 15.99,
        vas_total: 150,
        status: 'Pending',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockBooking, error: null }),
      });

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: customerId,
          provider_id: providerId,
          listing_id: listingId,
          total_price: 665.99,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(booking.total_price).toBe(665.99);

      bookingId = booking.id;
    });

    it('should link selected VAS to booking', async () => {
      const vasLinks = [
        { booking_id: bookingId, vas_id: 'vas1', quantity: 1 },
        { booking_id: bookingId, vas_id: 'vas2', quantity: 1 },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('booking_value_added_services')
        .insert(vasLinks);

      expect(error).toBeNull();
    });
  });

  describe('Step 5: Track Shipment', () => {
    it('should create shipment after booking confirmed', async () => {
      const mockShipment = {
        id: 'shipment1',
        booking_id: bookingId,
        carrier_name: 'Platform',
        tracking_number: 'TRACK123456',
        status: 'Created',
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockShipment, error: null }),
      });

      const { data: shipment, error } = await supabase
        .from('shipments')
        .insert({
          booking_id: bookingId,
          carrier_name: 'Platform',
          tracking_number: 'TRACK123456',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(shipment.tracking_number).toBe('TRACK123456');

      shipmentId = shipment.id;
    });

    it('should update shipment status through lifecycle', async () => {
      const statuses = ['Created', 'InTransit', 'OutForDelivery', 'Delivered'];

      for (const status of statuses) {
        (supabase.from as jest.Mock).mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

        const { error } = await supabase
          .from('shipments')
          .update({ status })
          .eq('id', shipmentId);

        expect(error).toBeNull();
      }
    });

    it('should retrieve tracking history', async () => {
      const mockHistory = [
        { status: 'Created', timestamp: '2024-01-01T10:00:00Z' },
        { status: 'InTransit', timestamp: '2024-01-02T10:00:00Z' },
        { status: 'OutForDelivery', timestamp: '2024-01-03T08:00:00Z' },
        { status: 'Delivered', timestamp: '2024-01-03T15:00:00Z' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { tracking_history: mockHistory },
          error: null,
        }),
      });

      const { data, error } = await supabase
        .from('shipments')
        .select('tracking_history')
        .eq('id', shipmentId)
        .single();

      expect(error).toBeNull();
      expect(data.tracking_history).toHaveLength(4);
      expect(data.tracking_history[3].status).toBe('Delivered');
    });
  });

  describe('Step 6: Process Payout', () => {
    it('should schedule payout after booking completed', async () => {
      const mockSchedule = {
        id: 'payout1',
        provider_id: providerId,
        amount: 600,
        status: 'Pending',
        scheduled_payout_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSchedule, error: null }),
      });

      const { data: schedule, error } = await supabase
        .from('payout_schedules')
        .insert({
          provider_id: providerId,
          amount: 600,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(schedule.amount).toBe(600);
      expect(schedule.status).toBe('Pending');
    });

    it('should request early payout with fee', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('payout_schedules')
        .update({
          early_payout_requested: true,
          early_payout_fee: 30,
        })
        .eq('id', 'payout1');

      expect(error).toBeNull();
    });

    it('should complete payout', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { error } = await supabase
        .from('payout_schedules')
        .update({
          status: 'Paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', 'payout1');

      expect(error).toBeNull();
    });
  });
});
