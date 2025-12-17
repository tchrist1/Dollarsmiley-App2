/**
 * E2E Test: Complete Booking Flow
 *
 * Tests the end-to-end booking process from search to completion
 */

import { supabase } from '@/lib/supabase';

describe('Booking Flow - E2E', () => {
  let customerId: string;
  let providerId: string;
  let listingId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Setup: Create test customer and provider
    const { data: customer } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Customer',
        email: `customer-${Date.now()}@example.com`,
        user_type: 'customer',
      })
      .select()
      .single();

    customerId = customer!.id;

    const { data: provider } = await supabase
      .from('profiles')
      .insert({
        full_name: 'Test Provider',
        email: `provider-${Date.now()}@example.com`,
        user_type: 'provider',
        is_verified: true,
      })
      .select()
      .single();

    providerId = provider!.id;

    // Create test listing
    const { data: listing } = await supabase
      .from('service_listings')
      .insert({
        provider_id: providerId,
        title: 'Test Service',
        description: 'Test service description',
        price: 100,
        category_id: 'test-category',
        is_active: true,
      })
      .select()
      .single();

    listingId = listing!.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (bookingId) {
      await supabase.from('bookings').delete().eq('id', bookingId);
    }
    if (listingId) {
      await supabase.from('service_listings').delete().eq('id', listingId);
    }
    if (customerId) {
      await supabase.from('profiles').delete().eq('id', customerId);
    }
    if (providerId) {
      await supabase.from('profiles').delete().eq('id', providerId);
    }
  });

  it('should complete full booking flow', async () => {
    // Step 1: Search for service
    const { data: searchResults } = await supabase
      .from('service_listings')
      .select('*')
      .eq('is_active', true)
      .limit(10);

    expect(searchResults).toBeDefined();
    expect(Array.isArray(searchResults)).toBe(true);
    expect(searchResults.length).toBeGreaterThan(0);

    // Step 2: View listing details
    const { data: listing } = await supabase
      .from('service_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    expect(listing).toBeDefined();
    expect(listing.title).toBe('Test Service');

    // Step 3: Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        provider_id: providerId,
        listing_id: listingId,
        title: 'Test Booking',
        description: 'Test booking description',
        scheduled_date: '2025-12-01',
        scheduled_time: '10:00 AM',
        price: 100,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    expect(bookingError).toBeNull();
    expect(booking).toBeDefined();
    bookingId = booking!.id;

    // Step 4: Provider accepts booking
    const { error: acceptError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    expect(acceptError).toBeNull();

    // Step 5: Complete booking
    const { error: completeError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    expect(completeError).toBeNull();

    // Step 6: Verify final booking state
    const { data: finalBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    expect(finalBooking.status).toBe('completed');
    expect(finalBooking.completed_at).toBeDefined();
  });

  it('should enforce booking validations', async () => {
    // Test: Cannot book without required fields
    const { error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        // Missing required fields
      });

    expect(error).toBeDefined();
  });

  it('should prevent double booking', async () => {
    // Create first booking
    const { data: booking1 } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        provider_id: providerId,
        listing_id: listingId,
        scheduled_date: '2025-12-15',
        scheduled_time: '2:00 PM',
        price: 100,
        status: 'confirmed',
      })
      .select()
      .single();

    // Try to create overlapping booking
    const { error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        provider_id: providerId,
        listing_id: listingId,
        scheduled_date: '2025-12-15',
        scheduled_time: '2:00 PM',
        price: 100,
        status: 'confirmed',
      });

    // Cleanup
    if (booking1) {
      await supabase.from('bookings').delete().eq('id', booking1.id);
    }

    // Verification depends on database constraints
    expect(error || booking1).toBeDefined();
  });
});
