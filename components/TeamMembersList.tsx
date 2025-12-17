import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  MoreVertical,
  Crown,
  Shield,
  User,
  Eye,
  Mail,
  Trash2,
  UserMinus,
} from 'lucide-react-native';
import {
  type TeamMember,
  type MemberRole,
  getRoleLabel,
  getRoleColor,
  updateMemberRole,
  removeMember,
  canManageMembers,
} from '@/lib/teams';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface TeamMembersListProps {
  members: TeamMember[];
  currentUserRole: MemberRole;
  currentUserId: string;
  teamId: string;
  onMemberUpdated: () => void;
}

export default function TeamMembersList({
  members,
  currentUserRole,
  currentUserId,
  teamId,
  onMemberUpdated,
}: TeamMembersListProps) {
  const [actionMenuMember, setActionMenuMember] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const canManage = canManageMembers(currentUserRole);

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color={getRoleColor(role)} />;
      case 'admin':
        return <Shield size={16} color={getRoleColor(role)} />;
      case 'member':
        return <User size={16} color={getRoleColor(role)} />;
      case 'viewer':
        return <Eye size={16} color={getRoleColor(role)} />;
    }
  };

  const handleChangeRole = async (memberId: string, newRole: MemberRole) => {
    setLoading(memberId);
    setActionMenuMember(null);

    try {
      const success = await updateMemberRole(teamId, memberId, newRole);
      if (success) {
        Alert.alert('Success', 'Member role updated');
        onMemberUpdated();
      } else {
        Alert.alert('Error', 'Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to update member role');
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(memberId);
            setActionMenuMember(null);

            try {
              const success = await removeMember(teamId, memberId);
              if (success) {
                Alert.alert('Success', 'Member removed from team');
                onMemberUpdated();
              } else {
                Alert.alert('Error', 'Failed to remove member');
              }
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  };

  const showActionMenu = (member: TeamMember) => {
    if (member.user_id === currentUserId) return;
    if (!canManage) return;
    if (member.role === 'owner') return;

    const options: any[] = [
      { text: 'Cancel', style: 'cancel' },
    ];

    // Role change options
    const roles: MemberRole[] = ['admin', 'member', 'viewer'];
    roles.forEach(role => {
      if (role !== member.role) {
        options.unshift({
          text: `Change to ${getRoleLabel(role)}`,
          onPress: () => handleChangeRole(member.id, role),
        });
      }
    });

    // Remove option
    options.push({
      text: 'Remove from Team',
      style: 'destructive',
      onPress: () => handleRemoveMember(member.id, member.user?.full_name || 'this member'),
    });

    Alert.alert('Member Actions', `Manage ${member.user?.full_name}`, options);
  };

  return (
    <View style={styles.container}>
      {members.map(member => {
        const isCurrentUser = member.user_id === currentUserId;
        const isOwner = member.role === 'owner';
        const showActions = canManage && !isCurrentUser && !isOwner;

        return (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberLeft}>
              {member.user?.avatar_url ? (
                <Image source={{ uri: member.user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={20} color={colors.textSecondary} />
                </View>
              )}

              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>
                    {member.user?.full_name || 'Unknown'}
                  </Text>
                  {isCurrentUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberEmail} numberOfLines={1}>
                  {member.user?.email}
                </Text>
                <Text style={styles.joinedDate}>
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.memberRight}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleColor(member.role) + '20' },
                ]}
              >
                {getRoleIcon(member.role)}
                <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                  {getRoleLabel(member.role)}
                </Text>
              </View>

              {showActions && (
                <>
                  {loading === member.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => showActionMenu(member)}
                    >
                      <MoreVertical size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  youBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  youBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  memberEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  joinedDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  actionButton: {
    padding: spacing.xs,
  },
});
