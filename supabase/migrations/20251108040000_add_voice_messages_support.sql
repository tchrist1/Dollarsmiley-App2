/*
  # Add Voice Messages Support

  1. Changes to messages table
    - Add `message_type` - enum for 'text', 'voice', 'image', 'file'
    - Add `voice_duration` - duration of voice message in seconds
    - Add `voice_url` - URL to voice message file in storage
    - Add `voice_waveform` - JSON array of waveform data for visualization

  2. Storage
    - Create storage bucket for voice messages
    - Add RLS policies for voice message uploads

  3. Security
    - Only authenticated users can upload voice messages
    - Users can only access voice messages from their conversations
*/

-- Add new columns to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE messages
    ADD COLUMN message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image', 'file')),
    ADD COLUMN voice_duration integer,
    ADD COLUMN voice_url text,
    ADD COLUMN voice_waveform jsonb;
  END IF;
END $$;

-- Create index for message type queries
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for voice-messages bucket

-- Allow authenticated users to upload voice messages
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read voice messages from their conversations
CREATE POLICY "Users can read voice messages from their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.voice_url = storage.objects.name
      AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  )
);

-- Allow users to delete their own voice messages
CREATE POLICY "Users can delete their own voice messages"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Function to get voice message URL
CREATE OR REPLACE FUNCTION get_voice_message_url(voice_path text)
RETURNS text AS $$
DECLARE
  bucket_url text;
BEGIN
  SELECT
    CONCAT(
      current_setting('app.settings.supabase_url', true),
      '/storage/v1/object/public/voice-messages/',
      voice_path
    )
  INTO bucket_url;

  RETURN bucket_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update conversation last message for voice messages
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = CASE
      WHEN NEW.message_type = 'voice' THEN '🎤 Voice message'
      WHEN NEW.message_type = 'image' THEN '📷 Image'
      WHEN NEW.message_type = 'file' THEN '📎 File'
      ELSE NEW.content
    END,
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversation updates
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();
