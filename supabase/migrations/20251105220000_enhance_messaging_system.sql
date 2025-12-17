/*
  # Enhanced Messaging System

  1. Changes to conversations table
    - Add `unread_count_one` - tracks unread messages for participant_one
    - Add `unread_count_two` - tracks unread messages for participant_two
    - Add `participant_one_typing` - indicates if participant_one is typing
    - Add `participant_two_typing` - indicates if participant_two is typing
    - Add `participant_one_last_seen` - last time participant_one was active
    - Add `participant_two_last_seen` - last time participant_two was active

  2. Changes to messages table
    - Add `edited_at` - timestamp when message was last edited
    - Add `deleted_at` - soft delete timestamp
    - Add `reactions` - JSON field for message reactions
    - Add `reply_to_id` - references messages(id) for threaded replies

  3. New Tables
    - `message_reactions` - separate table for better querying of reactions

  4. Security
    - Update RLS policies for new columns
    - Add policies for reactions table

  5. Functions
    - Function to increment/decrement unread counts
    - Function to update typing status
    - Function to update last seen timestamp
*/

-- Add new columns to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'unread_count_one'
  ) THEN
    ALTER TABLE conversations
    ADD COLUMN unread_count_one integer DEFAULT 0,
    ADD COLUMN unread_count_two integer DEFAULT 0,
    ADD COLUMN participant_one_typing boolean DEFAULT false,
    ADD COLUMN participant_two_typing boolean DEFAULT false,
    ADD COLUMN participant_one_last_seen timestamptz DEFAULT now(),
    ADD COLUMN participant_two_last_seen timestamptz DEFAULT now();
  END IF;
END $$;

-- Add new columns to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages
    ADD COLUMN edited_at timestamptz,
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN reactions jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create message_reactions table for efficient querying
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

-- Enable RLS on message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
CREATE POLICY "Users can view reactions on their messages"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
      AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update unread counts
CREATE OR REPLACE FUNCTION update_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations
    SET
      unread_count_one = CASE
        WHEN participant_one_id = NEW.recipient_id THEN unread_count_one + 1
        ELSE unread_count_one
      END,
      unread_count_two = CASE
        WHEN participant_two_id = NEW.recipient_id THEN unread_count_two + 1
        ELSE unread_count_two
      END
    WHERE id = NEW.conversation_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_read = false AND NEW.is_read = true THEN
    UPDATE conversations
    SET
      unread_count_one = CASE
        WHEN participant_one_id = NEW.recipient_id AND unread_count_one > 0 THEN unread_count_one - 1
        ELSE unread_count_one
      END,
      unread_count_two = CASE
        WHEN participant_two_id = NEW.recipient_id AND unread_count_two > 0 THEN unread_count_two - 1
        ELSE unread_count_two
      END
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for unread count updates
DROP TRIGGER IF EXISTS update_unread_count_trigger ON messages;
CREATE TRIGGER update_unread_count_trigger
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_count();

-- Function to update last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen(conversation_uuid uuid, user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET
    participant_one_last_seen = CASE
      WHEN participant_one_id = user_uuid THEN now()
      ELSE participant_one_last_seen
    END,
    participant_two_last_seen = CASE
      WHEN participant_two_id = user_uuid THEN now()
      ELSE participant_two_last_seen
    END
  WHERE id = conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update typing status
CREATE OR REPLACE FUNCTION update_typing_status(
  conversation_uuid uuid,
  user_uuid uuid,
  is_typing boolean
)
RETURNS void AS $$
BEGIN
  UPDATE conversations
  SET
    participant_one_typing = CASE
      WHEN participant_one_id = user_uuid THEN is_typing
      ELSE participant_one_typing
    END,
    participant_two_typing = CASE
      WHEN participant_two_id = user_uuid THEN is_typing
      ELSE participant_two_typing
    END,
    updated_at = now()
  WHERE id = conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to soft delete messages
CREATE OR REPLACE FUNCTION soft_delete_message(message_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET
    deleted_at = now(),
    content = '[Message deleted]'
  WHERE id = message_uuid
  AND sender_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
