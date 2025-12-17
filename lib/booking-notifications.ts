import { supabase } from './supabase';
import { createNotification } from './notifications';

export interface BookingNotificationData {
  bookingId: string;
  bookingTitle: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  scheduledDate: string;
  scheduledTime: string;
  price: number;
  location?: string;
}

export class BookingNotificationService {
  /**
   * Send notification when new booking is requested
   */
  static async notifyBookingRequested(data: BookingNotificationData): Promise<void> {
    try {
      await createNotification(
        data.providerId,
        'booking_requested',
        'New Booking Request',
        `${data.customerName} has requested a booking for ${data.bookingTitle}`,
        {
          booking_id: data.bookingId,
          customer_id: data.customerId,
          scheduled_date: data.scheduledDate,
          scheduled_time: data.scheduledTime,
          price: data.price,
          action_url: `/provider/booking-details?bookingId=${data.bookingId}`,
        }
      );
    } catch (error) {
      console.error('Error sending booking requested notification:', error);
    }
  }

  /**
   * Send notification when booking is confirmed
   */
  static async notifyBookingConfirmed(
    data: BookingNotificationData,
    notes?: string
  ): Promise<void> {
    try {
      await Promise.all([
        createNotification(
          data.customerId,
          'booking_confirmed',
          'Booking Confirmed',
          `Your booking for ${data.bookingTitle} on ${new Date(
            data.scheduledDate
          ).toLocaleDateString()} has been confirmed${notes ? `: ${notes}` : ''}`,
          {
            booking_id: data.bookingId,
            provider_id: data.providerId,
            provider_name: data.providerName,
            scheduled_date: data.scheduledDate,
            scheduled_time: data.scheduledTime,
            notes,
            action_url: `/booking/${data.bookingId}`,
          }
        ),
        createNotification(
          data.providerId,
          'booking_confirmed',
          'Booking Confirmed',
          `You confirmed the booking for ${data.customerName}`,
          {
            booking_id: data.bookingId,
            customer_id: data.customerId,
            scheduled_date: data.scheduledDate,
            scheduled_time: data.scheduledTime,
            action_url: `/provider/booking-details?bookingId=${data.bookingId}`,
          }
        ),
      ]);
    } catch (error) {
      console.error('Error sending booking confirmed notifications:', error);
    }
  }

  /**
   * Send notification when booking is cancelled
   */
  static async notifyBookingCancelled(
    data: BookingNotificationData,
    cancelledBy: 'customer' | 'provider',
    reason?: string
  ): Promise<void> {
    try {
      const customerMessage =
        cancelledBy === 'customer'
          ? `You cancelled your booking for ${data.bookingTitle}${
              reason ? `: ${reason}` : ''
            }`
          : `Your booking for ${data.bookingTitle} has been cancelled by the provider${
              reason ? `: ${reason}` : ''
            }`;

      const providerMessage =
        cancelledBy === 'provider'
          ? `You declined the booking from ${data.customerName}${reason ? `: ${reason}` : ''}`
          : `${data.customerName} cancelled their booking for ${data.bookingTitle}${
              reason ? `: ${reason}` : ''
            }`;

      await Promise.all([
        createNotification(
          data.customerId,
          'booking_cancelled',
          'Booking Cancelled',
          customerMessage,
          {
            booking_id: data.bookingId,
            cancelled_by: cancelledBy,
            reason,
            will_refund: true,
            action_url: `/booking/${data.bookingId}`,
          }
        ),
        createNotification(
          data.providerId,
          'booking_cancelled',
          'Booking Cancelled',
          providerMessage,
          {
            booking_id: data.bookingId,
            cancelled_by: cancelledBy,
            reason,
            action_url: `/provider/booking-details?bookingId=${data.bookingId}`,
          }
        ),
      ]);
    } catch (error) {
      console.error('Error sending booking cancelled notifications:', error);
    }
  }

