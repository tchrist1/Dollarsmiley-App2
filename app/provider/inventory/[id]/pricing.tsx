import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Plus,
  DollarSign,
  Clock,
  Trash2,
  Edit,
  X,
  ChevronDown,
  Info,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { getInventoryItemById, ProviderInventoryItem } from '@/lib/inventory-locking';
import {
  getRentalPricingTiers,
  createRentalPricingTier,
  updateRentalPricingTier,
  deleteRentalPricingTier,
  generateDefaultTiers,
  formatUnitType,
  formatDuration,
  RentalPricingTier,
  TierUnitType,
  CreateRentalTierInput,
} from '@/lib/rental-pricing';

export default function RentalPricingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<ProviderInventoryItem | null>(null);
  const [tiers, setTiers] = useState<RentalPricingTier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<RentalPricingTier | null>(null);

  const [tierDescription, setTierDescription] = useState('');
  const [minHours, setMinHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [unitType, setUnitType] = useState<TierUnitType>('day');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const [itemData, tiersData] = await Promise.all([
        getInventoryItemById(id),
        getRentalPricingTiers(id),
      ]);

      setItem(itemData);
      setTiers(tiersData);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setTierDescription('');
    setMinHours('');
    setMaxHours('');
    setPricePerUnit('');
    setUnitType('day');
    setEditingTier(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (tier: RentalPricingTier) => {
    setEditingTier(tier);
    setTierDescription(tier.description || '');
    setMinHours(tier.min_duration_hours.toString());
    setMaxHours(tier.max_duration_hours?.toString() || '');
    setPricePerUnit(tier.price_per_unit.toString());
    setUnitType(tier.unit_type);
    setShowModal(true);
  };

  const handleSaveTier = async () => {
    if (!id) return;

    const min = parseInt(minHours) || 0;
    const max = maxHours ? parseInt(maxHours) : undefined;
    const price = parseFloat(pricePerUnit) || 0;

    if (price <= 0) {
      Alert.alert('Error', 'Price must be greater than 0');
      return;
    }

    if (max !== undefined && max <= min) {
      Alert.alert('Error', 'Maximum duration must be greater than minimum');
      return;
    }

    setSaving(true);

    try {
      if (editingTier) {
        const updated = await updateRentalPricingTier(editingTier.id, {
          description: tierDescription || undefined,
          min_duration_hours: min,
          max_duration_hours: max ?? null,
          price_per_unit: price,
          unit_type: unitType,
        });

        if (updated) {
          setTiers((prev) =>
            prev.map((t) => (t.id === editingTier.id ? updated : t))
          );
        }
      } else {
        const created = await createRentalPricingTier(id, {
          description: tierDescription || undefined,
          min_duration_hours: min,
          max_duration_hours: max,
          price_per_unit: price,
          unit_type: unitType,
        });

        if (created) {
          setTiers((prev) => [...prev, created].sort((a, b) => a.tier_order - b.tier_order));
        }
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tier:', error);
      Alert.alert('Error', 'Failed to save pricing tier');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    const doDelete = async () => {
      const success = await deleteRentalPricingTier(tierId);
      if (success) {
        setTiers((prev) => prev.filter((t) => t.id !== tierId));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this pricing tier?')) {
        await doDelete();
      }
    } else {
      Alert.alert('Delete Tier', 'Are you sure you want to delete this pricing tier?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleGenerateDefaults = async () => {
    if (!id || !item?.default_rental_price) {
      Alert.alert(
        'Default Price Required',
        'Please set a default rental price on the item first.'
      );
      return;
    }

    const doGenerate = async () => {
      setSaving(true);
      try {
        const defaultTiers = generateDefaultTiers(item.default_rental_price!);
        const createdTiers: RentalPricingTier[] = [];

        for (const tierInput of defaultTiers) {
          const created = await createRentalPricingTier(id, tierInput);
          if (created) {
            createdTiers.push(created);
          }
        }

        setTiers((prev) => [...prev, ...createdTiers].sort((a, b) => a.tier_order - b.tier_order));
      } catch (error) {
        console.error('Error generating default tiers:', error);
        Alert.alert('Error', 'Failed to generate pricing tiers');
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Generate default pricing tiers based on your daily rate?')) {
        await doGenerate();
      }
    } else {
      Alert.alert(
        'Generate Default Tiers',
        'This will create standard pricing tiers based on your daily rate. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate', onPress: doGenerate },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unitOptions: { value: TierUnitType; label: string }[] = [
    { value: 'flat', label: 'Flat Fee' },
    { value: 'hour', label: 'Per Hour' },
    { value: 'day', label: 'Per Day' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rental Pricing',
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={openAddModal}>
              <Plus size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item?.name}</Text>
          {item?.default_rental_price && (
            <Text style={styles.defaultPrice}>
              Default: ${item.default_rental_price.toFixed(2)}/day
            </Text>
          )}
        </View>

        {tiers.length === 0 ? (
          <View style={styles.emptyState}>
            <DollarSign size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Pricing Tiers</Text>
            <Text style={styles.emptyText}>
              Add pricing tiers to offer different rates based on rental duration
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                <Plus size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Tier</Text>
              </TouchableOpacity>
              {item?.default_rental_price && (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerateDefaults}
                >
                  <Text style={styles.generateButtonText}>Generate Defaults</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.infoBox}>
              <Info size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                Pricing tiers allow you to offer discounts for longer rentals or charge premium rates for short-term use.
              </Text>
            </View>

            {tiers.map((tier, index) => (
              <View key={tier.id} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <View style={styles.tierOrder}>
                    <Text style={styles.tierOrderText}>{index + 1}</Text>
                  </View>
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>
                      {tier.description || `Tier ${tier.tier_order}`}
                    </Text>
                    <Text style={styles.tierDuration}>
                      {formatDuration(tier.min_duration_hours)}
                      {tier.max_duration_hours
                        ? ` - ${formatDuration(tier.max_duration_hours)}`
                        : '+'}
                    </Text>
                  </View>
                  <View style={styles.tierPricing}>
                    <Text style={styles.tierPrice}>
                      ${tier.price_per_unit.toFixed(2)}
                    </Text>
                    <Text style={styles.tierUnit}>{formatUnitType(tier.unit_type)}</Text>
                  </View>
                </View>
                <View style={styles.tierActions}>
                  <TouchableOpacity
                    style={styles.tierAction}
                    onPress={() => openEditModal(tier)}
                  >
                    <Edit size={16} color={colors.primary} />
                    <Text style={styles.tierActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tierAction}
                    onPress={() => handleDeleteTier(tier.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.tierActionText, { color: '#EF4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addTierButton} onPress={openAddModal}>
              <Plus size={18} color={colors.primary} />
              <Text style={styles.addTierButtonText}>Add Another Tier</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTier ? 'Edit Tier' : 'Add Pricing Tier'}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={tierDescription}
                  onChangeText={setTierDescription}
                  placeholder="e.g., Weekly Rate, Half Day"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Min Duration (hours)</Text>
                  <TextInput
                    style={styles.input}
                    value={minHours}
                    onChangeText={setMinHours}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Max Duration (hours)</Text>
                  <TextInput
                    style={styles.input}
                    value={maxHours}
                    onChangeText={setMaxHours}
                    placeholder="Unlimited"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Price</Text>
                  <View style={styles.priceInput}>
                    <DollarSign size={16} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={pricePerUnit}
                      onChangeText={setPricePerUnit}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowUnitPicker(!showUnitPicker)}
                  >
                    <Text style={styles.selectButtonText}>
                      {formatUnitType(unitType)}
                    </Text>
                    <ChevronDown size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showUnitPicker && (
                    <View style={styles.picker}>
                      {unitOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.pickerOption,
                            unitType === option.value && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setUnitType(option.value);
                            setShowUnitPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              unitType === option.value && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveTier}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingTier ? 'Save Changes' : 'Add Tier'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  itemHeader: {
    marginBottom: 20,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  defaultPrice: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActions: {
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  generateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  generateButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  tierCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierOrder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierOrderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tierDuration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tierPricing: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  tierUnit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tierActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
  },
  tierAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierActionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  addTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addTierButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingLeft: 14,
    gap: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  picker: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    marginTop: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  pickerOptionText: {
    fontSize: 15,
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
