/*
  # Moderation Queue Management Functions

  1. New Functions
    - get_moderation_queue - Get queue items with filters
    - get_queue_item_details - Get detailed view of single item
    - assign_queue_item - Assign item to moderator
    - take_moderation_action - Process moderation decision
    - get_moderation_stats - Dashboard statistics
    - get_moderator_workload - Track moderator activity

  2. Features
    - Advanced filtering and sorting
    - Bulk action support
    - Auto-assignment logic
    - Performance metrics
*/

-- Function to get moderation queue with filters
CREATE OR REPLACE FUNCTION get_moderation_queue(
  p_status text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_priority_min numeric DEFAULT 0,
  p_assigned_to uuid DEFAULT NULL,
  p_auto_flagged boolean DEFAULT NULL,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  report_id uuid,
  content_type text,
  content_id uuid,
  content_author_id uuid,
  content_snapshot jsonb,
  total_reports integer,
  unique_reporters integer,
  auto_flagged boolean,
  auto_flag_reason text,
  priority_score numeric,
  assigned_to uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  author_profile jsonb,
  report_categories jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mq.id,
    mq.report_id,
    mq.content_type,
    mq.content_id,
    mq.content_author_id,
    mq.content_snapshot,
    mq.total_reports,
    mq.unique_reporters,
    mq.auto_flagged,
    mq.auto_flag_reason,
    mq.priority_score,
    mq.assigned_to,
    mq.status,
    mq.created_at,
    mq.updated_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'user_type', p.user_type,
      'is_verified', p.is_verified
    ) as author_profile,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'category_name', rc.name,
          'category_icon', rc.icon,
          'severity', rc.severity,
          'report_count', COUNT(*)
        )
      )
      FROM content_reports cr
      JOIN report_categories rc ON cr.category_id = rc.id
      WHERE cr.content_type = mq.content_type
        AND cr.content_id = mq.content_id
      GROUP BY rc.name, rc.icon, rc.severity
    ) as report_categories
  FROM moderation_queue mq
  LEFT JOIN profiles p ON mq.content_author_id = p.id
  WHERE
    (p_status IS NULL OR mq.status = p_status)
    AND (p_content_type IS NULL OR mq.content_type = p_content_type)
    AND mq.priority_score >= p_priority_min
    AND (p_assigned_to IS NULL OR mq.assigned_to = p_assigned_to)
    AND (p_auto_flagged IS NULL OR mq.auto_flagged = p_auto_flagged)
  ORDER BY
    mq.priority_score DESC,
    mq.created_at ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed queue item with all reports
CREATE OR REPLACE FUNCTION get_queue_item_details(p_queue_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'queue_item', row_to_json(mq.*),
    'author', row_to_json(p.*),
    'reports', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cr.id,
          'reporter_id', cr.reporter_id,
          'category', rc.*,
          'reason', cr.reason,
          'description', cr.description,
          'evidence_urls', cr.evidence_urls,
          'created_at', cr.created_at
        )
        ORDER BY cr.created_at DESC
      )
      FROM content_reports cr
      JOIN report_categories rc ON cr.category_id = rc.id
      WHERE cr.content_type = mq.content_type
        AND cr.content_id = mq.content_id
    ),
    'previous_actions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ma.id,
          'moderator_id', ma.moderator_id,
          'moderator_name', mp.full_name,
          'action_type', ma.action_type,
          'reason', ma.reason,
          'created_at', ma.created_at
        )
        ORDER BY ma.created_at DESC
      )
      FROM moderation_actions ma
      JOIN profiles mp ON ma.moderator_id = mp.id
      WHERE ma.queue_item_id = mq.id
    ),
    'author_history', (
      SELECT jsonb_build_object(
        'total_reports', COUNT(DISTINCT cr2.id),
        'total_strikes', (
          SELECT COUNT(*) FROM content_strikes
          WHERE user_id = mq.content_author_id
        ),
        'active_strikes', (
          SELECT COUNT(*) FROM content_strikes
          WHERE user_id = mq.content_author_id
            AND (expires_at IS NULL OR expires_at > NOW())
        ),
        'recent_violations', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'violation_category', cs.violation_category,
              'severity', cs.severity,
              'created_at', cs.created_at
            )
            ORDER BY cs.created_at DESC
          )
          FROM content_strikes cs
          WHERE cs.user_id = mq.content_author_id
          LIMIT 5
        )
      )
      FROM content_reports cr2
      WHERE cr2.content_id IN (
        SELECT content_id FROM moderation_queue
        WHERE content_author_id = mq.content_author_id
      )
    )
  ) INTO v_result
  FROM moderation_queue mq
  LEFT JOIN profiles p ON mq.content_author_id = p.id
  WHERE mq.id = p_queue_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign queue item to moderator
