import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Settings,
  UserPlus,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import TeamMembersList from '@/components/TeamMembersList';
import TeamInviteModal from '@/components/TeamInviteModal';
import {
  getTeam,
  getTeamMembers,
  getTeamInvitations,
  leaveTeam,
  canManageMembers,
  canEditTeam,
  type Team,
  type TeamMember,
  type TeamInvitation,
} from '@/lib/teams';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function TeamDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [id]);

  const loadTeamData = async () => {
    if (!user) return;

    try {
      const [teamData, membersData, invitationsData] = await Promise.all([
        getTeam(id),
        getTeamMembers(id),
        getTeamInvitations(id),
      ]);

      setTeam(teamData);
      setMembers(membersData);
      setInvitations(invitationsData);

      const current = membersData.find(m => m.user_id === user.id);
      setCurrentMember(current || null);
    } catch (error) {
      console.error('Error loading team data:', error);
      Alert.alert('Error', 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeamData();
  };

  const handleLeaveTeam = () => {
    if (!user || !currentMember) return;

    if (currentMember.role === 'owner') {
      Alert.alert(
        'Cannot Leave',
        'Team owners cannot leave. Please transfer ownership or delete the team.'
      );
      return;
    }

    Alert.alert(
      'Leave Team',
      `Are you sure you want to leave ${team?.name}? You'll need to be invited again to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await leaveTeam(id, user.id);
              if (success) {
                Alert.alert('Success', 'You have left the team', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              } else {
                Alert.alert('Error', 'Failed to leave team');
              }
            } catch (error) {
              console.error('Error leaving team:', error);
              Alert.alert('Error', 'Failed to leave team');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading team...</Text>
      </View>
    );
  }

  if (!team || !currentMember) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Team not found or you don't have access</Text>
      </View>
    );
  }

  const canManage = canManageMembers(currentMember.role);
  const canEdit = canEditTeam(currentMember.role);
  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  return (
    <>
      <Stack.Screen
        options={{
          title: team.name,
          headerShown: true,
          headerRight: () =>
            canEdit ? (
              <TouchableOpacity
                onPress={() => router.push(`/teams/${id}/settings`)}
                style={styles.headerButton}
              >
                <Settings size={24} color={colors.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Team Info Card */}
        <View style={styles.teamCard}>
          <View style={styles.teamHeader}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{team.name}</Text>
              {team.description && (
                <Text style={styles.teamDescription}>{team.description}</Text>
              )}
            </View>
            <View style={styles.accountTypeBadge}>
              <Text style={styles.accountTypeText}>
                {team.account_type.charAt(0).toUpperCase() + team.account_type.slice(1)}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.statValue}>{team.member_count}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>

            <View style={styles.statCard}>
              <Clock size={20} color={colors.success} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>

            <View style={styles.statCard}>
              <Calendar size={20} color={colors.warning} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>

            <View style={styles.statCard}>
              <DollarSign size={20} color={colors.primary} />
              <Text style={styles.statValue}>$0</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </View>

        {/* Pending Invitations Alert */}
        {canManage && pendingInvitations.length > 0 && (
          <View style={styles.invitationsAlert}>
            <UserPlus size={20} color={colors.warning} />
            <Text style={styles.invitationsText}>
              {pendingInvitations.length} pending invitation
              {pendingInvitations.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {canManage && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowInviteModal(true)}
              >
                <UserPlus size={24} color={colors.primary} />
                <Text style={styles.actionButtonText}>Invite Member</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/teams/${id}/calendar`)}
            >
              <Calendar size={24} color={colors.success} />
              <Text style={styles.actionButtonText}>Team Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/teams/${id}/analytics`)}
            >
              <BarChart3 size={24} color={colors.warning} />
              <Text style={styles.actionButtonText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Members */}
        <View style={styles.membersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <Text style={styles.sectionCount}>{members.length}</Text>
          </View>

          <TeamMembersList
            members={members}
            currentUserRole={currentMember.role}
            currentUserId={user.id}
            teamId={id}
            onMemberUpdated={loadTeamData}
          />
        </View>

        {/* Leave Team */}
        {currentMember.role !== 'owner' && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Leave Team</Text>
            <Text style={styles.dangerText}>
              You will lose access to this team and its resources.
            </Text>
            <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveTeam}>
              <Text style={styles.dangerButtonText}>Leave {team.name}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {canManage && (
        <TeamInviteModal
          visible={showInviteModal}
          teamId={id}
          inviterId={user.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadTeamData}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
  },
  headerButton: {
    padding: spacing.sm,
  },
  teamCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  teamDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  accountTypeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  accountTypeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  invitationsAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  invitationsText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  actionsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  membersSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  dangerZone: {
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  dangerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  dangerText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
