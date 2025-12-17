/*
  # Setup pg_cron Jobs for Automation

  This migration sets up scheduled jobs using pg_cron extension.

  IMPORTANT: Before running this migration:
  1. Enable pg_cron extension in Supabase Dashboard:
     Database → Extensions → Enable "pg_cron"

  2. Replace placeholders:
     - YOUR_PROJECT_REF: Your Supabase project reference
     - YOUR_SERVICE_ROLE_KEY: Your Supabase service role key

  Jobs Created:
  1. update-trending-hourly: Updates trending scores every hour
  2. process-badges-daily: Processes badge updates daily at 2 AM UTC
  3. cleanup-trending-daily: Cleans up old trending data daily at 3 AM UTC
*/

-- Note: Uncomment and configure these jobs after adding your credentials

/*
-- Job 1: Update Trending Scores (Every Hour)
SELECT cron.schedule(
  'update-trending-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-trending-scores',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Job 2: Process Badge Updates (Daily at 2 AM UTC)
SELECT cron.schedule(
  'process-badges-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-badge-updates',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- Job 3: Cleanup Trending Data (Daily at 3 AM UTC)
SELECT cron.schedule(
  'cleanup-trending-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-trending-data',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 30000
  );
  $$
);
*/

-- Helper queries (these can be run anytime)

-- View all scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule a job (if needed)
-- SELECT cron.unschedule('job-name');

-- Alternative: Call database functions directly (faster, no HTTP overhead)
-- These can be uncommented and used instead of HTTP calls

/*
-- Job 1: Update Trending (Direct DB Call)
SELECT cron.schedule(
  'update-trending-hourly-direct',
  '0 * * * *',
  $$
  SELECT update_all_trending_scores();
  $$
);

-- Job 2: Process Badges (Direct DB Call)
SELECT cron.schedule(
  'process-badges-daily-direct',
  '0 2 * * *',
  $$
  SELECT process_all_badge_updates();
  $$
);

-- Job 3: Cleanup (Direct DB Call)
SELECT cron.schedule(
  'cleanup-trending-daily-direct',
  '0 3 * * *',
  $$
  SELECT cleanup_trending_cache();
  $$
);
*/

-- Function to check job health
CREATE OR REPLACE FUNCTION check_cron_job_health()
RETURNS TABLE (
  job_name text,
  schedule text,
  last_run_status text,
  last_run_time timestamptz,
  minutes_since_last_run numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobname::text,
    j.schedule::text,
    CASE
      WHEN jrd.status = 'succeeded' THEN '✅ Success'
      WHEN jrd.status = 'failed' THEN '❌ Failed'
      ELSE 'Unknown'
    END as status,
    jrd.end_time,
    EXTRACT(EPOCH FROM (now() - jrd.end_time)) / 60 as minutes_ago
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT *
    FROM cron.job_run_details
    WHERE jobid = j.jobid
    ORDER BY end_time DESC
    LIMIT 1
  ) jrd ON true
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_cron_job_health IS 'Check the health status of all scheduled cron jobs';

-- Example usage:
-- SELECT * FROM check_cron_job_health();
