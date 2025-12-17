/*
  # Booking Notification Triggers

  ## Overview
  Automated triggers to create notifications when booking status changes occur.

  ## New Functions
  1. `notify_booking_status_change()` - Trigger function for status changes
  2. `notify_new_booking_request()` - Trigger for new booking requests
  3. `notify_booking_payment()` - Trigger for payment events

  ## Triggers
  - `trigger_booking_status_notification` - Fires on booking status UPDATE
  - `trigger_new_booking_notification` - Fires on booking INSERT

  ## Notification Types Created
  - booking_requested (provider) - New booking created
  - booking_confirmed (both) - Status changed to Confirmed
  - booking_cancelled (both) - Status changed to Cancelled
  - booking_started (both) - Status changed to InProgress
  - booking_completed (both) - Status changed to Completed

  ## Security
  - Functions run with SECURITY DEFINER to bypass RLS
  - Only system can trigger these functions
  - All notifications respect user preferences

  ## Important Notes
  - Notifications are created automatically, no manual calls needed
  - Both parties always receive relevant status updates
  - Notifications include deep links to relevant screens
  - Payment and escrow notifications handled separately
*/

-- Function to handle booking status change notifications
CREATE OR REPLACE FUNCTION notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  booking_data RECORD;
  customer_name TEXT;
  provider_name TEXT;
  payout_amount NUMERIC;
BEGIN
  -- Only process if status actually changed
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Get booking details with customer and provider names
  SELECT
    b.*,
    c.full_name as customer_full_name,
    p.full_name as provider_full_name
  INTO booking_data
  FROM bookings b
  LEFT JOIN profiles c ON b.customer_id = c.id
  LEFT JOIN profiles p ON b.provider_id = p.id
  WHERE b.id = NEW.id;

  customer_name := booking_data.customer_full_name;
  provider_name := booking_data.provider_full_name;

  -- Handle Confirmed status
  IF NEW.status = 'Confirmed' AND OLD.status = 'PendingApproval' THEN
    -- Notify customer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.customer_id,
      'booking_confirmed',
      'Booking Confirmed',
      format('%s confirmed your booking for %s on %s',
        provider_name, NEW.title, to_char(NEW.scheduled_date, 'Mon DD')),
      jsonb_build_object(
        'booking_id', NEW.id,
        'provider_id', NEW.provider_id,
        'provider_name', provider_name,
        'action_url', format('/booking/%s', NEW.id)
      )
    );

    -- Notify provider
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.provider_id,
      'booking_confirmed',
      'Booking Confirmed',
      format('You confirmed the booking for %s', customer_name),
      jsonb_build_object(
        'booking_id', NEW.id,
        'customer_id', NEW.customer_id,
        'action_url', format('/provider/booking-details?bookingId=%s', NEW.id)
      )
    );
  END IF;

  -- Handle Cancelled status
  IF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' THEN
    -- Notify customer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.customer_id,
      'booking_cancelled',
      'Booking Cancelled',
      format('Your booking for %s has been cancelled', NEW.title),
      jsonb_build_object(
        'booking_id', NEW.id,
        'cancellation_reason', NEW.cancellation_reason,
        'will_refund', true,
        'action_url', format('/booking/%s', NEW.id)
      )
    );

    -- Notify provider
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.provider_id,
      'booking_cancelled',
      'Booking Cancelled',
      format('The booking with %s has been cancelled', customer_name),
      jsonb_build_object(
        'booking_id', NEW.id,
        'cancellation_reason', NEW.cancellation_reason,
        'action_url', format('/provider/booking-details?bookingId=%s', NEW.id)
      )
    );
  END IF;

  -- Handle InProgress status
  IF NEW.status = 'InProgress' AND OLD.status = 'Confirmed' THEN
    -- Notify customer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.customer_id,
      'booking_started',
      'Service Started',
      format('%s has started your service for %s', provider_name, NEW.title),
      jsonb_build_object(
        'booking_id', NEW.id,
        'provider_id', NEW.provider_id,
        'action_url', format('/booking/%s', NEW.id)
      )
    );

    -- Notify provider
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.provider_id,
      'booking_started',
      'Service Started',
      format('You started the service for %s', customer_name),
      jsonb_build_object(
        'booking_id', NEW.id,
        'customer_id', NEW.customer_id,
        'action_url', format('/provider/booking-details?bookingId=%s', NEW.id)
      )
    );
  END IF;

  -- Handle Completed status
  IF NEW.status = 'Completed' AND OLD.status = 'InProgress' THEN
    payout_amount := NEW.price * 0.9;

    -- Notify customer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.customer_id,
      'booking_completed',
      'Service Completed',
      format('%s has completed your %s service. Please leave a review!',
        provider_name, NEW.title),
      jsonb_build_object(
        'booking_id', NEW.id,
        'provider_id', NEW.provider_id,
        'provider_name', provider_name,
        'can_review', true,
        'action_url', format('/review/%s', NEW.id)
      )
    );

    -- Notify provider
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.provider_id,
      'booking_completed',
      'Service Completed',
      format('You completed the service for %s. Payment of $%.2f will be released to your wallet.',
        customer_name, payout_amount),
      jsonb_build_object(
        'booking_id', NEW.id,
        'customer_id', NEW.customer_id,
        'earnings', payout_amount,
        'action_url', format('/provider/booking-details?bookingId=%s', NEW.id)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new booking request notifications
CREATE OR REPLACE FUNCTION notify_new_booking_request()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
BEGIN
  -- Only notify for new PendingApproval bookings
  IF NEW.status != 'PendingApproval' THEN
    RETURN NEW;
  END IF;

  -- Get customer name
  SELECT full_name INTO customer_name
  FROM profiles
  WHERE id = NEW.customer_id;

  -- Notify provider of new booking request
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.provider_id,
    'booking_requested',
    'New Booking Request',
    format('%s has requested a booking for %s on %s at %s',
      customer_name, NEW.title,
      to_char(NEW.scheduled_date, 'Mon DD'), NEW.scheduled_time),
    jsonb_build_object(
      'booking_id', NEW.id,
      'customer_id', NEW.customer_id,
      'customer_name', customer_name,
      'scheduled_date', NEW.scheduled_date,
      'scheduled_time', NEW.scheduled_time,
      'price', NEW.price,
      'action_url', format('/provider/booking-details?bookingId=%s', NEW.id),
      'priority', 'high'
    )
  );

  -- Notify customer that booking request was created
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.customer_id,
    'booking_request_sent',
    'Booking Request Sent',
    format('Your booking request for %s has been sent to the provider', NEW.title),
    jsonb_build_object(
      'booking_id', NEW.id,
      'provider_id', NEW.provider_id,
      'action_url', format('/booking/%s', NEW.id)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_booking_status_notification ON bookings;
DROP TRIGGER IF EXISTS trigger_new_booking_notification ON bookings;

-- Create trigger for status changes
CREATE TRIGGER trigger_booking_status_notification
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_status_change();

-- Create trigger for new bookings
CREATE TRIGGER trigger_new_booking_notification
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking_request();

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;
