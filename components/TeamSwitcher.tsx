import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronDown,
  Check,
  Users,
  Plus,
  Building,
  Building2,
} from 'lucide-react-native';
import { getUserTeams, type Team, type AccountType } from '@/lib/teams';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface TeamSwitcherProps {
  userId: string;
  currentTeamId: string | null;
  onTeamSelect: (team: Team) => void;
  onCreateTeam: () => void;
}

export default function TeamSwitcher({
  userId,
  currentTeamId,
  onTeamSelect,
  onCreateTeam,
}: TeamSwitcherProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const currentTeam = teams.find(t => t.id === currentTeamId);

  useEffect(() => {
    loadTeams();
  }, [userId]);

  const loadTeams = async () => {
    try {
      const data = await getUserTeams(userId);
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = (team: Team) => {
    setShowModal(false);
    onTeamSelect(team);
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'personal':
        return <Users size={16} color={colors.textSecondary} />;
      case 'business':
        return <Building size={16} color={colors.textSecondary} />;
      case 'enterprise':
        return <Building2 size={16} color={colors.textSecondary} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerLeft}>
          {currentTeam?.avatar_url ? (
            <Image source={{ uri: currentTeam.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              {getAccountTypeIcon(currentTeam?.account_type || 'personal')}
            </View>
          )}
          <View style={styles.triggerInfo}>
            <Text style={styles.triggerName} numberOfLines={1}>
              {currentTeam?.name || 'Select Team'}
            </Text>
            <Text style={styles.triggerMeta}>
              {currentTeam ? `${currentTeam.member_count} members` : 'No team selected'}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Team</Text>
              <Text style={styles.modalSubtitle}>{teams.length} teams</Text>
            </View>

            <ScrollView style={styles.teamsList} showsVerticalScrollIndicator={false}>
              {teams.map(team => {
                const isActive = team.id === currentTeamId;

                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[styles.teamCard, isActive && styles.teamCardActive]}
                    onPress={() => handleSelectTeam(team)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.teamLeft}>
                      {team.avatar_url ? (
                        <Image source={{ uri: team.avatar_url }} style={styles.teamAvatar} />
                      ) : (
                        <View style={[styles.teamAvatar, styles.avatarPlaceholder]}>
                          {getAccountTypeIcon(team.account_type)}
                        </View>
                      )}
                      <View style={styles.teamInfo}>
                        <Text style={styles.teamName}>{team.name}</Text>
                        <View style={styles.teamMeta}>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>
                              {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                            </Text>
                          </View>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>
                              {team.account_type.charAt(0).toUpperCase() +
                                team.account_type.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {isActive && (
                      <View style={styles.checkmark}>
                        <Check size={20} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  setShowModal(false);
                  onCreateTeam();
                }}
              >
                <Plus size={20} color={colors.primary} />
                <Text style={styles.createButtonText}>Create New Team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerInfo: {
    flex: 1,
  },
  triggerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  triggerMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  teamsList: {
    padding: spacing.lg,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  teamCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  teamMeta: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metaBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
});