CREATE OR REPLACE FUNCTION assign_queue_item(
  p_queue_id uuid,
  p_moderator_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_assigned_moderator uuid;
BEGIN
  -- If no moderator specified, auto-assign to least busy
  IF p_moderator_id IS NULL THEN
    SELECT ar.user_id INTO v_assigned_moderator
    FROM admin_roles ar
    WHERE ar.role IN ('Admin', 'Moderator')
    ORDER BY (
      SELECT COUNT(*)
      FROM moderation_queue mq
      WHERE mq.assigned_to = ar.user_id
        AND mq.status = 'in_review'
    ) ASC
    LIMIT 1;
  ELSE
    v_assigned_moderator := p_moderator_id;
  END IF;

  -- Update queue item
  UPDATE moderation_queue SET
    assigned_to = v_assigned_moderator,
    status = 'in_review',
    updated_at = NOW()
  WHERE id = p_queue_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to take moderation action
CREATE OR REPLACE FUNCTION take_moderation_action(
  p_queue_id uuid,
  p_action_type text,
  p_reason text,
  p_internal_notes text DEFAULT NULL,
  p_strike_severity text DEFAULT NULL,
  p_strike_count integer DEFAULT 1
)
RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
  v_queue_item RECORD;
  v_strike_id uuid;
BEGIN
  -- Get queue item details
  SELECT * INTO v_queue_item
  FROM moderation_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found';
  END IF;

  -- Create moderation action record
  INSERT INTO moderation_actions (
    queue_item_id,
    moderator_id,
    action_type,
    reason,
    internal_notes,
    content_removed,
    user_notified,
    strike_issued
  ) VALUES (
    p_queue_id,
    auth.uid(),
    p_action_type,
    p_reason,
    p_internal_notes,
    p_action_type IN ('remove_content', 'ban_user'),
    true,
    p_action_type IN ('warn', 'remove_content', 'suspend_user', 'ban_user')
  ) RETURNING id INTO v_action_id;

  -- Handle different action types
  CASE p_action_type
    WHEN 'dismiss' THEN
      -- Update all related reports as dismissed
      UPDATE content_reports SET
        status = 'dismissed',
        updated_at = NOW()
      WHERE content_type = v_queue_item.content_type
        AND content_id = v_queue_item.content_id;

      -- Remove from queue
      UPDATE moderation_queue SET
        status = 'resolved',
        updated_at = NOW()
      WHERE id = p_queue_id;

    WHEN 'warn' THEN
      -- Issue warning (minor strike)
      INSERT INTO content_strikes (
        user_id,
        content_type,
        content_id,
        violation_category,
        violation_description,
        severity,
        moderation_action_id,
        strike_count,
        expires_at
      ) VALUES (
        v_queue_item.content_author_id,
        v_queue_item.content_type,
        v_queue_item.content_id,
        'Warning',
        p_reason,
        'minor',
        v_action_id,
        1,
        NOW() + INTERVAL '30 days'
      ) RETURNING id INTO v_strike_id;

      -- Update reports as resolved
      UPDATE content_reports SET
        status = 'resolved',
        updated_at = NOW()
      WHERE content_type = v_queue_item.content_type
        AND content_id = v_queue_item.content_id;

      UPDATE moderation_queue SET
        status = 'resolved',
        updated_at = NOW()
      WHERE id = p_queue_id;

    WHEN 'remove_content' THEN
      -- Issue strike
      INSERT INTO content_strikes (
        user_id,
        content_type,
        content_id,
        violation_category,
        violation_description,
        severity,
        moderation_action_id,
        strike_count
      ) VALUES (
        v_queue_item.content_author_id,
        v_queue_item.content_type,
        v_queue_item.content_id,
        'Content Violation',
        p_reason,
        COALESCE(p_strike_severity, 'moderate'),
        v_action_id,
        p_strike_count
      ) RETURNING id INTO v_strike_id;

      -- Mark content as removed (implement deletion in app logic)
      -- This would typically update the content table to set is_deleted = true

      UPDATE content_reports SET
        status = 'resolved',
        updated_at = NOW()
      WHERE content_type = v_queue_item.content_type
        AND content_id = v_queue_item.content_id;

      UPDATE moderation_queue SET
        status = 'resolved',
        updated_at = NOW()
      WHERE id = p_queue_id;

    WHEN 'suspend_user' THEN
      -- Issue severe strike
      INSERT INTO content_strikes (
        user_id,
        content_type,
        content_id,
        violation_category,
        violation_description,
        severity,
        moderation_action_id,
        strike_count,
        expires_at
      ) VALUES (
        v_queue_item.content_author_id,
        v_queue_item.content_type,
        v_queue_item.content_id,
        'Account Suspension',
        p_reason,
        'severe',
        v_action_id,
        3,
        NOW() + INTERVAL '7 days'
      ) RETURNING id INTO v_strike_id;

      -- Mark user as suspended (implement in app logic)

      UPDATE content_reports SET
        status = 'resolved',
        updated_at = NOW()
      WHERE content_type = v_queue_item.content_type
        AND content_id = v_queue_item.content_id;

      UPDATE moderation_queue SET
        status = 'resolved',
        updated_at = NOW()
      WHERE id = p_queue_id;

    WHEN 'ban_user' THEN
      -- Issue critical strike (permanent)
      INSERT INTO content_strikes (
        user_id,
        content_type,
        content_id,
        violation_category,
        violation_description,
        severity,
        moderation_action_id,
        strike_count
      ) VALUES (
        v_queue_item.content_author_id,
        v_queue_item.content_type,
        v_queue_item.content_id,
        'Account Ban',
        p_reason,
        'critical',
        v_action_id,
        5
      ) RETURNING id INTO v_strike_id;

      -- Ban user (implement in app logic)

      UPDATE content_reports SET
        status = 'resolved',
        updated_at = NOW()
      WHERE content_type = v_queue_item.content_type
        AND content_id = v_queue_item.content_id;

      UPDATE moderation_queue SET
        status = 'resolved',
        updated_at = NOW()
      WHERE id = p_queue_id;

    WHEN 'escalate' THEN
      UPDATE moderation_queue SET
        status = 'escalated',
        assigned_to = NULL,
        updated_at = NOW()
      WHERE id = p_queue_id;

      UPDATE content_reports SET
        status = 'escalated',
        updated_at = NOW()
      WHERE content_type = v_queue_item.content_type
        AND content_id = v_queue_item.content_id;

    ELSE
      RAISE EXCEPTION 'Invalid action type';
  END CASE;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get moderation statistics
CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'queue_summary', jsonb_build_object(
      'total_pending', (
        SELECT COUNT(*) FROM moderation_queue
        WHERE status = 'pending'
      ),
      'in_review', (
        SELECT COUNT(*) FROM moderation_queue
        WHERE status = 'in_review'
      ),
      'escalated', (
        SELECT COUNT(*) FROM moderation_queue
        WHERE status = 'escalated'
      ),
      'high_priority', (
        SELECT COUNT(*) FROM moderation_queue
        WHERE status = 'pending' AND priority_score >= 50
      ),
      'auto_flagged', (
        SELECT COUNT(*) FROM moderation_queue
        WHERE auto_flagged = true AND status = 'pending'
      )
    ),
    'reports_summary', jsonb_build_object(
      'total_today', (
        SELECT COUNT(*) FROM content_reports
        WHERE created_at >= CURRENT_DATE
      ),
      'pending', (
        SELECT COUNT(*) FROM content_reports
        WHERE status = 'pending'
      ),
      'by_category', (
        SELECT jsonb_object_agg(rc.name, report_count)
        FROM (
          SELECT rc.name, COUNT(*) as report_count
          FROM content_reports cr
          JOIN report_categories rc ON cr.category_id = rc.id
          WHERE cr.created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY rc.name
          ORDER BY report_count DESC
          LIMIT 5
        ) rc
      )
    ),
    'actions_summary', jsonb_build_object(
      'total_today', (
        SELECT COUNT(*) FROM moderation_actions
        WHERE created_at >= CURRENT_DATE
      ),
      'by_type', (
        SELECT jsonb_object_agg(action_type, action_count)
        FROM (
          SELECT action_type, COUNT(*) as action_count
          FROM moderation_actions
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY action_type
          ORDER BY action_count DESC
        ) ma
      )
    ),
    'moderator_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'moderator_id', moderator_id,
          'moderator_name', p.full_name,
          'actions_today', COUNT(*)
        )
        ORDER BY COUNT(*) DESC
      )
      FROM moderation_actions ma
      JOIN profiles p ON ma.moderator_id = p.id
      WHERE ma.created_at >= CURRENT_DATE
      GROUP BY ma.moderator_id, p.full_name
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get moderator workload
CREATE OR REPLACE FUNCTION get_moderator_workload(p_moderator_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'assigned_items', (
      SELECT COUNT(*) FROM moderation_queue
      WHERE assigned_to = p_moderator_id AND status = 'in_review'
    ),
    'completed_today', (
      SELECT COUNT(*) FROM moderation_actions
      WHERE moderator_id = p_moderator_id
        AND created_at >= CURRENT_DATE
    ),
    'completed_this_week', (
      SELECT COUNT(*) FROM moderation_actions
      WHERE moderator_id = p_moderator_id
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'average_response_time_minutes', (
      SELECT AVG(
        EXTRACT(EPOCH FROM (ma.created_at - mq.created_at)) / 60
      )::integer
      FROM moderation_actions ma
      JOIN moderation_queue mq ON ma.queue_item_id = mq.id
      WHERE ma.moderator_id = p_moderator_id
        AND ma.created_at >= CURRENT_DATE - INTERVAL '7 days'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk dismiss reports
CREATE OR REPLACE FUNCTION bulk_dismiss_queue_items(
  p_queue_ids uuid[],
  p_reason text
)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE moderation_queue SET
    status = 'resolved',
    updated_at = NOW()
  WHERE id = ANY(p_queue_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Create action records
  INSERT INTO moderation_actions (
    queue_item_id,
    moderator_id,
    action_type,
    reason
  )
  SELECT
    unnest(p_queue_ids),
    auth.uid(),
    'dismiss',
    p_reason;

  -- Update related reports
  UPDATE content_reports SET
    status = 'dismissed',
    updated_at = NOW()
  WHERE (content_type, content_id) IN (
    SELECT content_type, content_id
    FROM moderation_queue
    WHERE id = ANY(p_queue_ids)
  );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_moderation_queue IS 'Get moderation queue items with advanced filtering and sorting';
COMMENT ON FUNCTION get_queue_item_details IS 'Get comprehensive details for a single queue item including reports and history';
COMMENT ON FUNCTION assign_queue_item IS 'Assign queue item to moderator with auto-assignment support';
COMMENT ON FUNCTION take_moderation_action IS 'Process moderation decision and execute appropriate actions';
COMMENT ON FUNCTION get_moderation_stats IS 'Get dashboard statistics for moderation overview';
COMMENT ON FUNCTION get_moderator_workload IS 'Get workload metrics for specific moderator';
COMMENT ON FUNCTION bulk_dismiss_queue_items IS 'Dismiss multiple queue items at once';
