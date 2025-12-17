/*
  # Video Call Integration System

  1. New Tables
    - `video_calls` - Store call sessions
      - `id` (uuid, primary key)
      - `room_id` (text, unique)
      - `call_type` (text)
      - `host_id` (uuid, references profiles)
      - `participant_ids` (uuid[])
      - `scheduled_start` (timestamptz)
      - `actual_start` (timestamptz)
      - `actual_end` (timestamptz)
      - `duration_seconds` (integer)
      - `status` (text)
      - `booking_id` (uuid, references bookings)
      - `consultation_id` (uuid, references video_consultations)
    
    - `call_participants` - Track participants
      - `id` (uuid, primary key)
      - `call_id` (uuid, references video_calls)
      - `user_id` (uuid, references profiles)
      - `role` (text)
      - `joined_at` (timestamptz)
      - `left_at` (timestamptz)
      - `connection_quality` (text)
      - `audio_enabled` (boolean)
      - `video_enabled` (boolean)
    
    - `call_recordings` - Store recordings
      - `id` (uuid, primary key)
      - `call_id` (uuid, references video_calls)
      - `storage_url` (text)
      - `duration_seconds` (integer)
      - `file_size_bytes` (bigint)
      - `transcription_url` (text)
      - `status` (text)
    
    - `call_analytics` - Track call quality
      - `id` (uuid, primary key)
      - `call_id` (uuid, references video_calls)
      - `participant_id` (uuid, references call_participants)
      - `avg_bitrate` (numeric)
      - `avg_packet_loss` (numeric)
      - `avg_latency` (numeric)
      - `total_data_transferred` (bigint)

  2. Security
    - Enable RLS on all tables
    - Participants can view their own calls
*/

-- Video Calls Table
CREATE TABLE IF NOT EXISTS video_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text UNIQUE NOT NULL,
  call_type text NOT NULL CHECK (call_type IN ('consultation', 'meeting', 'interview', 'support', 'demo')),
  host_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_ids uuid[] DEFAULT ARRAY[]::uuid[],
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  duration_seconds integer,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'active', 'ended', 'cancelled', 'failed')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES video_consultations(id) ON DELETE SET NULL,
  max_participants integer DEFAULT 2,
  recording_enabled boolean DEFAULT false,
  screen_sharing_enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_room ON video_calls(room_id);
