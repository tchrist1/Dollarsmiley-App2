import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Users, Building, Building2 } from 'lucide-react-native';
import Input from './Input';
import TextArea from './TextArea';
import Button from './Button';
import { createTeam, type AccountType } from '@/lib/teams';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface CreateTeamModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: (teamId: string) => void;
}

export default function CreateTeamModal({
  visible,
  userId,
  onClose,
  onSuccess,
}: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    setLoading(true);
    try {
      const team = await createTeam(userId, {
        name: name.trim(),
        description: description.trim() || undefined,
        account_type: accountType,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
      });

      if (team) {
        Alert.alert('Success', 'Team created successfully!');
        onSuccess(team.id);
        handleClose();
      } else {
        Alert.alert('Error', 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setAccountType('personal');
    setEmail('');
    setPhone('');
    setWebsite('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Team</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Team Name *</Text>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Enter team name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextArea
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your team..."
                numberOfLines={3}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.typeGrid}>
                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    accountType === 'personal' && styles.typeCardActive,
                  ]}
                  onPress={() => setAccountType('personal')}
                >
                  <Users
                    size={24}
                    color={accountType === 'personal' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      accountType === 'personal' && styles.typeLabelActive,
                    ]}
                  >
                    Personal
                  </Text>
                  <Text style={styles.typeDescription}>For individual use</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    accountType === 'business' && styles.typeCardActive,
                  ]}
                  onPress={() => setAccountType('business')}
                >
                  <Building
                    size={24}
                    color={accountType === 'business' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      accountType === 'business' && styles.typeLabelActive,
                    ]}
                  >
                    Business
                  </Text>
                  <Text style={styles.typeDescription}>For small teams</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeCard,
                    accountType === 'enterprise' && styles.typeCardActive,
                  ]}
                  onPress={() => setAccountType('enterprise')}
                >
                  <Building2
                    size={24}
                    color={accountType === 'enterprise' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      accountType === 'enterprise' && styles.typeLabelActive,
                    ]}
                  >
                    Enterprise
                  </Text>
                  <Text style={styles.typeDescription}>For large orgs</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Contact Information</Text>
              <View style={styles.contactGrid}>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="team@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
                <Input
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://example.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              style={styles.button}
            />
            <Button
              title="Create Team"
              onPress={handleCreate}
              loading={loading}
              disabled={loading || !name.trim()}
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
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
  typeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  typeDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  contactGrid: {
    gap: spacing.sm,
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
