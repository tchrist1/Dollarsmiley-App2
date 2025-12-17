/*
  # Phase 2: Video Consultation System

  1. New Tables
    - `video_consultations` - Video consultation bookings
      - `id` (uuid, primary key)
      - `production_order_id` (uuid, references production_orders)
      - `customer_id` (uuid, references profiles)
      - `provider_id` (uuid, references profiles)
      - `scheduled_at` (timestamptz)
      - `duration_minutes` (integer)
      - `status` (text) - scheduled, in_progress, completed, cancelled
      - `room_id` (text) - Video room identifier
      - `recording_url` (text) - Recording URL if recorded
      - `consultation_notes` (text)
      - `action_items` (jsonb)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `consultation_recordings` - Store consultation recordings
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, references video_consultations)
      - `recording_url` (text)
      - `duration_seconds` (integer)
      - `file_size_bytes` (bigint)
      - `transcription_text` (text)
      - `created_at` (timestamptz)
    
    - `consultation_participants` - Track participants in consultations
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, references video_consultations)
      - `user_id` (uuid, references profiles)
      - `role` (text) - host, participant
      - `joined_at` (timestamptz)
      - `left_at` (timestamptz)
      - `connection_quality` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Only consultation participants can access
    - Recordings accessible to both parties
*/

-- Video Consultations Table
CREATE TABLE IF NOT EXISTS video_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES production_orders(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30 CHECK (duration_minutes > 0),
  status text DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  )),
  room_id text UNIQUE,
  recording_url text,
  consultation_notes text,
  action_items jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_video_consultations_customer ON video_consultations(customer_id);
CREATE INDEX idx_video_consultations_provider ON video_consultations(provider_id);
CREATE INDEX idx_video_consultations_scheduled ON video_consultations(scheduled_at);
CREATE INDEX idx_video_consultations_status ON video_consultations(status);
CREATE INDEX idx_video_consultations_production ON video_consultations(production_order_id);

ALTER TABLE video_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own consultations"
  ON video_consultations FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Providers can view assigned consultations"
  ON video_consultations FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Customers can create consultations"
  ON video_consultations FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Participants can update consultations"
  ON video_consultations FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() OR provider_id = auth.uid());

-- Consultation Recordings Table
CREATE TABLE IF NOT EXISTS consultation_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES video_consultations(id) ON DELETE CASCADE,
  recording_url text NOT NULL,
  duration_seconds integer,
  file_size_bytes bigint,
  transcription_text text,
  transcription_status text DEFAULT 'pending' CHECK (transcription_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_consultation_recordings_consultation ON consultation_recordings(consultation_id);

ALTER TABLE consultation_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view recordings"
  ON consultation_recordings FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM video_consultations
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "System can create recordings"
  ON consultation_recordings FOR INSERT
  TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM video_consultations
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- Consultation Participants Table
CREATE TABLE IF NOT EXISTS consultation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES video_consultations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  joined_at timestamptz,
  left_at timestamptz,
  connection_quality jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_consultation_participants_consultation ON consultation_participants(consultation_id);
CREATE INDEX idx_consultation_participants_user ON consultation_participants(user_id);

ALTER TABLE consultation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view consultation participation"
  ON consultation_participants FOR SELECT
  TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM video_consultations
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

CREATE POLICY "System can track participants"
  ON consultation_participants FOR ALL
  TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM video_consultations
      WHERE customer_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- Function to get upcoming consultations
CREATE OR REPLACE FUNCTION get_upcoming_consultations(user_id_param uuid)
RETURNS TABLE(
  consultation_id uuid,
  other_party_id uuid,
  other_party_name text,
  scheduled_at timestamptz,
  duration_minutes integer,
  status text,
  production_order_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vc.id,
    CASE 
      WHEN vc.customer_id = user_id_param THEN vc.provider_id
      ELSE vc.customer_id
    END as other_party_id,
    CASE 
      WHEN vc.customer_id = user_id_param THEN p_provider.full_name
      ELSE p_customer.full_name
    END as other_party_name,
    vc.scheduled_at,
    vc.duration_minutes,
    vc.status,
    vc.production_order_id
  FROM video_consultations vc
  LEFT JOIN profiles p_provider ON vc.provider_id = p_provider.id
  LEFT JOIN profiles p_customer ON vc.customer_id = p_customer.id
  WHERE 
    (vc.customer_id = user_id_param OR vc.provider_id = user_id_param)
    AND vc.scheduled_at > now()
    AND vc.status IN ('scheduled', 'in_progress')
  ORDER BY vc.scheduled_at ASC;
END;
$$;

-- Function to check consultation availability
CREATE OR REPLACE FUNCTION check_consultation_availability(
  provider_id_param uuid,
  proposed_start timestamptz,
  duration_min integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  proposed_end timestamptz;
  conflict_count integer;
BEGIN
  proposed_end := proposed_start + (duration_min || ' minutes')::interval;
  
  SELECT COUNT(*) INTO conflict_count
  FROM video_consultations
  WHERE 
    provider_id = provider_id_param
    AND status IN ('scheduled', 'in_progress')
    AND (
      (scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval) 
      OVERLAPS 
      (proposed_start, proposed_end)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Function to start consultation
CREATE OR REPLACE FUNCTION start_consultation(consultation_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE video_consultations
  SET 
    status = 'in_progress',
    started_at = now(),
    updated_at = now()
  WHERE id = consultation_id_param;
  
  INSERT INTO consultation_participants (
    consultation_id,
    user_id,
    role,
    joined_at
  )
  SELECT 
    consultation_id_param,
    customer_id,
    'participant',
    now()
  FROM video_consultations
  WHERE id = consultation_id_param
  UNION ALL
  SELECT 
    consultation_id_param,
    provider_id,
    'host',
    now()
  FROM video_consultations
  WHERE id = consultation_id_param;
END;
$$;

-- Function to end consultation
CREATE OR REPLACE FUNCTION end_consultation(
  consultation_id_param uuid,
  notes_param text DEFAULT NULL,
  action_items_param jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE video_consultations
  SET 
    status = 'completed',
    ended_at = now(),
    consultation_notes = notes_param,
    action_items = action_items_param,
    updated_at = now()
  WHERE id = consultation_id_param;
  
  UPDATE consultation_participants
  SET left_at = now()
  WHERE consultation_id = consultation_id_param
    AND left_at IS NULL;
END;
$$;