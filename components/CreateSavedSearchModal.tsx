import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import {
  X,
  Save,
  Bell,
  Search,
  MapPin,
  Star,
  DollarSign,
  Tag,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  createSavedSearch,
  generateSearchName,
  getFrequencyLabel,
  getFrequencyDescription,
  estimateMatchPotential,
  type SearchType,
  type SearchCriteria,
  type NotificationFrequency,
} from '@/lib/saved-searches';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface CreateSavedSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (searchId: string) => void;
  initialSearchType?: SearchType;
  initialCriteria?: SearchCriteria;
}

export default function CreateSavedSearchModal({
  visible,
  onClose,
  onSuccess,
  initialSearchType = 'providers',
  initialCriteria = {},
}: CreateSavedSearchModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Form state
  const [searchName, setSearchName] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(initialSearchType);
  const [criteria, setCriteria] = useState<SearchCriteria>(initialCriteria);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationFrequency, setNotificationFrequency] =
    useState<NotificationFrequency>('daily');

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate
    if (!searchName.trim()) {
      Alert.alert('Error', 'Please enter a name for your saved search');
      return;
    }

    setSaving(true);
    try {
      const result = await createSavedSearch(
        user.id,
        searchName.trim(),
        searchType,
        criteria,
        notificationEnabled,
        notificationFrequency
      );

      if (result.success && result.search) {
        Alert.alert('Success', 'Your search has been saved');
        onSuccess?.(result.search.id);
        handleClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to save search');
      }
    } catch (error) {
      console.error('Error saving search:', error);
      Alert.alert('Error', 'Failed to save search');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSearchName('');
    setCriteria(initialCriteria);
    setNotificationEnabled(true);
    setNotificationFrequency('daily');
    onClose();
  };

  const updateCriteria = (key: string, value: any) => {
    setCriteria({ ...criteria, [key]: value });
  };

  const handleAutoName = () => {
    const name = generateSearchName(searchType, criteria);
    setSearchName(name);
  };

  const matchPotential = estimateMatchPotential(criteria);
  const potentialColor =
    matchPotential === 'high'
      ? colors.success
      : matchPotential === 'medium'
      ? colors.warning
      : colors.error;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Save Search</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Plumbers in Boston"
              value={searchName}
              onChangeText={setSearchName}
            />
            <TouchableOpacity style={styles.autoNameButton} onPress={handleAutoName}>
              <Text style={styles.autoNameText}>Auto-generate name</Text>
            </TouchableOpacity>
          </View>

          {/* Search Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Type</Text>
            <View style={styles.typeButtons}>
              {(['providers', 'jobs', 'services'] as SearchType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    searchType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setSearchType(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      searchType === type && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search Criteria */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Criteria</Text>

            {/* Category */}
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Tag size={20} color={colors.textSecondary} />
              </View>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Category (e.g., Plumber)"
                value={criteria.category || ''}
                onChangeText={(text) => updateCriteria('category', text)}
              />
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MapPin size={20} color={colors.textSecondary} />
              </View>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Location (e.g., Boston)"
                value={criteria.location || ''}
                onChangeText={(text) => updateCriteria('location', text)}
              />
            </View>

            {/* Min Rating */}
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Star size={20} color={colors.textSecondary} />
              </View>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Minimum rating (e.g., 4.0)"
                value={criteria.min_rating?.toString() || ''}
                onChangeText={(text) =>
                  updateCriteria('min_rating', parseFloat(text) || undefined)
                }
                keyboardType="decimal-pad"
              />
            </View>

            {/* Max Rate */}
            {searchType === 'providers' && (
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <DollarSign size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Max hourly rate (e.g., 100)"
                  value={criteria.max_rate?.toString() || ''}
                  onChangeText={(text) =>
                    updateCriteria('max_rate', parseInt(text) || undefined)
                  }
                  keyboardType="number-pad"
                />
              </View>
            )}

            {/* Budget Range */}
            {searchType === 'jobs' && (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <DollarSign size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Min budget (e.g., 50)"
                    value={criteria.min_budget?.toString() || ''}
                    onChangeText={(text) =>
                      updateCriteria('min_budget', parseInt(text) || undefined)
                    }
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.inputIcon}>
                    <DollarSign size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Max budget (e.g., 500)"
                    value={criteria.max_budget?.toString() || ''}
                    onChangeText={(text) =>
                      updateCriteria('max_budget', parseInt(text) || undefined)
                    }
                    keyboardType="number-pad"
                  />
                </View>
              </>
            )}
          </View>

          {/* Match Potential */}
          <View style={[styles.potentialCard, { borderLeftColor: potentialColor }]}>
            <AlertCircle size={20} color={potentialColor} />
            <View style={styles.potentialInfo}>
              <Text style={styles.potentialTitle}>Match Potential</Text>
              <Text style={[styles.potentialValue, { color: potentialColor }]}>
                {matchPotential.toUpperCase()}
              </Text>
              <Text style={styles.potentialDescription}>
                {matchPotential === 'high' &&
                  'Broad criteria will match many results'}
                {matchPotential === 'medium' &&
                  'Balanced criteria with moderate matches'}
                {matchPotential === 'low' &&
                  'Specific criteria may have fewer matches'}
              </Text>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>

            {/* Enable Notifications */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Enable Notifications</Text>
                <Text style={styles.switchDescription}>
                  Get notified when new matches are found
                </Text>
              </View>
              <Switch
                value={notificationEnabled}
                onValueChange={setNotificationEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {/* Frequency */}
            {notificationEnabled && (
              <View style={styles.frequencySection}>
                <Text style={styles.frequencyTitle}>Frequency</Text>
                {(['instant', 'daily', 'weekly', 'never'] as NotificationFrequency[]).map(
                  (freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyOption,
                        notificationFrequency === freq &&
                          styles.frequencyOptionActive,
                      ]}
                      onPress={() => setNotificationFrequency(freq)}
                    >
                      <View style={styles.frequencyRadio}>
                        {notificationFrequency === freq && (
                          <View style={styles.frequencyRadioInner} />
                        )}
                      </View>
                      <View style={styles.frequencyInfo}>
                        <Text style={styles.frequencyLabel}>
                          {getFrequencyLabel(freq)}
                        </Text>
                        <Text style={styles.frequencyDescription}>
                          {getFrequencyDescription(freq)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Save size={20} color={colors.white} />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Search'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  autoNameButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
  },
  autoNameText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primary,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  inputIcon: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  potentialCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.xl,
  },
  potentialInfo: {
    flex: 1,
  },
  potentialTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  potentialValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginVertical: spacing.xs,
  },
  potentialDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  switchDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  frequencySection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  frequencyTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  frequencyOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  frequencyRadio: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  frequencyRadioInner: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  frequencyInfo: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  frequencyDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
