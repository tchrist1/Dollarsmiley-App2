import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  DollarSign,
  Mail,
  Bell,
  FileText,
  Save,
  ChevronRight,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPaymentSettings,
  updatePaymentSettings,
  getSupportedCurrencies,
  getPayoutMethods,
  getPayoutSchedules,
  getMinPayoutAmountOptions,
  validatePaymentSettings,
  type PaymentSettings,
} from '@/lib/payment-settings';

export default function PaymentSettingsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    setLoading(true);
    const data = await getPaymentSettings(user.id);
    if (data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !settings) return;

    const validation = await validatePaymentSettings(settings);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    setSaving(true);
    const success = await updatePaymentSettings(user.id, settings);

    if (success) {
      setHasChanges(false);
      Alert.alert('Success', 'Payment settings updated successfully');
    } else {
      Alert.alert('Error', 'Failed to update payment settings');
    }
    setSaving(false);
  };

  const updateSetting = (updates: Partial<PaymentSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
    setHasChanges(true);
  };

  const updateNotification = (key: keyof PaymentSettings['notifications'], value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payment Settings',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payment Settings',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyState}>
          <DollarSign size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No Wallet Found</Text>
          <Text style={styles.emptyStateText}>
            Your wallet needs to be created first.
          </Text>
        </View>
      </View>
    );
  }

  const currencies = getSupportedCurrencies();
  const payoutMethods = getPayoutMethods();
  const payoutSchedules = getPayoutSchedules();
  const minPayoutOptions = getMinPayoutAmountOptions(settings.currency);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Payment Settings',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            hasChanges ? (
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Save size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Preferred Currency</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.currencyList}
            >
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyChip,
                    settings.currency === currency.code && styles.currencyChipSelected,
                  ]}
                  onPress={() => updateSetting({ currency: currency.code })}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      settings.currency === currency.code && styles.currencySymbolSelected,
                    ]}
                  >
                    {currency.symbol}
                  </Text>
                  <Text
                    style={[
                      styles.currencyCode,
                      settings.currency === currency.code && styles.currencyCodeSelected,
                    ]}
                  >
                    {currency.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Payout Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Method</Text>
          <View style={styles.card}>
            {payoutMethods.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.methodRow,
                  settings.payout_method === method.value && styles.methodRowSelected,
                ]}
                onPress={() => updateSetting({ payout_method: method.value })}
              >
                <View style={styles.methodLeft}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodLabel}>{method.label}</Text>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                    <Text style={styles.methodTime}>{method.processingTime}</Text>
                  </View>
                </View>
                {settings.payout_method === method.value && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}

            {settings.payout_method && (
              <View style={styles.emailInput}>
                <Mail size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Payout email"
                  value={settings.payout_email || ''}
                  onChangeText={(text) => updateSetting({ payout_email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>
        </View>

        {/* Payout Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Schedule</Text>
          <View style={styles.card}>
            {payoutSchedules.map((schedule) => (
              <TouchableOpacity
                key={schedule.value}
                style={styles.scheduleRow}
                onPress={() => updateSetting({ payout_schedule: schedule.value })}
              >
                <View style={styles.scheduleLeft}>
                  <Text style={styles.scheduleLabel}>{schedule.label}</Text>
                  <Text style={styles.scheduleDescription}>{schedule.description}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    settings.payout_schedule === schedule.value && styles.radioSelected,
                  ]}
                >
                  {settings.payout_schedule === schedule.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Minimum Payout */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minimum Payout Amount</Text>
          <View style={styles.card}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.amountList}
            >
              {minPayoutOptions.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.amountChip,
                    settings.min_payout_amount === amount && styles.amountChipSelected,
                  ]}
                  onPress={() => updateSetting({ min_payout_amount: amount })}
                >
                  <Text
                    style={[
                      styles.amountText,
                      settings.min_payout_amount === amount && styles.amountTextSelected,
                    ]}
                  >
                    {currencies.find((c) => c.code === settings.currency)?.symbol}
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Auto Payout */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automatic Payout</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Text style={styles.switchLabel}>Enable Auto Payout</Text>
                <Text style={styles.switchDescription}>
                  Automatically transfer funds based on your payout schedule
                </Text>
              </View>
              <Switch
                value={settings.auto_payout_enabled}
                onValueChange={(value) => updateSetting({ auto_payout_enabled: value })}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Bell size={16} color={colors.text} /> Notifications
          </Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Payment Received</Text>
              <Switch
                value={settings.notifications.payment_received}
                onValueChange={(value) => updateNotification('payment_received', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Payout Completed</Text>
              <Switch
                value={settings.notifications.payout_completed}
                onValueChange={(value) => updateNotification('payout_completed', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Low Balance Warning</Text>
              <Switch
                value={settings.notifications.low_balance}
                onValueChange={(value) => updateNotification('low_balance', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Payment Failed</Text>
              <Switch
                value={settings.notifications.payment_failed}
                onValueChange={(value) => updateNotification('payment_failed', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Tax Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <FileText size={16} color={colors.text} /> Tax Information
          </Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              Alert.alert('Coming Soon', 'Tax settings will be available in a future update');
            }}
          >
            <View style={styles.linkRow}>
              <View style={styles.linkLeft}>
                <Text style={styles.linkLabel}>Tax Settings</Text>
                <Text style={styles.linkDescription}>
                  Manage tax ID and business information
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {hasChanges && (
        <View style={styles.saveBar}>
          <Text style={styles.saveBarText}>You have unsaved changes</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Save size={18} color={colors.white} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  currencyList: {
    flexDirection: 'row',
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  currencyChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  currencySymbol: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  currencySymbolSelected: {
    color: colors.primary,
  },
  currencyCode: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  currencyCodeSelected: {
    color: colors.primary,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  methodRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  methodIcon: {
    fontSize: fontSize.xxxl,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  methodDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  methodTime: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xxs,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  emailInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleLeft: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scheduleDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  amountList: {
    flexDirection: 'row',
  },
  amountChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  amountChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  amountText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  amountTextSelected: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  switchDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkLeft: {
    flex: 1,
  },
  linkLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  linkDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  saveBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.warning + '20',
    borderTopWidth: 1,
    borderTopColor: colors.warning,
  },
  saveBarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
