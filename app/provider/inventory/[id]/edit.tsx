import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Package, DollarSign, Hash, AlertTriangle, Info } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import {
  getInventoryItemById,
  updateInventoryItem,
  ProviderInventoryItem,
} from '@/lib/inventory-locking';

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ProviderInventoryItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('1');
  const [bufferQuantity, setBufferQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('2');
  const [isRentable, setIsRentable] = useState(false);
  const [turnaroundHours, setTurnaroundHours] = useState('2');
  const [defaultRentalPrice, setDefaultRentalPrice] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      if (!id) return;

      try {
        const itemData = await getInventoryItemById(id);
        if (itemData) {
          setItem(itemData);
          setName(itemData.name);
          setDescription(itemData.description || '');
          setSku(itemData.sku || '');
          setTotalQuantity(itemData.total_quantity.toString());
          setBufferQuantity(itemData.buffer_quantity.toString());
          setLowStockThreshold(itemData.low_stock_threshold.toString());
          setIsRentable(itemData.is_rentable);
          setTurnaroundHours((itemData.turnaround_hours || 2).toString());
          setDefaultRentalPrice(
            itemData.default_rental_price?.toString() || ''
          );
          setIsActive(itemData.is_active);
        }
      } catch (err) {
        console.error('Error loading inventory item:', err);
        setError('Failed to load item');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id]);

  const handleSubmit = async () => {
    if (!id || !item) return;

    if (!name.trim()) {
      setError('Item name is required');
      return;
    }

    const total = parseInt(totalQuantity) || 1;
    const buffer = parseInt(bufferQuantity) || 0;

    if (buffer >= total) {
      setError('Buffer quantity must be less than total quantity');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateInventoryItem(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        sku: sku.trim() || undefined,
        total_quantity: total,
        buffer_quantity: buffer,
        low_stock_threshold: parseInt(lowStockThreshold) || 2,
        is_rentable: isRentable,
        turnaround_hours: isRentable ? parseInt(turnaroundHours) || 2 : undefined,
        default_rental_price: isRentable && defaultRentalPrice
          ? parseFloat(defaultRentalPrice)
          : undefined,
        is_active: isActive,
      });

      if (updated) {
        router.back();
      } else {
        setError('Failed to update inventory item');
      }
    } catch (err) {
      console.error('Error updating inventory item:', err);
      setError('An error occurred while updating the item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Package size={48} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>Item Not Found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Item' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {error && (
            <View style={styles.errorBanner}>
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <View style={styles.inputContainer}>
                <Package size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Canon EOS R5 Camera"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe this inventory item..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SKU / Item Code</Text>
              <View style={styles.inputContainer}>
                <Hash size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={sku}
                  onChangeText={setSku}
                  placeholder="e.g., CAM-001"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Active</Text>
                <Text style={styles.switchDescription}>
                  Inactive items won't be available for booking
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={isActive ? colors.primary : '#f4f4f4'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity Settings</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Total Quantity *</Text>
                <TextInput
                  style={styles.input}
                  value={totalQuantity}
                  onChangeText={setTotalQuantity}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Buffer Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={bufferQuantity}
                  onChangeText={setBufferQuantity}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Info size={16} color={colors.primary} />
              <Text style={styles.infoText}>
                Buffer quantity is held in reserve and won't be available for booking.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Low Stock Alert Threshold</Text>
              <TextInput
                style={styles.input}
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                placeholder="2"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Settings</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Enable Rentals</Text>
                <Text style={styles.switchDescription}>
                  Allow customers to rent this item for a specific period
                </Text>
              </View>
              <Switch
                value={isRentable}
                onValueChange={setIsRentable}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={isRentable ? colors.primary : '#f4f4f4'}
              />
            </View>

            {isRentable && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Turnaround Time (Hours)</Text>
                  <TextInput
                    style={styles.input}
                    value={turnaroundHours}
                    onChangeText={setTurnaroundHours}
                    placeholder="2"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.helperText}>
                    Buffer time between rentals for prep/cleaning
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Default Daily Rental Price</Text>
                  <View style={styles.inputContainer}>
                    <DollarSign size={18} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={defaultRentalPrice}
                      onChangeText={setDefaultRentalPrice}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
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
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