  /**
   * Send notification when booking starts
   */
  static async notifyBookingStarted(data: BookingNotificationData): Promise<void> {
    try {
      await Promise.all([
        createNotification(
          data.customerId,
          'booking_started',
          'Service Started',
          `${data.providerName} has started your service for ${data.bookingTitle}`,
          {
            booking_id: data.bookingId,
            provider_id: data.providerId,
            action_url: `/booking/${data.bookingId}`,
          }
        ),
        createNotification(
          data.providerId,
          'booking_started',
          'Service Started',
          `You started the service for ${data.customerName}`,
          {
            booking_id: data.bookingId,
            customer_id: data.customerId,
            action_url: `/provider/booking-details?bookingId=${data.bookingId}`,
          }
        ),
      ]);
    } catch (error) {
      console.error('Error sending booking started notifications:', error);
    }
  }

  /**
   * Send notification when booking is completed
   */
  static async notifyBookingCompleted(data: BookingNotificationData): Promise<void> {
    try {
      const providerEarnings = data.price * 0.9;

      await Promise.all([
        createNotification(
          data.customerId,
          'booking_completed',
          'Service Completed',
          `${data.providerName} has completed your ${data.bookingTitle} service. Please leave a review!`,
          {
            booking_id: data.bookingId,
            provider_id: data.providerId,
            provider_name: data.providerName,
            can_review: true,
            action_url: `/review/${data.bookingId}`,
          }
        ),
        createNotification(
          data.providerId,
          'booking_completed',
          'Service Completed',
          `You completed the service for ${data.customerName}. Payment of $${providerEarnings.toFixed(
            2
          )} will be released to your wallet.`,
          {
            booking_id: data.bookingId,
            customer_id: data.customerId,
            earnings: providerEarnings,
            action_url: `/provider/booking-details?bookingId=${data.bookingId}`,
          }
        ),
      ]);
    } catch (error) {
      console.error('Error sending booking completed notifications:', error);
    }
  }

  /**
   * Send reminder notification before booking
   */
  static async notifyBookingReminder(
    data: BookingNotificationData,
    hoursUntil: number
  ): Promise<void> {
    try {
      const timeText = hoursUntil === 24 ? 'tomorrow' : `in ${hoursUntil} hours`;

      await Promise.all([
        createNotification(
          data.customerId,
          'booking_reminder',
          'Upcoming Booking',
          `Reminder: Your ${data.bookingTitle} booking is ${timeText} at ${data.scheduledTime}`,
          {
            booking_id: data.bookingId,
            scheduled_date: data.scheduledDate,
            scheduled_time: data.scheduledTime,
            location: data.location,
            action_url: `/booking/${data.bookingId}`,
          }
        ),
        createNotification(
          data.providerId,
          'booking_reminder',
          'Upcoming Booking',
          `Reminder: Service for ${data.customerName} is ${timeText} at ${data.scheduledTime}`,
          {
            booking_id: data.bookingId,
            customer_name: data.customerName,
            scheduled_date: data.scheduledDate,
            scheduled_time: data.scheduledTime,
            location: data.location,
            action_url: `/provider/booking-details?bookingId=${data.bookingId}`,
          }
        ),
      ]);
    } catch (error) {
      console.error('Error sending booking reminder notifications:', error);
    }
  }

  /**
   * Send notification for payment received
   */
  static async notifyPaymentReceived(
    customerId: string,
    bookingId: string,
    bookingTitle: string,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    try {
      await createNotification(
        customerId,
        'payment_received',
        'Payment Confirmed',
        `Your payment of $${amount.toFixed(2)} for ${bookingTitle} has been received and held in escrow`,
        {
          booking_id: bookingId,
          amount,
          payment_method: paymentMethod,
          escrow_protected: true,
          action_url: `/booking/${bookingId}`,
        }
      );
    } catch (error) {
      console.error('Error sending payment received notification:', error);
    }
  }

