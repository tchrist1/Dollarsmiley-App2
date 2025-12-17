import {
  createPaymentIntent,
  confirmPayment,
  processRefund,
} from '@/lib/stripe-payments';

jest.mock('@/lib/supabase');

describe('Stripe Payment Functions', () => {
  describe('createPaymentIntent', () => {
    it('should create payment intent with valid data', async () => {
      const result = await createPaymentIntent({
        amount: 10000,
        currency: 'usd',
        customer_id: 'test-customer-id',
        booking_id: 'test-booking-id',
      });

      expect(result).toBeDefined();
    });

    it('should handle amount validation', async () => {
      await expect(
        createPaymentIntent({
          amount: -100,
          currency: 'usd',
          customer_id: 'test-customer-id',
          booking_id: 'test-booking-id',
        })
      ).rejects.toThrow();
    });

    it('should require customer_id', async () => {
      await expect(
        createPaymentIntent({
          amount: 10000,
          currency: 'usd',
          customer_id: '',
          booking_id: 'test-booking-id',
        })
      ).rejects.toThrow();
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment with valid intent', async () => {
      const result = await confirmPayment('test-payment-intent-id');
      expect(result).toBeDefined();
    });

    it('should handle invalid payment intent', async () => {
      await expect(confirmPayment('')).rejects.toThrow();
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const result = await processRefund({
        payment_intent_id: 'test-payment-intent',
        amount: 5000,
        reason: 'customer_request',
      });

      expect(result).toBeDefined();
    });

    it('should validate refund amount', async () => {
      await expect(
        processRefund({
          payment_intent_id: 'test-payment-intent',
          amount: -100,
          reason: 'customer_request',
        })
      ).rejects.toThrow();
    });
  });
});
