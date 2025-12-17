/*
  # Video Consultation System Enhancement

  1. New Tables
    - `video_call_sessions` - Enhanced video call management
    - `video_call_participants` - Participant tracking
    - `video_call_recordings` - Recording metadata
    - `screen_share_sessions` - Screen sharing tracking
    - `call_quality_metrics` - Quality monitoring
    - `call_transcriptions` - Auto-transcription storage

  2. Enhancements
    - Add video provider fields to consultation_sessions
    - Add call quality tracking
    - Add recording management

  3. Security
    - Enable RLS on all tables
    - Participant-only access

  4. Features
    - Twilio/Agora integration ready
    - Recording management
    - Quality monitoring
    - Transcription support
*/

-- Enhance existing consultation_sessions table
ALTER TABLE consultation_sessions
ADD COLUMN IF NOT EXISTS video_provider text DEFAULT 'twilio',
-- Providers: twilio, agora, daily, webrtc
ADD COLUMN IF NOT EXISTS room_sid text UNIQUE,
ADD COLUMN IF NOT EXISTS room_name text,
ADD COLUMN IF NOT EXISTS access_token_customer text,
ADD COLUMN IF NOT EXISTS access_token_provider text,
ADD COLUMN IF NOT EXISTS recording_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_sid text,
ADD COLUMN IF NOT EXISTS recording_url text,
ADD COLUMN IF NOT EXISTS transcription_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transcription_status text,
ADD COLUMN IF NOT EXISTS call_quality_rating integer,
ADD COLUMN IF NOT EXISTS connection_issues_reported boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS actual_duration_seconds integer;

-- Video Call Sessions (detailed tracking)
CREATE TABLE IF NOT EXISTS video_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_session_id uuid REFERENCES consultation_sessions(id) ON DELETE CASCADE,

  -- Provider info
  video_provider text NOT NULL DEFAULT 'twilio',
  room_id text NOT NULL,
  room_sid text,
  room_name text,

  -- Participants
  host_id uuid REFERENCES profiles(id) NOT NULL,
  guest_id uuid REFERENCES profiles(id) NOT NULL,

  -- Session details
  session_type text DEFAULT 'consultation', -- consultation, support, demo, interview

  -- Status
  status text DEFAULT 'scheduled',
  -- Statuses: scheduled, connecting, active, ended, failed

  -- Timing
  scheduled_start timestamptz NOT NULL,
  actual_start timestamptz,
  actual_end timestamptz,
  duration_seconds integer,

  -- Features enabled
  video_enabled boolean DEFAULT true,
  audio_enabled boolean DEFAULT true,
  screen_share_enabled boolean DEFAULT true,
  recording_enabled boolean DEFAULT false,
  transcription_enabled boolean DEFAULT false,

  -- Recording
  recording_status text, -- not_started, recording, stopped, processing, available, failed
  recording_duration_seconds integer,
  recording_size_bytes bigint,
  recording_url text,
  recording_expires_at timestamptz,

  -- Transcription
  transcription_status text, -- not_started, processing, available, failed
  transcription_url text,
  transcription_language text DEFAULT 'en',

  -- Quality
  average_quality_score numeric(3, 1), -- 1.0-5.0
  connection_quality text, -- excellent, good, fair, poor

  -- Issues
  had_connection_issues boolean DEFAULT false,
  had_audio_issues boolean DEFAULT false,
  had_video_issues boolean DEFAULT false,

  -- Notes
  host_notes text,
  guest_notes text,
  system_notes text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Video Call Participants (detailed participant tracking)
CREATE TABLE IF NOT EXISTS video_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_call_session_id uuid REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,

  -- Participant
  user_id uuid REFERENCES profiles(id) NOT NULL,
  participant_role text NOT NULL, -- host, guest, observer

  -- Connection
  participant_sid text,
  identity text,
  access_token text,

  -- Status
  connection_status text DEFAULT 'invited',
  -- Statuses: invited, connecting, connected, disconnected, failed

  -- Timing
  joined_at timestamptz,
  left_at timestamptz,
  duration_seconds integer,

  -- Device info
  device_type text, -- web, ios, android, desktop
  browser text,
  os text,
  camera_enabled boolean DEFAULT true,
  microphone_enabled boolean DEFAULT true,

  -- Network
  ip_address inet,
  network_type text, -- wifi, cellular, ethernet

  -- Quality
  average_video_quality numeric(3, 1),
  average_audio_quality numeric(3, 1),
  packet_loss_percentage numeric(4, 2),
  jitter_ms numeric(6, 2),
  latency_ms integer,

  -- Issues
  reconnection_count integer DEFAULT 0,
  audio_issues_count integer DEFAULT 0,
  video_issues_count integer DEFAULT 0,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Call Quality Metrics (time-series quality data)
