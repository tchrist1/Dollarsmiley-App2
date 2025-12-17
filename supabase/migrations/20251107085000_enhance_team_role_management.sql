/*
  # Enhance Team Role Management

  1. New Tables
    - `team_role_templates`
      - Predefined role templates with permissions
      - Customizable per organization

    - `team_permissions`
      - Granular permission definitions
      - Resource-based access control

    - `team_member_audit_log`
      - Track all role changes
      - Maintain audit trail

  2. Enhancements
    - Custom permissions per member
    - Role templates
    - Permission inheritance
    - Audit logging
    - Activity tracking

  3. Security
    - Enhanced RLS policies
    - Permission validation
    - Action logging
*/

-- Create permission categories enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_category') THEN
    CREATE TYPE permission_category AS ENUM (
      'team_management',
      'member_management',
      'booking_management',
      'financial_management',
      'content_management',
      'analytics',
      'settings'
    );
  END IF;
END $$;

-- Create audit action enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'member_added',
      'member_removed',
      'role_changed',
      'permissions_updated',
      'member_invited',
      'invitation_cancelled',
      'member_activated',
      'member_deactivated'
    );
  END IF;
END $$;

-- Create team_permissions table
CREATE TABLE IF NOT EXISTS team_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category permission_category NOT NULL,
  is_system boolean DEFAULT true NOT NULL,
  requires_owner boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create team_role_templates table
CREATE TABLE IF NOT EXISTS team_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_role team_member_role NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_system boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, name)
);

-- Create team_member_audit_log table
CREATE TABLE IF NOT EXISTS team_member_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add custom permissions to team_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'custom_permissions'
  ) THEN
    ALTER TABLE team_members ADD COLUMN custom_permissions jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'role_template_id'
  ) THEN
    ALTER TABLE team_members ADD COLUMN role_template_id uuid REFERENCES team_role_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'permissions_override'
  ) THEN
    ALTER TABLE team_members ADD COLUMN permissions_override boolean DEFAULT false;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_permissions (public read)
CREATE POLICY "Anyone can view permissions"
  ON team_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for team_role_templates
CREATE POLICY "Team members can view role templates"
  ON team_role_templates
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL -- System templates
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_role_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

CREATE POLICY "Team admins can manage role templates"
  ON team_role_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_role_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_role_templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- RLS Policies for team_member_audit_log
CREATE POLICY "Team admins can view audit logs"
  ON team_member_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_member_audit_log.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- System can insert audit logs
CREATE POLICY "System can create audit logs"
  ON team_member_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_permissions_category ON team_permissions(category);
