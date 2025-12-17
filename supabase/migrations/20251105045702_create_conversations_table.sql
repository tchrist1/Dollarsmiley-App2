/*
  # Add Conversations Support for Messaging

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `participant_one_id` (uuid, references profiles)
      - `participant_two_id` (uuid, references profiles)
      - `last_message` (text)
      - `last_message_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `conversation_id` to messages table (optional, nullable)
    - Make `booking_id` nullable for general conversations

  3. Security
    - Enable RLS on `conversations` table
    - Add policies for participants to view and update conversations

  4. Indexes
    - Add index on participant IDs for fast lookups
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_participants CHECK (participant_one_id != participant_two_id)
);

-- Add conversation_id to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make booking_id nullable for general conversations
DO $$
BEGIN
  ALTER TABLE messages ALTER COLUMN booking_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = participant_one_id OR 
    auth.uid() = participant_two_id
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = participant_one_id OR 
    auth.uid() = participant_two_id
  );

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = participant_one_id OR 
    auth.uid() = participant_two_id
  )
  WITH CHECK (
    auth.uid() = participant_one_id OR 
    auth.uid() = participant_two_id
  );

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE conversations
    SET 
      last_message = NEW.content,
      last_message_at = NEW.created_at,
      updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation on new message
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
