import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Mail, UserPlus } from 'lucide-react-native';
import Input from './Input';
import TextArea from './TextArea';
import Button from './Button';
import { inviteTeamMember, type MemberRole, getRoleLabel } from '@/lib/teams';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface TeamInviteModalProps {
  visible: boolean;
  teamId: string;
  inviterId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TeamInviteModal({
  visible,
  teamId,
  inviterId,
  onClose,
  onSuccess,
}: TeamInviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const roles: MemberRole[] = ['admin', 'member', 'viewer'];

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await inviteTeamMember(teamId, inviterId, {
        email: email.trim().toLowerCase(),
        role,
        message: message.trim() || undefined,
      });

      Alert.alert('Success', 'Invitation sent successfully!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <UserPlus size={24} color={colors.primary} />
              </View>
              <Text style={styles.title}>Invite Team Member</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.label}>Email Address *</Text>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="colleague@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleGrid}>
                {roles.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, role === r && styles.roleOptionActive]}
                    onPress={() => setRole(r)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        role === r && styles.radioOuterActive,
                      ]}
                    >
                      {role === r && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.roleInfo}>
                      <Text
                        style={[
                          styles.roleLabel,
                          role === r && styles.roleLabelActive,
                        ]}
                      >
                        {getRoleLabel(r)}
                      </Text>
                      <Text style={styles.roleDescription}>
                        {r === 'admin' && <Text>Can manage team and members</Text>}
                        {r === 'member' && <Text>Can access team resources</Text>}
                        {r === 'viewer' && <Text>Read-only access</Text>}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Personal Message (Optional)</Text>
              <TextArea
                value={message}
                onChangeText={setMessage}
                placeholder="Add a personal note to the invitation..."
                numberOfLines={3}
                maxLength={500}
              />
              <Text style={styles.charCount}>{message.length}/500</Text>
            </View>

            <View style={styles.infoCard}>
              <Mail size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                An invitation email will be sent to this address. They'll need to accept the
                invitation to join your team.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              style={styles.button}
            />
            <Button
              title="Send Invitation"
              onPress={handleInvite}
              loading={loading}
              disabled={loading || !email.trim()}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  roleGrid: {
    gap: spacing.sm,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  roleLabelActive: {
    color: colors.primary,
  },
  roleDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
  },
});
