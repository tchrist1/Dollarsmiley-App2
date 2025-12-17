/*
  # Enhanced Booking-Chat Integration

  1. Changes
    - Add `booking_id` to conversations table for direct booking linking
    - Add `conversation_id` to bookings table for reverse lookup
    - Add function to auto-create conversation when booking is created
    - Add function to send automated booking status messages
    - Add indexes for performance

  2. Automated Messages
    - Booking created message
    - Booking accepted message
    - Booking in progress message
    - Booking completed message
    - Payment status updates

  3. Security
    - All changes maintain existing RLS policies
*/

-- Add booking_id to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add conversation_id to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add system_message flag to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'is_system_message'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_system_message boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_conversation_id ON bookings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_system_message ON messages(is_system_message) WHERE is_system_message = true;

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user_one_id uuid,
  user_two_id uuid,
  p_booking_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  conv_id uuid;
  lower_id uuid;
  higher_id uuid;
BEGIN
  -- Normalize participant order (lower UUID first)
  IF user_one_id < user_two_id THEN
    lower_id := user_one_id;
    higher_id := user_two_id;
  ELSE
    lower_id := user_two_id;
    higher_id := user_one_id;
  END IF;

  -- Check if conversation exists
  SELECT id INTO conv_id
  FROM conversations
  WHERE (participant_one_id = lower_id AND participant_two_id = higher_id)
     OR (participant_one_id = higher_id AND participant_two_id = lower_id)
  LIMIT 1;

  -- Create conversation if it doesn't exist
  IF conv_id IS NULL THEN
    INSERT INTO conversations (
      participant_one_id,
      participant_two_id,
      booking_id
    ) VALUES (
      lower_id,
      higher_id,
      p_booking_id
    )
    RETURNING id INTO conv_id;
  ELSE
    -- Update with booking_id if provided and not already set
    IF p_booking_id IS NOT NULL THEN
      UPDATE conversations
      SET booking_id = p_booking_id,
          updated_at = now()
      WHERE id = conv_id AND booking_id IS NULL;
    END IF;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send system message in conversation
CREATE OR REPLACE FUNCTION send_system_message(
  p_conversation_id uuid,
  p_message_content text
)
RETURNS uuid AS $$
DECLARE
  message_id uuid;
  participant_one uuid;
  participant_two uuid;
BEGIN
  -- Get conversation participants
  SELECT participant_one_id, participant_two_id
  INTO participant_one, participant_two
  FROM conversations
  WHERE id = p_conversation_id;

  -- Insert system message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    recipient_id,
    content,
    is_system_message,
    is_read
  ) VALUES (
    p_conversation_id,
    participant_one,
    participant_two,
    p_message_content,
    true,
    false
  )
  RETURNING id INTO message_id;

  RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create conversation and send initial message on booking creation
CREATE OR REPLACE FUNCTION create_booking_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id uuid;
  initial_message text;
BEGIN
  -- Create or get conversation
  conv_id := get_or_create_conversation(
    NEW.customer_id,
    NEW.provider_id,
    NEW.id
  );

  -- Update booking with conversation_id
  NEW.conversation_id := conv_id;

  -- Create initial message based on booking status
  IF NEW.status = 'Requested' THEN
    initial_message := format(
      '📋 New booking request for "%s" on %s at %s. Location: %s',
      NEW.title,
      to_char(NEW.scheduled_date::timestamp, 'Mon DD, YYYY'),
      NEW.scheduled_time,
      NEW.location
    );
  ELSIF NEW.status = 'PendingApproval' THEN
    initial_message := format(
      '💳 Payment received for "%s". Price: $%s. Awaiting provider approval.',
      NEW.title,
      NEW.price
    );
  END IF;

  -- Send system message if we have content
  IF initial_message IS NOT NULL THEN
    PERFORM send_system_message(conv_id, initial_message);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create conversation on booking creation
DROP TRIGGER IF EXISTS create_booking_conversation_trigger ON bookings;
CREATE TRIGGER create_booking_conversation_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_conversation();

-- Function to send status update messages when booking status changes
CREATE OR REPLACE FUNCTION send_booking_status_message()
RETURNS TRIGGER AS $$
DECLARE
  status_message text;
BEGIN
  -- Only send message if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only send if conversation exists
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create status-specific message
  CASE NEW.status
    WHEN 'Accepted' THEN
      status_message := format(
        '✅ Booking accepted! Your service "%s" is confirmed for %s at %s.',
        NEW.title,
        to_char(NEW.scheduled_date::timestamp, 'Mon DD, YYYY'),
        NEW.scheduled_time
      );
    WHEN 'InProgress' THEN
      status_message := format(
        '🔄 Service started: "%s"',
        NEW.title
      );
    WHEN 'Completed' THEN
      status_message := format(
        '✨ Service completed! Please leave a review for your experience with "%s".',
        NEW.title
      );
    WHEN 'Cancelled' THEN
      status_message := format(
        '❌ Booking cancelled: "%s". %s',
        NEW.title,
        COALESCE('Reason: ' || NEW.cancellation_reason, '')
      );
    WHEN 'Disputed' THEN
      status_message := format(
        '⚠️ A dispute has been filed for booking "%s". An admin will review this case.',
        NEW.title
      );
    ELSE
      status_message := NULL;
  END CASE;

  -- Send the message if we have content
  IF status_message IS NOT NULL THEN
    PERFORM send_system_message(NEW.conversation_id, status_message);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send message on booking status change
DROP TRIGGER IF EXISTS send_booking_status_message_trigger ON bookings;
CREATE TRIGGER send_booking_status_message_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION send_booking_status_message();

-- Function to send payment status messages
CREATE OR REPLACE FUNCTION send_payment_status_message()
RETURNS TRIGGER AS $$
DECLARE
  payment_message text;
BEGIN
  -- Only send message if payment_status changed
  IF OLD.payment_status = NEW.payment_status THEN
    RETURN NEW;
  END IF;

  -- Only send if conversation exists
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create payment-specific message
  CASE NEW.payment_status
    WHEN 'Completed' THEN
      payment_message := format(
        '💰 Payment confirmed: $%s received for "%s".',
        NEW.price,
        NEW.title
      );
    WHEN 'Refunded' THEN
      payment_message := format(
        '↩️ Refund processed: $%s has been refunded for "%s".',
        NEW.price,
        NEW.title
      );
    WHEN 'Failed' THEN
      payment_message := format(
        '⚠️ Payment failed for "%s". Please update your payment method.',
        NEW.title
      );
    ELSE
      payment_message := NULL;
  END CASE;

  -- Send the message if we have content
  IF payment_message IS NOT NULL THEN
    PERFORM send_system_message(NEW.conversation_id, payment_message);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send message on payment status change
DROP TRIGGER IF EXISTS send_payment_status_message_trigger ON bookings;
CREATE TRIGGER send_payment_status_message_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION send_payment_status_message();

-- Function to get conversation for a booking
CREATE OR REPLACE FUNCTION get_conversation_for_booking(p_booking_id uuid)
RETURNS uuid AS $$
DECLARE
  conv_id uuid;
BEGIN
  SELECT conversation_id INTO conv_id
  FROM bookings
  WHERE id = p_booking_id;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_or_create_conversation IS 'Gets existing conversation or creates new one between two users, optionally linking to a booking';
COMMENT ON FUNCTION send_system_message IS 'Sends an automated system message to a conversation';
COMMENT ON FUNCTION get_conversation_for_booking IS 'Returns the conversation ID associated with a booking';
