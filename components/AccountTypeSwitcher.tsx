import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { User, Briefcase, Users, ChevronRight, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

type AccountType = 'Customer' | 'Provider' | 'Hybrid' | 'Both';

interface AccountTypeSwitcherProps {
  currentType: AccountType;
  onSwitch: (type: AccountType) => void;
  loading?: boolean;
}

const accountTypeConfig: Record<AccountType, { icon: any; label: string; description: string }> = {
  Customer: {
    icon: User,
    label: 'Customer',
    description: 'Book services from providers',
  },
  Provider: {
    icon: Briefcase,
    label: 'Provider',
    description: 'Offer your services',
  },
  Hybrid: {
    icon: Users,
    label: 'Hybrid',
    description: 'Book and provide services',
  },
  Both: {
    icon: Users,
    label: 'Hybrid',
    description: 'Book and provide services',
  },
};

export default function AccountTypeSwitcher({
  currentType,
  onSwitch,
  loading,
}: AccountTypeSwitcherProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const currentConfig = accountTypeConfig[currentType];
  const CurrentIcon = currentConfig?.icon;

  // For Hybrid/Both users: show Customer and Provider in main view
  // For Customer/Provider: show only current type in main view
  const shouldShowThreeOptions = currentType === 'Hybrid' || currentType === 'Both';

  const getAvailableOptions = (): AccountType[] => {
    // Don't allow switching if account is Admin type (should never happen as switcher is hidden)
    if (currentType === 'Admin' as AccountType) {
      return [];
    }

    if (currentType === 'Hybrid' || currentType === 'Both') {
      // Hybrid/Both can switch to Customer or Provider
      return ['Customer', 'Provider'];
    } else if (currentType === 'Customer') {
      // Customer can switch to Provider or Hybrid
      return ['Provider', 'Hybrid'];
    } else {
      // Provider can switch to Customer or Hybrid
      return ['Customer', 'Hybrid'];
    }
  };

  const handleSwitch = (type: AccountType) => {
    setModalVisible(false);
    if (type !== currentType) {
      onSwitch(type);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {shouldShowThreeOptions ? (
          // Hybrid user: Show Customer, Provider, and Change Account
          <View style={styles.threeButtonContainer}>
            <TouchableOpacity
              style={[styles.typeButton, styles.typeButtonSmall]}
              onPress={() => handleSwitch('Customer')}
              disabled={loading}
            >
              <User size={18} color={colors.primary} />
              <Text style={styles.typeButtonText} numberOfLines={1}>Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, styles.typeButtonSmall]}
              onPress={() => handleSwitch('Provider')}
              disabled={loading}
            >
              <Briefcase size={18} color={colors.primary} />
              <Text style={styles.typeButtonText} numberOfLines={1}>Provider</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, styles.typeButtonSmall, styles.changeButton]}
              onPress={() => setModalVisible(true)}
              disabled={loading}
            >
              <Users size={18} color={colors.textSecondary} />
              <Text style={[styles.typeButtonText, styles.changeButtonText]} numberOfLines={1}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Customer or Provider: Show current type and Change Account
          <View style={styles.twoButtonContainer}>
            <TouchableOpacity
              style={[styles.currentTypeCard, styles.activeCard]}
              disabled
            >
              {CurrentIcon && (
                <View style={styles.iconContainer}>
                  <CurrentIcon size={24} color={colors.primary} />
                </View>
              )}
              <View style={styles.typeInfo}>
                <Text style={styles.currentTypeLabel}>{currentConfig?.label || currentType}</Text>
                <Text style={styles.currentTypeDescription}>{currentConfig?.description || ''}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeAccountButton}
              onPress={() => setModalVisible(true)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.changeAccountText}>Change Account</Text>
              <ChevronRight size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.hint}>
          {loading
            ? 'Updating account type...'
            : shouldShowThreeOptions
            ? 'Currently in Hybrid mode with access to all features.'
            : 'Tap Change Account to switch between customer and provider modes.'}
        </Text>
      </View>

      {/* Account Type Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Account Type</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {getAvailableOptions().map((type) => {
                const config = accountTypeConfig[type];
                const Icon = config.icon;
                return (
                  <TouchableOpacity
                    key={type}
                    style={styles.optionCard}
                    onPress={() => handleSwitch(type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionIconContainer}>
                      <Icon size={28} color={colors.primary} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionLabel}>{config.label}</Text>
                      <Text style={styles.optionDescription}>{config.description}</Text>
                    </View>
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {(currentType === 'Hybrid' || currentType === 'Both') && (
              <View style={styles.modalFooter}>
                <Text style={styles.footerText}>
                  Currently in Hybrid mode. Switch to Customer or Provider for a focused experience.
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
  },
  threeButtonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  typeButtonSmall: {
    minHeight: 76,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  changeButton: {
    backgroundColor: colors.surface,
  },
  changeButtonText: {
    color: colors.textSecondary,
  },
  twoButtonContainer: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  currentTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  currentTypeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  changeAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
  },
  changeAccountText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  optionsList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
