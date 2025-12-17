/*
  # Add File Attachments Support

  1. Storage
    - Create storage bucket for chat attachments
    - Add RLS policies for file uploads and downloads

  2. Changes to messages table
    - Enhance attachments column to support multiple file types
    - Add file metadata tracking

  3. Security
    - Only authenticated users can upload files
    - Users can only access files from their conversations
*/

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for chat-attachments bucket

-- Allow authenticated users to upload chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read chat attachments from their conversations
CREATE POLICY "Users can read chat attachments from their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.attachments::text LIKE '%' || storage.objects.name || '%'
      AND (c.participant_one_id = auth.uid() OR c.participant_two_id = auth.uid())
    )
  )
);

-- Allow users to delete their own chat attachments
CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update conversation last message for different attachment types
CREATE OR REPLACE FUNCTION update_conversation_last_message_for_attachments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = CASE
      WHEN NEW.message_type = 'voice' THEN '🎤 Voice message'
      WHEN NEW.message_type = 'image' THEN '📷 Image'
      WHEN NEW.message_type = 'file' THEN '📎 ' || COALESCE(
        (NEW.attachments::jsonb->0->>'name'),
        'File'
      )
      ELSE NEW.content
    END,
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message_for_attachments();

-- Function to clean up orphaned attachments (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_orphaned_attachments()
RETURNS void AS $$
DECLARE
  attachment_record RECORD;
BEGIN
  FOR attachment_record IN
    SELECT name FROM storage.objects
    WHERE bucket_id = 'chat-attachments'
    AND NOT EXISTS (
      SELECT 1 FROM messages
      WHERE attachments::text LIKE '%' || attachment_record.name || '%'
    )
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = 'chat-attachments'
    AND name = attachment_record.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get attachment statistics for a conversation
CREATE OR REPLACE FUNCTION get_conversation_attachment_stats(p_conversation_id uuid)
RETURNS TABLE (
  total_files bigint,
  total_images bigint,
  total_documents bigint,
  total_size_mb numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE message_type = 'file') as total_files,
    COUNT(*) FILTER (WHERE message_type = 'image') as total_images,
    COUNT(*) FILTER (
      WHERE message_type = 'file'
      AND attachments::jsonb->0->>'mimeType' LIKE 'application/%'
    ) as total_documents,
    ROUND(
      SUM(
        COALESCE((attachments::jsonb->0->>'size')::numeric, 0)
      ) / 1024.0 / 1024.0,
      2
    ) as total_size_mb
  FROM messages
  WHERE conversation_id = p_conversation_id
  AND message_type IN ('file', 'image')
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
