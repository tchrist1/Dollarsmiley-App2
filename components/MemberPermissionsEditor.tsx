import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Shield,
  Check,
  X,
  Info,
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  FileText,
  BarChart,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import Button from './Button';
import {
  getAllPermissions,
  getMemberPermissions,
  updateMemberPermissions,
  groupPermissionsByCategory,
  getCategoryLabel,
  type Permission,
  type PermissionCategory,
} from '@/lib/team-roles';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface MemberPermissionsEditorProps {
  teamId: string;
  memberId: string;
  userId: string;
  currentRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MemberPermissionsEditor({
  teamId,
  memberId,
  userId,
  currentRole,
  onClose,
  onSuccess,
}: MemberPermissionsEditorProps) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<string[]>([]);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const [allPerms, memberPerms] = await Promise.all([
        getAllPermissions(),
        getMemberPermissions(teamId, userId),
      ]);

      setAllPermissions(allPerms);
      setSelectedPermissions(memberPerms);
      setOriginalPermissions(memberPerms);
    } catch (error) {
      console.error('Error loading permissions:', error);
      Alert.alert('Error', 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (code: string) => {
    setSelectedPermissions(prev =>
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
    setOverrideEnabled(true);
  };

  const handleSelectAll = (category: PermissionCategory) => {
    const categoryPerms = allPermissions
      .filter(p => p.category === category && !p.requires_owner)
      .map(p => p.code);

    const allSelected = categoryPerms.every(code => selectedPermissions.includes(code));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !categoryPerms.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryPerms])]);
    }
    setOverrideEnabled(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateMemberPermissions(
        teamId,
        memberId,
        selectedPermissions,
        overrideEnabled
      );

      if (success) {
        Alert.alert('Success', 'Permissions updated successfully');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Error', 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      Alert.alert('Error', 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedPermissions(originalPermissions);
    setOverrideEnabled(false);
  };

  const getCategoryIcon = (category: PermissionCategory) => {
    const iconProps = { size: 20, color: colors.primary };
    switch (category) {
      case 'team_management':
        return <Users {...iconProps} />;
      case 'member_management':
        return <UserPlus {...iconProps} />;
      case 'booking_management':
        return <Calendar {...iconProps} />;
      case 'financial_management':
        return <DollarSign {...iconProps} />;
      case 'content_management':
        return <FileText {...iconProps} />;
      case 'analytics':
        return <BarChart {...iconProps} />;
      case 'settings':
        return <SettingsIcon {...iconProps} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading permissions...</Text>
      </View>
    );
  }

  const groupedPermissions = groupPermissionsByCategory(allPermissions);
  const hasChanges =
    JSON.stringify(selectedPermissions.sort()) !==
    JSON.stringify(originalPermissions.sort());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Shield size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Edit Permissions</Text>
            <Text style={styles.subtitle}>Current Role: {currentRole}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.overrideSection}>
        <View style={styles.overrideInfo}>
          <Info size={16} color={colors.warning} />
          <Text style={styles.overrideText}>
            Custom permissions override the default role permissions
          </Text>
        </View>
        <View style={styles.overrideToggle}>
          <Text style={styles.overrideLabel}>Enable Override</Text>
          <Switch
            value={overrideEnabled}
            onValueChange={setOverrideEnabled}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={overrideEnabled ? colors.primary : colors.surface}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedPermissions).map(([category, permissions]) => {
          const categoryPerms = permissions.filter(p => !p.requires_owner);
          const selectedCount = categoryPerms.filter(p =>
            selectedPermissions.includes(p.code)
          ).length;
          const allSelected = selectedCount === categoryPerms.length;

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryLeft}>
                  {getCategoryIcon(category as PermissionCategory)}
                  <Text style={styles.categoryTitle}>
                    {getCategoryLabel(category as PermissionCategory)}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {selectedCount}/{categoryPerms.length}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={() => handleSelectAll(category as PermissionCategory)}
                >
                  <Text style={styles.selectAllText}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.permissionsList}>
                {categoryPerms.map(permission => {
                  const isSelected = selectedPermissions.includes(permission.code);

                  return (
                    <TouchableOpacity
                      key={permission.id}
                      style={[
                        styles.permissionItem,
                        isSelected && styles.permissionItemActive,
                      ]}
                      onPress={() => handleTogglePermission(permission.code)}
                      disabled={!overrideEnabled}
                    >
                      <View style={styles.permissionLeft}>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxActive,
                            !overrideEnabled && styles.checkboxDisabled,
                          ]}
                        >
                          {isSelected && <Check size={16} color={colors.white} />}
                        </View>
                        <View style={styles.permissionInfo}>
                          <Text
                            style={[
                              styles.permissionName,
                              !overrideEnabled && styles.permissionNameDisabled,
                            ]}
                          >
                            {permission.name}
                          </Text>
                          {permission.description && (
                            <Text style={styles.permissionDescription}>
                              {permission.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {selectedPermissions.length} permissions selected
          </Text>
          {hasChanges && (
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="outline"
            style={styles.button}
          />
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !hasChanges}
            style={styles.button}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
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
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  overrideSection: {
    backgroundColor: colors.warning + '10',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overrideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  overrideText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  overrideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overrideLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  selectAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  permissionsList: {
    gap: spacing.xs,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  permissionItemActive: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '05',
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  permissionNameDisabled: {
    color: colors.textSecondary,
  },
  permissionDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  resetText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
