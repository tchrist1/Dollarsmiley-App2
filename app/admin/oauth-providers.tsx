import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface OAuthProvider {
  id: string;
  provider: string;
  is_enabled: boolean;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export default function OAuthProvidersScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, [profile]);

  const checkAdminAndFetch = async () => {
    if (profile?.user_type !== 'Admin') {
      Alert.alert('Access Denied', 'You do not have permission to access this page');
      router.back();
      return;
    }

    await fetchProviders();
  };

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .order('provider');

    if (error) {
      Alert.alert('Error', 'Failed to load OAuth providers');
      console.error(error);
    } else {
      setProviders(data || []);
    }
    setLoading(false);
  };

  const toggleProvider = async (providerId: string, currentValue: boolean) => {
    setUpdating(providerId);

    const { error } = await supabase
      .from('oauth_providers')
      .update({
        is_enabled: !currentValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId);

    if (error) {
      Alert.alert('Error', 'Failed to update provider status');
      console.error(error);
    } else {
      await fetchProviders();
      Alert.alert('Success', 'Provider status updated successfully');
    }

    setUpdating(null);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🔴';
      case 'apple':
        return '🍎';
      case 'github':
        return '⚫';
      case 'facebook':
        return '🔵';
      case 'twitter':
        return '🐦';
      case 'microsoft':
        return '🪟';
      default:
        return '🔐';
    }
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading OAuth providers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OAuth Providers</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Manage Login Options</Text>
          <Text style={styles.infoText}>
            Enable or disable social login options for your users. Changes take effect immediately on the login screen.
          </Text>
        </View>

        <View style={styles.providersContainer}>
          {providers.map((provider) => (
            <View key={provider.id} style={styles.providerCard}>
              <View style={styles.providerInfo}>
                <Text style={styles.providerIcon}>{getProviderIcon(provider.provider)}</Text>
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName}>{getProviderName(provider.provider)}</Text>
                  <Text style={styles.providerStatus}>
                    {provider.is_enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>

              <View style={styles.providerActions}>
                {provider.is_enabled ? (
                  <View style={styles.statusBadge}>
                    <Check size={16} color={colors.success} />
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusBadgeInactive]}>
                    <X size={16} color={colors.error} />
                  </View>
                )}

                <Switch
                  value={provider.is_enabled}
                  onValueChange={() => toggleProvider(provider.id, provider.is_enabled)}
                  disabled={updating === provider.id}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={provider.is_enabled ? colors.primary : colors.textLight}
                />
              </View>
            </View>
          ))}
        </View>

        {providers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No OAuth providers configured</Text>
          </View>
        )}

        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Important Notes</Text>
          <Text style={styles.notesText}>
            • Apple login only appears on iOS devices{'\n'}
            • GitHub login has been disabled per configuration{'\n'}
            • Users need to refresh the app to see changes{'\n'}
            • Disabled providers won't prevent existing users from logging in{'\n'}
            • Make sure OAuth credentials are configured in Supabase
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.infoLight,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.info,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  providersContainer: {
    gap: spacing.md,
  },
  providerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerStatus: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeInactive: {
    backgroundColor: colors.errorLight,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  notesCard: {
    backgroundColor: colors.warningLight,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  notesTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
});
