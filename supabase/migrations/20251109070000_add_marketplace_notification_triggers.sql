/*
  # Add Marketplace Notification Triggers

  1. Functions
    - `notify_custom_service_order_received` - Notifies provider of new custom service order
    - `notify_shipment_status_change` - Notifies customer of shipment status updates
    - `notify_payout_status_change` - Notifies provider of payout status changes (enhanced)
    - `notify_early_payout_status` - Notifies provider of early payout request status

  2. Triggers
    - On booking insert for custom services
    - On shipment status updates
    - On payout schedule status updates
    - On early payout request status changes

  3. Notes
    - All notifications include relevant data for deep linking
    - Priority levels set based on notification type
    - SMS enabled for time-sensitive updates
*/

-- Function to notify provider of custom service order
CREATE OR REPLACE FUNCTION notify_custom_service_order_received()
RETURNS TRIGGER AS $$
DECLARE
  listing_record RECORD;
  customer_record RECORD;
  formatted_amount text;
BEGIN
  -- Only notify for custom service orders
  SELECT listing_type, title INTO listing_record
  FROM service_listings
  WHERE id = NEW.listing_id;

  IF listing_record.listing_type != 'CustomService' THEN
    RETURN NEW;
  END IF;

  -- Get customer info
  SELECT full_name INTO customer_record
  FROM profiles
  WHERE id = NEW.customer_id;

  formatted_amount := '$' || ROUND(NEW.total_price::numeric, 2)::text;

  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    priority
  ) VALUES (
    NEW.provider_id,
    'custom_service_order_received',
    'New Custom Service Order',
    COALESCE(customer_record.full_name, 'A customer') || ' ordered "' || listing_record.title || '" for ' || formatted_amount,
    jsonb_build_object(
      'booking_id', NEW.id,
      'customer_name', customer_record.full_name,
      'service_title', listing_record.title,
      'amount', NEW.total_price
    ),
    false,
    'high'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify customer of shipment status changes
CREATE OR REPLACE FUNCTION notify_shipment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  customer_id uuid;
  notification_type text;
  notification_title text;
  notification_message text;
  notification_priority text;
  formatted_time text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get customer ID from booking
  SELECT bookings.customer_id INTO customer_id
  FROM bookings
  WHERE bookings.id = NEW.booking_id;

  IF customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine notification details based on status
  CASE NEW.status
    WHEN 'Created' THEN
      notification_type := 'shipment_created';
      notification_title := 'Shipment Created';
      notification_message := 'Your order has been shipped via ' || COALESCE(NEW.carrier_name, 'carrier') || '. Tracking: ' || COALESCE(NEW.tracking_number, 'pending');
      notification_priority := 'normal';

    WHEN 'InTransit' THEN
      notification_type := 'shipment_in_transit';
      notification_title := 'Package In Transit';
      notification_message := 'Your package is on its way!';
      IF NEW.estimated_delivery IS NOT NULL THEN
        notification_message := notification_message || ' Estimated delivery: ' || TO_CHAR(NEW.estimated_delivery, 'Mon DD, YYYY');
      END IF;
      notification_priority := 'low';

    WHEN 'OutForDelivery' THEN
      notification_type := 'shipment_out_for_delivery';
      notification_title := 'Out for Delivery';
      notification_message := 'Your package is out for delivery today!';
      notification_priority := 'high';

    WHEN 'Delivered' THEN
      notification_type := 'shipment_delivered';
      notification_title := 'Package Delivered';
      formatted_time := TO_CHAR(NEW.delivered_at, 'HH:MI AM');
      notification_message := 'Your package was delivered at ' || formatted_time;
      notification_priority := 'normal';

    ELSE
      RETURN NEW;
  END CASE;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    priority
  ) VALUES (
    customer_id,
    notification_type,
    notification_title,
    notification_message,
    jsonb_build_object(
      'shipment_id', NEW.id,
      'tracking_number', NEW.tracking_number,
      'carrier', NEW.carrier_name,
      'status', NEW.status,
      'estimated_delivery', NEW.estimated_delivery,
      'delivered_at', NEW.delivered_at
    ),
    false,
    notification_priority
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function for payout status notifications
CREATE OR REPLACE FUNCTION notify_payout_status_change_enhanced()
RETURNS TRIGGER AS $$
DECLARE
  formatted_amount text;
  formatted_date text;
  notification_type text;
  notification_title text;
  notification_message text;
  notification_priority text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  formatted_amount := '$' || ROUND(NEW.amount::numeric, 2)::text;

  CASE NEW.status
    WHEN 'Pending' THEN
      -- Initial scheduling notification
      IF OLD.status IS NULL OR OLD.status = 'Draft' THEN
        notification_type := 'payout_scheduled';
        notification_title := 'Payout Scheduled';
        formatted_date := TO_CHAR(NEW.scheduled_payout_date, 'Mon DD, YYYY');
        notification_message := 'Your payout of ' || formatted_amount || ' is scheduled for ' || formatted_date;
        notification_priority := 'normal';
      END IF;

    WHEN 'Processing' THEN
      notification_type := 'payout_processing';
      notification_title := 'Payout Processing';
      notification_message := 'Your payout of ' || formatted_amount || ' is being processed';
      notification_priority := 'low';

    WHEN 'Paid' THEN
      notification_type := 'payout_completed';
      notification_title := 'Payout Completed';
      notification_message := 'Your payout of ' || formatted_amount || ' has been transferred to your account';
      notification_priority := 'high';

    WHEN 'Failed' THEN
      notification_type := 'payout_failed';
      notification_title := 'Payout Failed';
      notification_message := 'Your payout of ' || formatted_amount || ' failed. Please check your payment method.';
      notification_priority := 'urgent';

    ELSE
      RETURN NEW;
  END CASE;

  IF notification_type IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read,
      priority
    ) VALUES (
      NEW.provider_id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'payout_schedule_id', NEW.id,
        'amount', NEW.amount,
        'status', NEW.status,
        'scheduled_date', NEW.scheduled_payout_date
      ),
      false,
      notification_priority
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for early payout request notifications
CREATE OR REPLACE FUNCTION notify_early_payout_request_status()
RETURNS TRIGGER AS $$
DECLARE
  formatted_amount text;
  formatted_fee text;
  net_amount numeric;
  formatted_net text;
  notification_type text;
  notification_title text;
  notification_message text;
