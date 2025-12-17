/*
  # Add Verification Notifications System

  1. Changes
    - Add trigger to send notifications on verification status changes
    - Create notification templates for verification events
    - Add automated notifications for verification workflow

  2. Notification Events
    - Verification submitted
    - Verification under review
    - Verification approved
    - Verification rejected
*/

-- Function to send verification notification
CREATE OR REPLACE FUNCTION send_verification_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title text;
  v_message text;
  v_notification_type text;
BEGIN
  IF NEW.status = 'UnderReview' AND OLD.status = 'Pending' THEN
    v_title := 'Verification Under Review';
    v_message := 'Your verification documents are now being reviewed by our team.';
    v_notification_type := 'System';
  ELSIF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    v_title := 'Verification Approved';
    v_message := 'Congratulations! Your provider account has been verified.';
    v_notification_type := 'System';
  ELSIF NEW.status = 'Rejected' AND OLD.status != 'Rejected' THEN
    v_title := 'Verification Rejected';
    v_message := COALESCE(
      'Your verification was not approved. Reason: ' || NEW.rejection_reason,
      'Your verification was not approved. Please check your documents and try again.'
    );
    v_notification_type := 'System';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
  VALUES (
    NEW.provider_id,
    v_title,
    v_message,
    v_notification_type,
    'Verification',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for verification status changes
DROP TRIGGER IF EXISTS verification_status_notification ON provider_verification_requests;
CREATE TRIGGER verification_status_notification
  AFTER UPDATE ON provider_verification_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION send_verification_notification();

-- Function to notify admins of new verification submissions
CREATE OR REPLACE FUNCTION notify_admins_verification_submitted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
  SELECT
    id,
    'New Verification Request',
    'A provider has submitted verification documents for review.',
    'Admin',
    'Verification',
    NEW.id
  FROM profiles
  WHERE role = 'Admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new verification submissions
DROP TRIGGER IF EXISTS verification_submitted_admin_notification ON provider_verification_requests;
CREATE TRIGGER verification_submitted_admin_notification
  AFTER INSERT ON provider_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_verification_submitted();