CREATE INDEX IF NOT EXISTS idx_team_permissions_code ON team_permissions(code);
CREATE INDEX IF NOT EXISTS idx_team_role_templates_team ON team_role_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_team_role_templates_base_role ON team_role_templates(base_role);
CREATE INDEX IF NOT EXISTS idx_team_member_audit_team ON team_member_audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_audit_member ON team_member_audit_log(member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_audit_action ON team_member_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_team_member_audit_created ON team_member_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_role_template ON team_members(role_template_id);

-- Insert default permissions
INSERT INTO team_permissions (code, name, description, category, requires_owner) VALUES
  -- Team Management
  ('team.view', 'View Team', 'View team information', 'team_management', false),
  ('team.edit', 'Edit Team', 'Edit team settings', 'team_management', false),
  ('team.delete', 'Delete Team', 'Delete the team', 'team_management', true),

  -- Member Management
  ('members.view', 'View Members', 'View team members', 'member_management', false),
  ('members.invite', 'Invite Members', 'Send team invitations', 'member_management', false),
  ('members.edit', 'Edit Members', 'Change member roles', 'member_management', false),
  ('members.remove', 'Remove Members', 'Remove team members', 'member_management', false),

  -- Booking Management
  ('bookings.view', 'View Bookings', 'View team bookings', 'booking_management', false),
  ('bookings.create', 'Create Bookings', 'Create new bookings', 'booking_management', false),
  ('bookings.edit', 'Edit Bookings', 'Modify bookings', 'booking_management', false),
  ('bookings.cancel', 'Cancel Bookings', 'Cancel bookings', 'booking_management', false),
  ('bookings.approve', 'Approve Bookings', 'Approve booking requests', 'booking_management', false),

  -- Financial Management
  ('finance.view', 'View Finances', 'View financial data', 'financial_management', false),
  ('finance.transactions', 'Manage Transactions', 'Handle payments and payouts', 'financial_management', false),
  ('finance.reports', 'Financial Reports', 'Generate financial reports', 'financial_management', false),

  -- Content Management
  ('content.view', 'View Content', 'View team content', 'content_management', false),
  ('content.create', 'Create Content', 'Create new content', 'content_management', false),
  ('content.edit', 'Edit Content', 'Modify content', 'content_management', false),
  ('content.delete', 'Delete Content', 'Delete content', 'content_management', false),
  ('content.publish', 'Publish Content', 'Publish content', 'content_management', false),

  -- Analytics
  ('analytics.view', 'View Analytics', 'View analytics dashboard', 'analytics', false),
  ('analytics.export', 'Export Analytics', 'Export analytics data', 'analytics', false),

  -- Settings
  ('settings.view', 'View Settings', 'View team settings', 'settings', false),
  ('settings.edit', 'Edit Settings', 'Modify team settings', 'settings', false)
ON CONFLICT (code) DO NOTHING;

-- Create function to get member permissions
CREATE OR REPLACE FUNCTION get_member_permissions(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_member team_members%ROWTYPE;
  v_template team_role_templates%ROWTYPE;
  v_base_permissions jsonb := '[]'::jsonb;
  v_custom_permissions jsonb := '[]'::jsonb;
  v_all_permissions jsonb := '[]'::jsonb;
BEGIN
  -- Get member
  SELECT * INTO v_member
  FROM team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Owner gets all permissions
  IF v_member.role = 'owner' THEN
    SELECT jsonb_agg(code)
    INTO v_all_permissions
    FROM team_permissions;
    RETURN v_all_permissions;
  END IF;

  -- Get base permissions from role
  CASE v_member.role
    WHEN 'admin' THEN
      SELECT jsonb_agg(code)
      INTO v_base_permissions
      FROM team_permissions
      WHERE requires_owner = false;

    WHEN 'member' THEN
      v_base_permissions := jsonb_build_array(
        'team.view', 'members.view',
        'bookings.view', 'bookings.create', 'bookings.edit',
        'content.view', 'content.create',
        'finance.view', 'analytics.view'
      );

    WHEN 'viewer' THEN
      v_base_permissions := jsonb_build_array(
        'team.view', 'members.view',
        'bookings.view', 'content.view',
        'analytics.view'
      );
  END CASE;

  -- Apply role template if exists
  IF v_member.role_template_id IS NOT NULL THEN
    SELECT * INTO v_template
    FROM team_role_templates
    WHERE id = v_member.role_template_id;

    IF FOUND THEN
      v_base_permissions := v_template.permissions;
    END IF;
  END IF;

  -- Apply custom permissions if override enabled
  IF v_member.permissions_override THEN
    v_custom_permissions := v_member.custom_permissions;
    -- Merge permissions
    v_all_permissions := v_base_permissions || v_custom_permissions;
  ELSE
    v_all_permissions := v_base_permissions;
  END IF;

  -- Remove duplicates
  SELECT jsonb_agg(DISTINCT value)
  INTO v_all_permissions
  FROM jsonb_array_elements(v_all_permissions);

  RETURN COALESCE(v_all_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check member permission
CREATE OR REPLACE FUNCTION check_member_permission(
  p_team_id uuid,
  p_user_id uuid,
  p_permission text
)
RETURNS boolean AS $$
DECLARE
  v_permissions jsonb;
BEGIN
  v_permissions := get_member_permissions(p_team_id, p_user_id);
  RETURN v_permissions ? p_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log member action
CREATE OR REPLACE FUNCTION log_member_action(
  p_team_id uuid,
  p_member_id uuid,
  p_action audit_action,
  p_performed_by uuid,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_user_id uuid;
BEGIN
  -- Get user_id from member_id if provided
  IF p_member_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM team_members
    WHERE id = p_member_id;
  END IF;

  INSERT INTO team_member_audit_log (
    team_id,
    member_id,
    user_id,
    action,
    performed_by,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_team_id,
    p_member_id,
    v_user_id,
    p_action,
    p_performed_by,
    p_old_value,
    p_new_value,
    p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION trigger_log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role change
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_member_action(
      NEW.team_id,
      NEW.id,
      'role_changed',
      auth.uid(),
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
  END IF;

  -- Log permission changes
  IF OLD.custom_permissions IS DISTINCT FROM NEW.custom_permissions OR
     OLD.permissions_override IS DISTINCT FROM NEW.permissions_override THEN
    PERFORM log_member_action(
      NEW.team_id,
      NEW.id,
      'permissions_updated',
      auth.uid(),
      jsonb_build_object(
        'custom_permissions', OLD.custom_permissions,
        'permissions_override', OLD.permissions_override
      ),
      jsonb_build_object(
        'custom_permissions', NEW.custom_permissions,
        'permissions_override', NEW.permissions_override
      )
    );
  END IF;

  -- Log activation/deactivation
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    PERFORM log_member_action(
      NEW.team_id,
      NEW.id,
      CASE WHEN NEW.is_active THEN 'member_activated' ELSE 'member_deactivated' END,
      auth.uid(),
      jsonb_build_object('is_active', OLD.is_active),
      jsonb_build_object('is_active', NEW.is_active)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_member_changes_trigger ON team_members;
CREATE TRIGGER log_member_changes_trigger
  AFTER UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_role_change();

-- Create trigger to log member additions
CREATE OR REPLACE FUNCTION trigger_log_member_add()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_member_action(
    NEW.team_id,
    NEW.id,
    'member_added',
    COALESCE(NEW.invited_by, auth.uid()),
    NULL,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'role', NEW.role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_member_add_trigger ON team_members;
CREATE TRIGGER log_member_add_trigger
  AFTER INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_member_add();

-- Create trigger to log member removals
CREATE OR REPLACE FUNCTION trigger_log_member_remove()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_member_action(
    OLD.team_id,
    OLD.id,
    'member_removed',
    auth.uid(),
    jsonb_build_object(
      'user_id', OLD.user_id,
      'role', OLD.role
    ),
    NULL
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_member_remove_trigger ON team_members;
CREATE TRIGGER log_member_remove_trigger
  BEFORE DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_member_remove();

-- Create view for member permissions summary
CREATE OR REPLACE VIEW team_member_permissions AS
SELECT
  tm.id AS member_id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.permissions_override,
  get_member_permissions(tm.team_id, tm.user_id) AS permissions,
  p.full_name,
  p.email,
  p.avatar_url
FROM team_members tm
JOIN profiles p ON p.id = tm.user_id
WHERE tm.is_active = true;

GRANT SELECT ON team_member_permissions TO authenticated;

-- Create function to get audit log summary
CREATE OR REPLACE FUNCTION get_team_audit_summary(
  p_team_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  action audit_action,
  count bigint,
  last_occurrence timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.action,
    COUNT(*) AS count,
    MAX(a.created_at) AS last_occurrence
  FROM team_member_audit_log a
  WHERE a.team_id = p_team_id
    AND a.created_at >= now() - (p_days || ' days')::interval
  GROUP BY a.action
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