BEGIN
  -- Only process early payout requests
  IF NEW.early_payout_requested = false THEN
    RETURN NEW;
  END IF;

  formatted_amount := '$' || ROUND(NEW.amount::numeric, 2)::text;
  formatted_fee := '$' || ROUND(COALESCE(NEW.early_payout_fee, 0)::numeric, 2)::text;
  net_amount := NEW.amount - COALESCE(NEW.early_payout_fee, 0);
  formatted_net := '$' || ROUND(net_amount::numeric, 2)::text;

  -- Check if this is a new request
  IF OLD.early_payout_requested = false AND NEW.early_payout_requested = true THEN
    notification_type := 'early_payout_requested';
    notification_title := 'Early Payout Request Submitted';
    notification_message := 'Your early payout request for ' || formatted_amount || ' (' || formatted_fee || ' fee, ' || formatted_net || ' net) is under review';

    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read,
      priority
    ) VALUES (
      NEW.provider_id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'payout_schedule_id', NEW.id,
        'amount', NEW.amount,
        'fee', NEW.early_payout_fee,
        'net_amount', net_amount
      ),
      false,
      'normal'
    );
  END IF;

  -- Check if request was approved (moved to Processing)
  IF OLD.status = 'Pending' AND NEW.status = 'Processing' AND NEW.early_payout_requested = true THEN
    notification_type := 'early_payout_approved';
    notification_title := 'Early Payout Approved';
    notification_message := 'Your early payout of ' || formatted_net || ' (' || formatted_amount || ' - ' || formatted_fee || ' fee) has been approved';

    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read,
      priority
    ) VALUES (
      NEW.provider_id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'payout_schedule_id', NEW.id,
        'amount', NEW.amount,
        'fee', NEW.early_payout_fee,
        'net_amount', net_amount
      ),
      false,
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_custom_service_order ON bookings;
CREATE TRIGGER trigger_notify_custom_service_order
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'Pending')
  EXECUTE FUNCTION notify_custom_service_order_received();

DROP TRIGGER IF EXISTS trigger_notify_shipment_status_change ON shipments;
CREATE TRIGGER trigger_notify_shipment_status_change
  AFTER UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION notify_shipment_status_change();

DROP TRIGGER IF EXISTS trigger_notify_payout_status_enhanced ON payout_schedules;
CREATE TRIGGER trigger_notify_payout_status_enhanced
  AFTER INSERT OR UPDATE ON payout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_payout_status_change_enhanced();

DROP TRIGGER IF EXISTS trigger_notify_early_payout_status ON payout_schedules;
CREATE TRIGGER trigger_notify_early_payout_status
  AFTER UPDATE ON payout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_early_payout_request_status();
