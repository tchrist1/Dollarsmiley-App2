/*
  # Create Call Logs System

  1. New Tables
    - `call_logs`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, foreign key to bookings)
      - `caller_id` (uuid, foreign key to profiles)
      - `receiver_id` (uuid, foreign key to profiles)
      - `call_type` (text) - Voice or Video
      - `status` (text) - Connecting, Connected, Completed, Missed, Failed
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `duration_seconds` (integer, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `call_logs` table
    - Add policies for participants to view their own call logs
    - Add policy for creating call logs

  3. Indexes
    - Index on booking_id for quick lookup
    - Index on caller_id and receiver_id for user queries
*/

CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  caller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  call_type text NOT NULL CHECK (call_type IN ('Voice', 'Video')),
  status text NOT NULL DEFAULT 'Connecting' CHECK (status IN ('Connecting', 'Connected', 'Completed', 'Missed', 'Failed', 'Declined')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call logs"
  ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = caller_id OR
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can create call logs"
  ON call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call logs"
  ON call_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id)
  WITH CHECK (auth.uid() = caller_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_booking ON call_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON call_logs(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at DESC);