CREATE TABLE IF NOT EXISTS call_quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_call_session_id uuid REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES video_call_participants(id) ON DELETE CASCADE,

  -- Timing
  measured_at timestamptz DEFAULT now(),

  -- Video quality
  video_bitrate_kbps integer,
  video_framerate integer,
  video_resolution text, -- 1920x1080, 1280x720, etc.
  video_packet_loss numeric(4, 2),

  -- Audio quality
  audio_bitrate_kbps integer,
  audio_packet_loss numeric(4, 2),
  audio_jitter_ms numeric(6, 2),

  -- Network
  latency_ms integer,
  bandwidth_mbps numeric(6, 2),
  network_type text,

  -- Overall
  quality_score numeric(3, 1), -- 1.0-5.0

  created_at timestamptz DEFAULT now()
);

-- Screen Share Sessions
CREATE TABLE IF NOT EXISTS screen_share_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_call_session_id uuid REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,

  -- Sharer
  shared_by uuid REFERENCES profiles(id) NOT NULL,

  -- Status
  status text DEFAULT 'active', -- active, paused, stopped

  -- Timing
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,

  -- Details
  screen_type text, -- entire_screen, window, browser_tab
  screen_name text,

  -- Quality
  resolution text,
  framerate integer,

  created_at timestamptz DEFAULT now()
);

-- Call Recordings
CREATE TABLE IF NOT EXISTS call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_call_session_id uuid REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,

  -- Recording details
  recording_sid text UNIQUE,
  recording_type text DEFAULT 'video', -- video, audio, screen

  -- Status
  status text DEFAULT 'processing',
  -- Statuses: processing, available, failed, expired, deleted

  -- File info
  file_url text,
  file_size_bytes bigint,
  duration_seconds integer,

  -- Format
  format text, -- mp4, webm, mp3
  codec text,
  resolution text,

  -- Access
  is_public boolean DEFAULT false,
  access_url text,
  access_expires_at timestamptz,

  -- Retention
  retention_days integer DEFAULT 30,
  expires_at timestamptz,
  auto_delete boolean DEFAULT true,

  -- Download tracking
  download_count integer DEFAULT 0,
  last_downloaded_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Call Transcriptions
CREATE TABLE IF NOT EXISTS call_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_call_session_id uuid REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,
  call_recording_id uuid REFERENCES call_recordings(id) ON DELETE SET NULL,

  -- Status
  status text DEFAULT 'processing',
  -- Statuses: processing, available, failed

  -- Transcription
  full_transcript text,
  transcript_json jsonb, -- Structured with timestamps, speakers
  language text DEFAULT 'en',

  -- Metadata
  word_count integer,
  speaker_count integer,
  confidence_score numeric(4, 2), -- 0-100

  -- File
  transcript_file_url text,

  -- AI summary
  ai_summary text,
  key_points text[],
  action_items text[],

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Call Feedback
CREATE TABLE IF NOT EXISTS call_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_call_session_id uuid REFERENCES video_call_sessions(id) ON DELETE CASCADE NOT NULL,

  -- Feedback provider
  user_id uuid REFERENCES profiles(id) NOT NULL,

  -- Ratings
  overall_rating integer NOT NULL, -- 1-5
  video_quality_rating integer, -- 1-5
  audio_quality_rating integer, -- 1-5
  ease_of_use_rating integer, -- 1-5

  -- Issues
  had_technical_issues boolean DEFAULT false,
  issue_types text[], -- connection, audio, video, lag, echo

  -- Comments
  positive_feedback text,
  negative_feedback text,
  suggestions text,

  -- Would recommend
  would_use_again boolean,

  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_sessions_consultation ON video_call_sessions(consultation_session_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_host ON video_call_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_guest ON video_call_sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON video_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_scheduled ON video_call_sessions(scheduled_start);

CREATE INDEX IF NOT EXISTS idx_video_participants_session ON video_call_participants(video_call_session_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_user ON video_call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_status ON video_call_participants(connection_status);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_session ON call_quality_metrics(video_call_session_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_measured ON call_quality_metrics(measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_screen_share_session ON screen_share_sessions(video_call_session_id);
CREATE INDEX IF NOT EXISTS idx_screen_share_user ON screen_share_sessions(shared_by);

CREATE INDEX IF NOT EXISTS idx_recordings_session ON call_recordings(video_call_session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON call_recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_expires ON call_recordings(expires_at);

CREATE INDEX IF NOT EXISTS idx_transcriptions_session ON call_transcriptions(video_call_session_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON call_transcriptions(status);

CREATE INDEX IF NOT EXISTS idx_call_feedback_session ON call_feedback(video_call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_feedback_user ON call_feedback(user_id);

-- Enable RLS
ALTER TABLE video_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_share_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Call participants can view sessions"
  ON video_call_sessions FOR SELECT
  TO authenticated
  USING (host_id = auth.uid() OR guest_id = auth.uid());

CREATE POLICY "Call participants can update sessions"
  ON video_call_sessions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid() OR guest_id = auth.uid())
  WITH CHECK (host_id = auth.uid() OR guest_id = auth.uid());

CREATE POLICY "Call participants can view participant data"
  ON video_call_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM video_call_sessions vcs
      WHERE vcs.id = video_call_participants.video_call_session_id
      AND (vcs.host_id = auth.uid() OR vcs.guest_id = auth.uid())
    )
  );

CREATE POLICY "Call participants can view recordings"
  ON call_recordings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM video_call_sessions vcs
      WHERE vcs.id = call_recordings.video_call_session_id
      AND (vcs.host_id = auth.uid() OR vcs.guest_id = auth.uid())
    )
  );

CREATE POLICY "Call participants can view transcriptions"
  ON call_transcriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM video_call_sessions vcs
      WHERE vcs.id = call_transcriptions.video_call_session_id
      AND (vcs.host_id = auth.uid() OR vcs.guest_id = auth.uid())
    )
  );