CREATE INDEX IF NOT EXISTS idx_calls_host ON video_calls(host_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON video_calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled ON video_calls(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_calls_booking ON video_calls(booking_id);

ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calls they participate in"
  ON video_calls FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid() OR
    auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "Hosts can manage their calls"
  ON video_calls FOR ALL
  TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Call Participants Table
CREATE TABLE IF NOT EXISTS call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'participant' CHECK (role IN ('host', 'participant', 'observer')),
  joined_at timestamptz,
  left_at timestamptz,
  connection_quality text DEFAULT 'unknown' CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor', 'unknown')),
  audio_enabled boolean DEFAULT true,
  video_enabled boolean DEFAULT true,
  is_screensharing boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_call ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON call_participants(user_id);

ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their calls"
  ON call_participants FOR SELECT
  TO authenticated
  USING (
    call_id IN (
      SELECT id FROM video_calls 
      WHERE host_id = auth.uid() OR auth.uid() = ANY(participant_ids)
    )
  );

CREATE POLICY "Users can manage their own participation"
  ON call_participants FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Call Recordings Table
CREATE TABLE IF NOT EXISTS call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  storage_url text NOT NULL,
  duration_seconds integer,
  file_size_bytes bigint,
  format text DEFAULT 'mp4',
  transcription_url text,
  transcription_status text DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'available', 'archived', 'deleted', 'failed')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recordings_call ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON call_recordings(status);

ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recordings of their calls"
  ON call_recordings FOR SELECT
  TO authenticated
  USING (
    call_id IN (
      SELECT id FROM video_calls 
      WHERE host_id = auth.uid() OR auth.uid() = ANY(participant_ids)
    )
  );

-- Call Analytics Table
CREATE TABLE IF NOT EXISTS call_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES call_participants(id) ON DELETE SET NULL,
  avg_bitrate numeric,
  avg_packet_loss numeric,
  avg_latency numeric,
  avg_jitter numeric,
  total_data_transferred bigint,
  connection_issues integer DEFAULT 0,
  audio_issues integer DEFAULT 0,
  video_issues integer DEFAULT 0,
  snapshot_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_call ON call_analytics(call_id);
CREATE INDEX IF NOT EXISTS idx_analytics_participant ON call_analytics(participant_id);

ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics of their calls"
  ON call_analytics FOR SELECT
  TO authenticated
  USING (
    call_id IN (
      SELECT id FROM video_calls 
      WHERE host_id = auth.uid() OR auth.uid() = ANY(participant_ids)
    )
  );

-- Function to create video call
CREATE OR REPLACE FUNCTION create_video_call(
  host_id_param uuid,
  call_type_param text,
  scheduled_start_param timestamptz DEFAULT NULL,
  booking_id_param uuid DEFAULT NULL,
  consultation_id_param uuid DEFAULT NULL,
  max_participants_param integer DEFAULT 2,
  recording_enabled_param boolean DEFAULT false
)
RETURNS TABLE(
  call_id uuid,
  room_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_room_id text;
  new_call_id uuid;
BEGIN
  new_room_id := 'room_' || gen_random_uuid()::text;
  
  INSERT INTO video_calls (
    room_id,
    call_type,
    host_id,
    scheduled_start,
    booking_id,
    consultation_id,
    max_participants,
    recording_enabled,
    status
  ) VALUES (
    new_room_id,
    call_type_param,
    host_id_param,
    scheduled_start_param,
    booking_id_param,
    consultation_id_param,
    max_participants_param,
    recording_enabled_param,
    CASE 
      WHEN scheduled_start_param IS NULL THEN 'waiting'
      ELSE 'scheduled'
    END
  ) RETURNING id INTO new_call_id;
  
  INSERT INTO call_participants (
    call_id,
    user_id,
    role
  ) VALUES (
    new_call_id,
    host_id_param,
    'host'
  );
  
  RETURN QUERY SELECT new_call_id, new_room_id;
END;
$$;

-- Function to join video call
CREATE OR REPLACE FUNCTION join_video_call(
  call_id_param uuid,
  user_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_participants integer;
  max_allowed integer;
  call_status text;
BEGIN
  SELECT status, max_participants INTO call_status, max_allowed
  FROM video_calls
  WHERE id = call_id_param;
  
  IF call_status NOT IN ('scheduled', 'waiting', 'active') THEN
    RAISE EXCEPTION 'Call is not available to join';
  END IF;
  
  SELECT COUNT(*) INTO current_participants
  FROM call_participants
  WHERE call_id = call_id_param
    AND left_at IS NULL;
  
  IF current_participants >= max_allowed THEN
    RAISE EXCEPTION 'Call is at maximum capacity';
  END IF;
  
  INSERT INTO call_participants (
    call_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    call_id_param,
    user_id_param,
    'participant',
    now()
  )
  ON CONFLICT DO NOTHING;
  
  UPDATE video_calls
  SET 
    participant_ids = array_append(participant_ids, user_id_param),
    status = CASE 
      WHEN status = 'waiting' THEN 'active'
      ELSE status
    END,
    actual_start = CASE
      WHEN actual_start IS NULL THEN now()
      ELSE actual_start
    END,
    updated_at = now()
  WHERE id = call_id_param
    AND NOT (user_id_param = ANY(participant_ids));
  
  RETURN true;
END;
$$;

-- Function to leave video call
CREATE OR REPLACE FUNCTION leave_video_call(
  call_id_param uuid,
  user_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remaining_participants integer;
  is_host boolean;
BEGIN
  UPDATE call_participants
  SET left_at = now()
  WHERE call_id = call_id_param
    AND user_id = user_id_param
    AND left_at IS NULL;
  
  SELECT role = 'host' INTO is_host
  FROM call_participants
  WHERE call_id = call_id_param
    AND user_id = user_id_param
  LIMIT 1;
  
  SELECT COUNT(*) INTO remaining_participants
  FROM call_participants
  WHERE call_id = call_id_param
    AND left_at IS NULL;
  
  IF remaining_participants = 0 OR is_host THEN
    UPDATE video_calls
    SET 
      status = 'ended',
      actual_end = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - actual_start))::integer,
      updated_at = now()
    WHERE id = call_id_param;
  END IF;
END;
$$;

-- Function to update call quality
CREATE OR REPLACE FUNCTION update_call_quality(
  participant_id_param uuid,
  quality_param text,
  audio_enabled_param boolean,
  video_enabled_param boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE call_participants
  SET 
    connection_quality = quality_param,
    audio_enabled = audio_enabled_param,
    video_enabled = video_enabled_param
  WHERE id = participant_id_param;
END;
$$;

-- Function to get active calls
CREATE OR REPLACE FUNCTION get_active_calls(user_id_param uuid)
RETURNS TABLE(
  call_id uuid,
  room_id text,
  call_type text,
  host_id uuid,
  status text,
  participant_count bigint,
  started_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vc.id,
    vc.room_id,
    vc.call_type,
    vc.host_id,
    vc.status,
    COUNT(cp.id),
    vc.actual_start
  FROM video_calls vc
  LEFT JOIN call_participants cp ON cp.call_id = vc.id AND cp.left_at IS NULL
  WHERE vc.status IN ('waiting', 'active')
    AND (vc.host_id = user_id_param OR user_id_param = ANY(vc.participant_ids))
  GROUP BY vc.id
  ORDER BY vc.actual_start DESC;
END;
$$;

-- Function to get call statistics
CREATE OR REPLACE FUNCTION get_call_statistics(
  user_id_param uuid,
  days_param integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  total_duration_minutes numeric,
  avg_call_duration_minutes numeric,
  calls_as_host bigint,
  calls_as_participant bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total,
    COALESCE(SUM(vc.duration_seconds) / 60.0, 0) as total_mins,
    COALESCE(AVG(vc.duration_seconds) / 60.0, 0) as avg_mins,
    COUNT(*) FILTER (WHERE vc.host_id = user_id_param) as host_count,
    COUNT(*) FILTER (WHERE vc.host_id != user_id_param) as participant_count
  FROM video_calls vc
  WHERE (vc.host_id = user_id_param OR user_id_param = ANY(vc.participant_ids))
    AND vc.status = 'ended'
    AND vc.actual_start >= now() - (days_param || ' days')::interval;
END;
$$;