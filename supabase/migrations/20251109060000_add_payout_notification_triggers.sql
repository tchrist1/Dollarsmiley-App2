/*
  # Add Payout Notification Triggers

  1. Functions
    - `notify_payout_scheduled` - Notifies provider when payout is scheduled
    - `notify_payout_status_change` - Notifies provider when payout status changes
    - `check_early_payout_eligibility` - Checks and notifies when early payout becomes available

  2. Triggers
    - On payout_schedules insert - Send scheduled notification
    - On payout_schedules status update - Send status change notifications
    - On booking completion - Check early payout eligibility after 24 hours

  3. Notes
    - All notifications are created in the notifications table
    - Edge functions can be used for more complex notification logic
*/

-- Function to notify when payout is scheduled
CREATE OR REPLACE FUNCTION notify_payout_scheduled()
RETURNS TRIGGER AS $$
DECLARE
  formatted_amount text;
  payout_date_formatted text;
BEGIN
  formatted_amount := '$' || ROUND(NEW.amount::numeric, 2)::text;
  payout_date_formatted := TO_CHAR(NEW.scheduled_payout_date, 'Mon DD, YYYY');

  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read
  ) VALUES (
    NEW.provider_id,
    'payout_scheduled',
    'Payout Scheduled',
    'Your payout of ' || formatted_amount || ' has been scheduled for ' || payout_date_formatted,
    jsonb_build_object(
      'amount', NEW.amount,
      'payout_schedule_id', NEW.id,
      'payout_date', NEW.scheduled_payout_date
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when payout status changes
CREATE OR REPLACE FUNCTION notify_payout_status_change()
RETURNS TRIGGER AS $$
DECLARE
  formatted_amount text;
  notification_title text;
  notification_message text;
  notification_type text;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  formatted_amount := '$' || ROUND(NEW.amount::numeric, 2)::text;

  CASE NEW.status
    WHEN 'Processing' THEN
      notification_type := 'payout_processing';
      notification_title := 'Payout Processing';
      notification_message := 'Your payout of ' || formatted_amount || ' is being processed';

    WHEN 'Paid' THEN
      notification_type := 'payout_completed';
      notification_title := 'Payout Completed';
      notification_message := 'Your payout of ' || formatted_amount || ' has been transferred to your account';

    WHEN 'Failed' THEN
      notification_type := 'payout_failed';
      notification_title := 'Payout Failed';
      notification_message := 'Your payout of ' || formatted_amount || ' failed. Please check your payment method.';

    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read
  ) VALUES (
    NEW.provider_id,
    notification_type,
    notification_title,
    notification_message,
    jsonb_build_object(
      'amount', NEW.amount,
      'payout_schedule_id', NEW.id,
      'status', NEW.status
    ),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check early payout eligibility
CREATE OR REPLACE FUNCTION check_early_payout_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  schedule_record RECORD;
  formatted_amount text;
BEGIN
  -- Only check when booking is completed
  IF NEW.status != 'Completed' OR OLD.status = 'Completed' THEN
    RETURN NEW;
  END IF;

  -- Find associated payout schedule
  FOR schedule_record IN
    SELECT id, amount, provider_id
    FROM payout_schedules
    WHERE booking_id = NEW.id
      AND status = 'Pending'
      AND early_payout_requested = false
  LOOP
    formatted_amount := '$' || ROUND(schedule_record.amount::numeric, 2)::text;

    -- Create notification for early payout eligibility
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read
    ) VALUES (
      schedule_record.provider_id,
      'early_payout_eligible',
      'Early Payout Available',
      'You can now request an early payout of ' || formatted_amount || ' (24 hours after job completion)',
      jsonb_build_object(
        'amount', schedule_record.amount,
        'payout_schedule_id', schedule_record.id
      ),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when early payout is approved
CREATE OR REPLACE FUNCTION notify_early_payout_approved()
RETURNS TRIGGER AS $$
DECLARE
  formatted_amount text;
  formatted_fee text;
  net_amount numeric;
  formatted_net text;
BEGIN
  -- Only notify when early payout is approved (status changes to Processing)
  IF NEW.early_payout_requested = true AND NEW.status = 'Processing' AND OLD.status = 'Pending' THEN
    net_amount := NEW.amount - COALESCE(NEW.early_payout_fee, 0);
    formatted_amount := '$' || ROUND(NEW.amount::numeric, 2)::text;
    formatted_fee := '$' || ROUND(COALESCE(NEW.early_payout_fee, 0)::numeric, 2)::text;
    formatted_net := '$' || ROUND(net_amount::numeric, 2)::text;

    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read
    ) VALUES (
      NEW.provider_id,
      'early_payout_approved',
      'Early Payout Approved',
      'Your early payout request has been approved. You''ll receive ' || formatted_net || ' (' || formatted_amount || ' - ' || formatted_fee || ' fee)',
      jsonb_build_object(
        'amount', NEW.amount,
        'fee', NEW.early_payout_fee,
        'net_amount', net_amount,
        'payout_schedule_id', NEW.id
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_payout_scheduled ON payout_schedules;
CREATE TRIGGER trigger_notify_payout_scheduled
  AFTER INSERT ON payout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_payout_scheduled();

DROP TRIGGER IF EXISTS trigger_notify_payout_status_change ON payout_schedules;
CREATE TRIGGER trigger_notify_payout_status_change
  AFTER UPDATE ON payout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_payout_status_change();

DROP TRIGGER IF EXISTS trigger_check_early_payout_eligibility ON bookings;
CREATE TRIGGER trigger_check_early_payout_eligibility
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_early_payout_eligibility();

DROP TRIGGER IF EXISTS trigger_notify_early_payout_approved ON payout_schedules;
CREATE TRIGGER trigger_notify_early_payout_approved
  AFTER UPDATE ON payout_schedules
  FOR EACH ROW
  EXECUTE FUNCTION notify_early_payout_approved();