CREATE POLICY "Users can submit call feedback"
  ON call_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
  ON call_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function: Create video call session
CREATE OR REPLACE FUNCTION create_video_call_session(
  consultation_id uuid,
  host_user_id uuid,
  guest_user_id uuid,
  scheduled_start_time timestamptz,
  enable_recording boolean DEFAULT false,
  enable_transcription boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  session_id uuid;
  room_name_generated text;
BEGIN
  -- Generate unique room name
  room_name_generated := 'room_' || gen_random_uuid()::text;

  -- Create session
  INSERT INTO video_call_sessions (
    consultation_session_id,
    video_provider,
    room_name,
    host_id,
    guest_id,
    scheduled_start,
    recording_enabled,
    transcription_enabled,
    status
  ) VALUES (
    consultation_id,
    'twilio',
    room_name_generated,
    host_user_id,
    guest_user_id,
    scheduled_start_time,
    enable_recording,
    enable_transcription,
    'scheduled'
  )
  RETURNING id INTO session_id;

  -- Create participant records
  INSERT INTO video_call_participants (
    video_call_session_id,
    user_id,
    participant_role,
    connection_status
  ) VALUES
    (session_id, host_user_id, 'host', 'invited'),
    (session_id, guest_user_id, 'guest', 'invited');

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update call quality metrics
CREATE OR REPLACE FUNCTION record_call_quality_metric(
  session_id uuid,
  participant_user_id uuid,
  quality_data jsonb
)
RETURNS void AS $$
DECLARE
  participant_record record;
BEGIN
  -- Get participant
  SELECT * INTO participant_record
  FROM video_call_participants
  WHERE video_call_session_id = session_id
  AND user_id = participant_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  -- Insert quality metric
  INSERT INTO call_quality_metrics (
    video_call_session_id,
    participant_id,
    video_bitrate_kbps,
    video_framerate,
    audio_bitrate_kbps,
    latency_ms,
    quality_score,
    measured_at
  ) VALUES (
    session_id,
    participant_record.id,
    (quality_data->>'video_bitrate')::integer,
    (quality_data->>'video_framerate')::integer,
    (quality_data->>'audio_bitrate')::integer,
    (quality_data->>'latency')::integer,
    (quality_data->>'quality_score')::numeric,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: End video call session
CREATE OR REPLACE FUNCTION end_video_call_session(
  session_id uuid,
  actual_duration integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE video_call_sessions
  SET
    status = 'ended',
    actual_end = now(),
    duration_seconds = COALESCE(actual_duration, EXTRACT(EPOCH FROM (now() - actual_start))::integer),
    updated_at = now()
  WHERE id = session_id;

  -- End all active screen shares
  UPDATE screen_share_sessions
  SET
    status = 'stopped',
    ended_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer
  WHERE video_call_session_id = session_id
  AND status = 'active';

  -- Update participant left times
  UPDATE video_call_participants
  SET
    left_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM (now() - joined_at))::integer,
    connection_status = 'disconnected'
  WHERE video_call_session_id = session_id
  AND connection_status = 'connected';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_video_call_session TO authenticated;
GRANT EXECUTE ON FUNCTION record_call_quality_metric TO authenticated;
GRANT EXECUTE ON FUNCTION end_video_call_session TO authenticated;

-- Add helpful comments
COMMENT ON TABLE video_call_sessions IS 'Enhanced video consultation sessions with Twilio/Agora integration';
COMMENT ON TABLE call_recordings IS 'Video call recordings with automatic expiration';
COMMENT ON TABLE call_transcriptions IS 'Auto-generated transcriptions with AI summaries';
COMMENT ON TABLE call_quality_metrics IS 'Time-series call quality monitoring data';
