/*
  # Create Team Accounts System

  1. New Tables
    - `teams`
      - Store team/organization information
      - Track team settings and configuration
      - Support multiple account types

    - `team_members`
      - Link users to teams
      - Define roles and permissions
      - Track member status and activity

    - `team_invitations`
      - Manage pending team invitations
      - Track invitation status
      - Set expiration dates

  2. Security
    - Enable RLS on all tables
    - Team owners can manage team
    - Team members can view team info
    - Invitation recipients can accept/decline

  3. Features
    - Multiple teams per user
    - Role-based access control
    - Invitation system
    - Team switching
    - Shared resources
*/

-- Create team_account_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_account_type') THEN
    CREATE TYPE team_account_type AS ENUM ('personal', 'business', 'enterprise');
  END IF;
END $$;

-- Create team_member_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
    CREATE TYPE team_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END $$;

-- Create team_invitation_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_invitation_status') THEN
    CREATE TYPE team_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
  END IF;
END $$;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  account_type team_account_type DEFAULT 'personal' NOT NULL,
  avatar_url text,
  website text,
  email text,
  phone text,
  settings jsonb DEFAULT '{}'::jsonb,
  member_count integer DEFAULT 1 NOT NULL,
  max_members integer,
  is_active boolean DEFAULT true NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role team_member_role DEFAULT 'member' NOT NULL,
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true NOT NULL,
  last_active_at timestamptz,
  joined_at timestamptz DEFAULT now() NOT NULL,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role team_member_role DEFAULT 'member' NOT NULL,
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  status team_invitation_status DEFAULT 'pending' NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add team_id to relevant tables
DO $$
BEGIN
  -- Add to listings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_listings_team ON listings(team_id);
  END IF;

  -- Add to bookings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'provider_team_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN provider_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_bookings_provider_team ON bookings(provider_team_id);
  END IF;

  -- Add to transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_transactions_team ON transactions(team_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams

-- Users can view teams they are members of
CREATE POLICY "Users can view teams they belong to"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.is_active = true
    )
  );

-- Users can create teams
CREATE POLICY "Users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Team owners and admins can update team
CREATE POLICY "Team owners and admins can update team"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Only team owners can delete team
CREATE POLICY "Team owners can delete team"
  ON teams
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'owner'
        AND team_members.is_active = true
    )
  );

-- RLS Policies for team_members

-- Users can view members of teams they belong to
CREATE POLICY "Users can view team members"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Team owners and admins can add members
CREATE POLICY "Team owners and admins can add members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- Team owners and admins can update members
CREATE POLICY "Team owners and admins can update members"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- Team owners and admins can remove members
CREATE POLICY "Team owners and admins can remove members"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = true
    )
  );

-- Members can remove themselves
CREATE POLICY "Members can leave team"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for team_invitations

-- Users can view invitations for teams they manage
CREATE POLICY "Team admins can view invitations"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invitations.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Team owners and admins can create invitations
CREATE POLICY "Team admins can create invitations"
  ON team_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invitations.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Team admins and invitation recipients can update invitations
CREATE POLICY "Users can update invitations"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invitations.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
        AND team_members.is_active = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(team_id, role);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_teams_updated_at_trigger ON teams;
CREATE TRIGGER update_teams_updated_at_trigger
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

DROP TRIGGER IF EXISTS update_team_members_updated_at_trigger ON team_members;
CREATE TRIGGER update_team_members_updated_at_trigger
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

DROP TRIGGER IF EXISTS update_team_invitations_updated_at_trigger ON team_invitations;
CREATE TRIGGER update_team_invitations_updated_at_trigger
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Create function to update team member count
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE teams
    SET member_count = (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = NEW.team_id AND is_active = true
    )
    WHERE id = NEW.team_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams
    SET member_count = (
      SELECT COUNT(*)
      FROM team_members
      WHERE team_id = OLD.team_id AND is_active = true
    )
    WHERE id = OLD.team_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member count
DROP TRIGGER IF EXISTS update_team_member_count_trigger ON team_members;
CREATE TRIGGER update_team_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- Create function to automatically create team owner
CREATE OR REPLACE FUNCTION create_team_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as team owner
  INSERT INTO team_members (team_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.created_by, 'owner', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add owner
DROP TRIGGER IF EXISTS create_team_owner_trigger ON teams;
CREATE TRIGGER create_team_owner_trigger
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_owner();

-- Create function to generate team slug
CREATE OR REPLACE FUNCTION generate_team_slug(team_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert name to slug format
  base_slug := lower(regexp_replace(team_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM teams WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
DECLARE
  token text;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Create function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_invitation team_invitations%ROWTYPE;
  v_user_email text;
  v_team_member_id uuid;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if email matches
  IF v_invitation.email != v_user_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not for this email');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_invitation.team_id
      AND user_id = p_user_id
  ) THEN
    -- Update invitation as accepted anyway
    UPDATE team_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object('success', false, 'error', 'Already a team member');
  END IF;

  -- Add user to team
  INSERT INTO team_members (team_id, user_id, role, invited_by, is_active)
  VALUES (v_invitation.team_id, p_user_id, v_invitation.role, v_invitation.invited_by, true)
  RETURNING id INTO v_team_member_id;

  -- Update invitation status
  UPDATE team_invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  WHERE id = v_invitation.id;

  -- Send notification to team admins
  INSERT INTO notifications (user_id, title, message, type, reference_id)
  SELECT
    tm.user_id,
    'New Team Member',
    (SELECT full_name FROM profiles WHERE id = p_user_id) || ' joined the team',
    'team_member_joined',
    v_invitation.team_id::text
  FROM team_members tm
  WHERE tm.team_id = v_invitation.team_id
    AND tm.role IN ('owner', 'admin')
    AND tm.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_invitation.team_id,
    'member_id', v_team_member_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check team permissions
CREATE OR REPLACE FUNCTION check_team_permission(
  p_team_id uuid,
  p_user_id uuid,
  p_required_role team_member_role
)
RETURNS boolean AS $$
DECLARE
  v_user_role team_member_role;
  v_role_hierarchy integer;
  v_required_hierarchy integer;
BEGIN
  -- Get user's role in team
  SELECT role INTO v_user_role
  FROM team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Role hierarchy: owner > admin > member > viewer
  v_role_hierarchy := CASE v_user_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
  END;

  v_required_hierarchy := CASE p_required_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
  END;

  RETURN v_role_hierarchy >= v_required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for team summary
CREATE OR REPLACE VIEW team_summary AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.description,
  t.account_type,
  t.avatar_url,
  t.member_count,
  t.is_active,
  t.created_at,
  -- Owner info
  o.id AS owner_id,
  o.full_name AS owner_name,
  o.avatar_url AS owner_avatar,
  -- Member roles
  jsonb_agg(
    jsonb_build_object(
      'user_id', tm.user_id,
      'role', tm.role,
      'joined_at', tm.joined_at
    ) ORDER BY tm.joined_at
  ) AS members,
  -- Pending invitations
  (SELECT COUNT(*) FROM team_invitations WHERE team_id = t.id AND status = 'pending') AS pending_invitations
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = true
LEFT JOIN profiles o ON o.id = t.created_by
GROUP BY t.id, o.id;

-- Grant access to view
GRANT SELECT ON team_summary TO authenticated;

-- Create function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_team_invitations()
RETURNS void AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
