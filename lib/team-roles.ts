import { supabase } from './supabase';
import type { MemberRole } from './teams';

export type PermissionCategory =
  | 'team_management'
  | 'member_management'
  | 'booking_management'
  | 'financial_management'
  | 'content_management'
  | 'analytics'
  | 'settings';

export type AuditAction =
  | 'member_added'
  | 'member_removed'
  | 'role_changed'
  | 'permissions_updated'
  | 'member_invited'
  | 'invitation_cancelled'
  | 'member_activated'
  | 'member_deactivated';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  is_system: boolean;
  requires_owner: boolean;
  created_at: string;
}

export interface RoleTemplate {
  id: string;
  team_id?: string;
  name: string;
  description?: string;
  base_role: MemberRole;
  permissions: string[];
  is_system: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  team_id: string;
  member_id?: string;
  user_id?: string;
  action: AuditAction;
  performed_by: string;
  old_value?: any;
  new_value?: any;
  metadata?: any;
  created_at: string;
  performer?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('team_permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting permissions:', error);
    return [];
  }
}

export async function getPermissionsByCategory(
  category: PermissionCategory
): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('team_permissions')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting permissions by category:', error);
    return [];
  }
}

export async function getMemberPermissions(
  teamId: string,
  userId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_member_permissions', {
      p_team_id: teamId,
      p_user_id: userId,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting member permissions:', error);
    return [];
  }
}

export async function checkMemberPermission(
  teamId: string,
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_member_permission', {
      p_team_id: teamId,
      p_user_id: userId,
      p_permission: permission,
    });

    if (error) throw error;

    return data || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function updateMemberPermissions(
  teamId: string,
  memberId: string,
  customPermissions: string[],
  override: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({
        custom_permissions: customPermissions,
        permissions_override: override,
      })
      .eq('id', memberId)
      .eq('team_id', teamId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating member permissions:', error);
    return false;
  }
}

export async function createRoleTemplate(
  teamId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    base_role: MemberRole;
    permissions: string[];
  }
): Promise<RoleTemplate | null> {
  try {
    const { data: template, error } = await supabase
      .from('team_role_templates')
      .insert({
        team_id: teamId,
        name: data.name,
        description: data.description,
        base_role: data.base_role,
        permissions: data.permissions,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return template;
  } catch (error) {
    console.error('Error creating role template:', error);
    return null;
  }
}

export async function updateRoleTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
    is_active?: boolean;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_role_templates')
      .update(data)
      .eq('id', templateId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating role template:', error);
    return false;
  }
}

export async function deleteRoleTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_role_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting role template:', error);
    return false;
  }
}

export async function getRoleTemplates(teamId: string): Promise<RoleTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('team_role_templates')
      .select('*')
      .or(`team_id.eq.${teamId},team_id.is.null`)
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting role templates:', error);
    return [];
  }
}

export async function applyRoleTemplate(
  memberId: string,
  templateId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({ role_template_id: templateId })
      .eq('id', memberId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error applying role template:', error);
    return false;
  }
}

export async function getAuditLogs(
  teamId: string,
  options?: {
    limit?: number;
    memberId?: string;
    action?: AuditAction;
  }
): Promise<AuditLog[]> {
  try {
    let query = supabase
      .from('team_member_audit_log')
      .select(`
        *,
        performer:profiles!performed_by(full_name, email, avatar_url),
        user:profiles!user_id(full_name, email, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (options?.memberId) {
      query = query.eq('member_id', options.memberId);
    }

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
}

export async function getAuditSummary(
  teamId: string,
  days: number = 30
): Promise<Array<{ action: AuditAction; count: number; last_occurrence: string }>> {
  try {
    const { data, error } = await supabase.rpc('get_team_audit_summary', {
      p_team_id: teamId,
      p_days: days,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting audit summary:', error);
    return [];
  }
}

export function getCategoryLabel(category: PermissionCategory): string {
  switch (category) {
    case 'team_management':
      return 'Team Management';
    case 'member_management':
      return 'Member Management';
    case 'booking_management':
      return 'Booking Management';
    case 'financial_management':
      return 'Financial Management';
    case 'content_management':
      return 'Content Management';
    case 'analytics':
      return 'Analytics';
    case 'settings':
      return 'Settings';
  }
}

export function getCategoryIcon(category: PermissionCategory): string {
  switch (category) {
    case 'team_management':
      return 'users';
    case 'member_management':
      return 'user-plus';
    case 'booking_management':
      return 'calendar';
    case 'financial_management':
      return 'dollar-sign';
    case 'content_management':
      return 'file-text';
    case 'analytics':
      return 'bar-chart';
    case 'settings':
      return 'settings';
  }
}

export function getAuditActionLabel(action: AuditAction): string {
  switch (action) {
    case 'member_added':
      return 'Member Added';
    case 'member_removed':
      return 'Member Removed';
    case 'role_changed':
      return 'Role Changed';
    case 'permissions_updated':
      return 'Permissions Updated';
    case 'member_invited':
      return 'Member Invited';
    case 'invitation_cancelled':
      return 'Invitation Cancelled';
    case 'member_activated':
      return 'Member Activated';
    case 'member_deactivated':
      return 'Member Deactivated';
  }
}

export function getAuditActionColor(action: AuditAction): string {
  switch (action) {
    case 'member_added':
    case 'member_invited':
    case 'member_activated':
      return '#10B981'; // green
    case 'member_removed':
    case 'invitation_cancelled':
    case 'member_deactivated':
      return '#EF4444'; // red
    case 'role_changed':
    case 'permissions_updated':
      return '#F59E0B'; // orange
  }
}

export function groupPermissionsByCategory(
  permissions: Permission[]
): Record<PermissionCategory, Permission[]> {
  const grouped: Record<string, Permission[]> = {};

  permissions.forEach(permission => {
    if (!grouped[permission.category]) {
      grouped[permission.category] = [];
    }
    grouped[permission.category].push(permission);
  });

  return grouped as Record<PermissionCategory, Permission[]>;
}

export function getDefaultPermissions(role: MemberRole): string[] {
  switch (role) {
    case 'owner':
      return []; // Owner gets all permissions automatically
    case 'admin':
      return [
        'team.view',
        'team.edit',
        'members.view',
        'members.invite',
        'members.edit',
        'members.remove',
        'bookings.view',
        'bookings.create',
        'bookings.edit',
        'bookings.cancel',
        'bookings.approve',
        'finance.view',
        'finance.transactions',
        'finance.reports',
        'content.view',
        'content.create',
        'content.edit',
        'content.delete',
        'content.publish',
        'analytics.view',
        'analytics.export',
        'settings.view',
        'settings.edit',
      ];
    case 'member':
      return [
        'team.view',
        'members.view',
        'bookings.view',
        'bookings.create',
        'bookings.edit',
        'content.view',
        'content.create',
        'finance.view',
        'analytics.view',
      ];
    case 'viewer':
      return [
        'team.view',
        'members.view',
        'bookings.view',
        'content.view',
        'analytics.view',
      ];
  }
}