  /**
   * Send notification for payout processed
   */
  static async notifyPayoutProcessed(
    providerId: string,
    bookingId: string,
    bookingTitle: string,
    amount: number
  ): Promise<void> {
    try {
      await createNotification(
        providerId,
        'payout_processed',
        'Payment Received',
        `You received $${amount.toFixed(2)} for ${bookingTitle}. Funds are now available in your wallet.`,
        {
          booking_id: bookingId,
          amount,
          action_url: `/wallet`,
        }
      );
    } catch (error) {
      console.error('Error sending payout processed notification:', error);
    }
  }

  /**
   * Send notification for refund processed
   */
  static async notifyRefundProcessed(
    customerId: string,
    bookingId: string,
    bookingTitle: string,
    amount: number
  ): Promise<void> {
    try {
      await createNotification(
        customerId,
        'refund_processed',
        'Refund Processed',
        `Your refund of $${amount.toFixed(2)} for ${bookingTitle} has been processed and will appear in 5-10 business days`,
        {
          booking_id: bookingId,
          amount,
          processing_days: '5-10',
          action_url: `/booking/${bookingId}`,
        }
      );
    } catch (error) {
      console.error('Error sending refund processed notification:', error);
    }
  }

  /**
   * Send notification for booking response deadline
   */
  static async notifyProviderResponseDeadline(
    providerId: string,
    bookingId: string,
    customerName: string,
    bookingTitle: string,
    hoursRemaining: number
  ): Promise<void> {
    try {
      await createNotification(
        providerId,
        'booking_response_deadline',
        'Response Required',
        `Please respond to ${customerName}'s booking request for ${bookingTitle}. ${hoursRemaining} hours remaining.`,
        {
          booking_id: bookingId,
          hours_remaining: hoursRemaining,
          action_url: `/provider/booking-details?bookingId=${bookingId}`,
          priority: 'high',
        }
      );
    } catch (error) {
      console.error('Error sending provider response deadline notification:', error);
    }
  }

  /**
   * Send notification when booking review is posted
   */
  static async notifyReviewReceived(
    providerId: string,
    customerId: string,
    customerName: string,
    bookingId: string,
    bookingTitle: string,
    rating: number
  ): Promise<void> {
    try {
      await createNotification(
        providerId,
        'review_received',
        'New Review',
        `${customerName} left you a ${rating}-star review for ${bookingTitle}`,
        {
          booking_id: bookingId,
          customer_id: customerId,
          rating,
          action_url: `/reviews/${providerId}`,
        }
      );
    } catch (error) {
      console.error('Error sending review received notification:', error);
    }
  }

  /**
   * Send notification when booking has dispute
   */
  static async notifyDisputeFiled(
    data: BookingNotificationData,
    filedBy: 'customer' | 'provider',
    disputeType: string
  ): Promise<void> {
    try {
      const otherPartyId = filedBy === 'customer' ? data.providerId : data.customerId;
      const otherPartyName = filedBy === 'customer' ? data.providerName : data.customerName;
      const filerName = filedBy === 'customer' ? data.customerName : data.providerName;

      await createNotification(
        otherPartyId,
        'dispute_filed',
        'Dispute Filed',
        `${filerName} has filed a ${disputeType} dispute for ${data.bookingTitle}`,
        {
          booking_id: data.bookingId,
          dispute_type: disputeType,
          filed_by: filedBy,
          action_url: `/booking/${data.bookingId}`,
          priority: 'high',
        }
      );
    } catch (error) {
      console.error('Error sending dispute filed notification:', error);
    }
  }

  /**
   * Get all booking-related notifications for a user
   */
  static async getBookingNotifications(
    userId: string,
    bookingId?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .in('type', [
          'booking_requested',
          'booking_confirmed',
          'booking_cancelled',
          'booking_started',
          'booking_completed',
          'booking_reminder',
          'booking_response_deadline',
        ])
        .order('created_at', { ascending: false });

      if (bookingId) {
        query = query.contains('data', { booking_id: bookingId });
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching booking notifications:', error);
      return [];
    }
  }
}

export default BookingNotificationService;
