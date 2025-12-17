import { supabase } from './supabase';

export type AccountType = 'personal' | 'business' | 'enterprise';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  account_type: AccountType;
  avatar_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  settings: Record<string, any>;
  member_count: number;
  max_members?: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: MemberRole;
  permissions: string[];
  is_active: boolean;
  last_active_at?: string;
  joined_at: string;
  invited_by?: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: MemberRole;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  message?: string;
  created_at: string;
  team?: {
    name: string;
    avatar_url?: string;
  };
  inviter?: {
    full_name: string;
    avatar_url?: string;
  };
}

export async function createTeam(
  userId: string,
  data: {
    name: string;
    description?: string;
    account_type?: AccountType;
    avatar_url?: string;
    website?: string;
    email?: string;
    phone?: string;
  }
): Promise<Team | null> {
  try {
    // Generate slug
    const { data: slugData, error: slugError } = await supabase.rpc(
      'generate_team_slug',
      { team_name: data.name }
    );

    if (slugError) throw slugError;

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name: data.name,
        slug: slugData,
        description: data.description,
        account_type: data.account_type || 'personal',
        avatar_url: data.avatar_url,
        website: data.website,
        email: data.email,
        phone: data.phone,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return team;
  } catch (error) {
    console.error('Error creating team:', error);
    return null;
  }
}

export async function updateTeam(
  teamId: string,
  data: {
    name?: string;
    description?: string;
    avatar_url?: string;
    website?: string;
    email?: string;
    phone?: string;
    settings?: Record<string, any>;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('teams')
      .update(data)
      .eq('id', teamId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating team:', error);
    return false;
  }
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting team:', error);
    return false;
  }
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members!inner(user_id, role, is_active)
      `)
      .eq('team_members.user_id', userId)
      .eq('team_members.is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting user teams:', error);
    return [];
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting team:', error);
    return null;
  }
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:profiles(full_name, email, avatar_url)
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting team members:', error);
    return [];
  }
}

export async function inviteTeamMember(
  teamId: string,
  invitedBy: string,
  data: {
    email: string;
    role: MemberRole;
    message?: string;
  }
): Promise<TeamInvitation | null> {
  try {
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', (await supabase.from('profiles').select('id').eq('email', data.email).single()).data?.id)
      .single();

    if (existingMember) {
      throw new Error('User is already a team member');
    }

    // Check for pending invitation
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', data.email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    // Generate token
    const { data: token, error: tokenError } = await supabase.rpc('generate_invitation_token');
    if (tokenError) throw tokenError;

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: data.email,
        role: data.role,
        invited_by: invitedBy,
        message: data.message,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Send invitation email notification
    await sendInvitationNotification(invitation);

    return invitation;
  } catch (error: any) {
    console.error('Error inviting team member:', error);
    throw error;
  }
}

async function sendInvitationNotification(invitation: TeamInvitation): Promise<void> {
  try {
    // Get team and inviter info
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', invitation.team_id)
      .single();

    const { data: inviter } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', invitation.invited_by)
      .single();

    // Check if invited user exists
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invitation.email)
      .single();

    if (user) {
      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Team Invitation',
        message: `${inviter?.full_name} invited you to join ${team?.name}`,
        type: 'team_invitation',
        reference_id: invitation.id,
      });
    }

    // TODO: Send email notification
  } catch (error) {
    console.error('Error sending invitation notification:', error);
  }
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; error?: string; teamId?: string }> {
  try {
    const { data, error } = await supabase.rpc('accept_team_invitation', {
      p_token: token,
      p_user_id: userId,
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error.message };
  }
}

export async function declineInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error declining invitation:', error);
    return false;
  }
}

export async function cancelInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return false;
  }
}

export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams(name, avatar_url),
        inviter:profiles!invited_by(full_name, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting team invitations:', error);
    return [];
  }
}

export async function getUserInvitations(email: string): Promise<TeamInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams(name, avatar_url),
        inviter:profiles!invited_by(full_name, avatar_url)
      `)
      .eq('email', email)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting user invitations:', error);
    return [];
  }
}

export async function updateMemberRole(
  teamId: string,
  memberId: string,
  role: MemberRole
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating member role:', error);
    return false;
  }
}

export async function removeMember(teamId: string, memberId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error removing member:', error);
    return false;
  }
}

export async function leaveTeam(teamId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error leaving team:', error);
    return false;
  }
}

export async function checkTeamPermission(
  teamId: string,
  userId: string,
  requiredRole: MemberRole
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_team_permission', {
      p_team_id: teamId,
      p_user_id: userId,
      p_required_role: requiredRole,
    });

    if (error) throw error;

    return data || false;
  } catch (error) {
    console.error('Error checking team permission:', error);
    return false;
  }
}

export function getRoleLabel(role: MemberRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'member':
      return 'Member';
    case 'viewer':
      return 'Viewer';
  }
}

export function getRoleColor(role: MemberRole): string {
  switch (role) {
    case 'owner':
      return '#8B5CF6'; // purple
    case 'admin':
      return '#3B82F6'; // blue
    case 'member':
      return '#10B981'; // green
    case 'viewer':
      return '#6B7280'; // gray
  }
}

export function getAccountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'personal':
      return 'Personal';
    case 'business':
      return 'Business';
    case 'enterprise':
      return 'Enterprise';
  }
}

export function canManageMembers(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

export function canEditTeam(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

export function canDeleteTeam(role: MemberRole): boolean {
  return role === 'owner';
}
