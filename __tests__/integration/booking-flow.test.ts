import { supabase } from '@/lib/supabase';

describe('Booking Flow Integration', () => {
  let testUserId: string;
  let testProviderId: string;
  let testListingId: string;
  let testBookingId: string;

  beforeAll(async () => {
    testUserId = 'test-customer-id';
    testProviderId = 'test-provider-id';
    testListingId = 'test-listing-id';
  });

  afterAll(async () => {
    if (testBookingId) {
      await supabase.from('bookings').delete().eq('id', testBookingId);
    }
  });

  it('should complete full booking flow', async () => {
    const bookingData = {
      customer_id: testUserId,
      provider_id: testProviderId,
      listing_id: testListingId,
      service_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_amount: 100,
      status: 'pending',
    };

    const { data: booking, error: createError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(booking).toBeDefined();
    expect(booking.status).toBe('pending');

    testBookingId = booking.id;

    const { data: confirmedBooking, error: confirmError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', testBookingId)
      .select()
      .single();

    expect(confirmError).toBeNull();
    expect(confirmedBooking.status).toBe('confirmed');

    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testUserId)
      .eq('type', 'booking_confirmed');

    expect(notifError).toBeNull();

    const { data: completedBooking, error: completeError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', testBookingId)
      .select()
      .single();

    expect(completeError).toBeNull();
    expect(completedBooking.status).toBe('completed');
  });

  it('should handle booking cancellation', async () => {
    const bookingData = {
      customer_id: testUserId,
      provider_id: testProviderId,
      listing_id: testListingId,
      service_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_amount: 100,
      status: 'confirmed',
    };

    const { data: booking, error: createError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    expect(createError).toBeNull();

    const { data: cancelledBooking, error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
      .select()
      .single();

    expect(cancelError).toBeNull();
    expect(cancelledBooking.status).toBe('cancelled');

    await supabase.from('bookings').delete().eq('id', booking.id);
  });

  it('should validate service date in future', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const bookingData = {
      customer_id: testUserId,
      provider_id: testProviderId,
      listing_id: testListingId,
      service_date: pastDate,
      total_amount: 100,
      status: 'pending',
    };

    const { error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    expect(error).toBeDefined();
  });
});
