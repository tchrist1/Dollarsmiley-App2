/*
  # Real-Time Chat Enhancements

  1. New Tables for Chat Features
    - `typing_indicators` - Track who's typing
    - `message_read_receipts` - Track message reads
    - `message_reactions` - Emoji reactions on messages

  2. Security
    - Enable RLS on all tables
    - Only conversation participants can access
*/

-- Add reply_to column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'reply_to_message_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN reply_to_message_id uuid REFERENCES messages(id) ON DELETE SET NULL;
    CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);
  END IF;
END $$;

-- Typing Indicators Table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 seconds'),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON typing_indicators(expires_at);

ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view typing indicators"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE participant_one_id = auth.uid() OR participant_two_id = auth.uid()
    )
  );

CREATE POLICY "Participants can manage own typing indicators"
  ON typing_indicators FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Message Read Receipts Table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON message_read_receipts(user_id);

ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view read receipts"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversations c ON m.conversation_id = c.id
      WHERE c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own read receipts"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view reactions"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      INNER JOIN conversations c ON m.conversation_id = c.id
      WHERE c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid()
    )
  );

CREATE POLICY "Participants can manage own reactions"
  ON message_reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to update typing indicator
CREATE OR REPLACE FUNCTION update_typing_indicator(
  conversation_id_param uuid,
  user_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO typing_indicators (
    conversation_id,
    user_id,
    started_at,
    expires_at
  ) VALUES (
    conversation_id_param,
    user_id_param,
    now(),
    now() + interval '10 seconds'
  )
  ON CONFLICT (conversation_id, user_id) 
  DO UPDATE SET
    started_at = now(),
    expires_at = now() + interval '10 seconds';
END;
$$;

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_read(
  message_id_param uuid,
  user_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO message_read_receipts (message_id, user_id)
  VALUES (message_id_param, user_id_param)
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(
  conversation_id_param uuid,
  user_id_param uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM messages m
  WHERE m.conversation_id = conversation_id_param
    AND m.sender_id != user_id_param
    AND NOT EXISTS (
      SELECT 1 FROM message_read_receipts mrr
      WHERE mrr.message_id = m.id
        AND mrr.user_id = user_id_param
    );
  
  RETURN unread_count;
END;
$$;