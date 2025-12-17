import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Wallet, Edit, Shield, CreditCard, Award, LogOut, Star } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { Button } from '@/components/Button';
import BadgeList from '@/components/BadgeList';
import { Badge } from '@/components/VerificationBadge';
import AdminModeToggle from '@/components/AdminModeToggle';
import AccountTypeSwitcher from '@/components/AccountTypeSwitcher';

export default function ProfileScreen() {
  const { profile, loading, signOut, refreshProfile } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchBadges();
      checkAdminStatus();
    }
  }, [profile]);

  const checkAdminStatus = async () => {
    if (!profile) return;
    const isAdminUser = profile.user_type === 'Admin';
    setIsAdmin(isAdminUser);

    if (isAdminUser) {
      if (profile.admin_mode === null || profile.admin_mode === undefined) {
        await supabase
          .from('profiles')
          .update({ admin_mode: true })
          .eq('id', profile.id);
        setAdminMode(true);
        await refreshProfile();
      } else {
        setAdminMode(profile.admin_mode);
      }
    } else {
      setAdminMode(false);
    }
  };

  const fetchBadges = async () => {
    if (!profile) return;

    const { data } = await supabase
      .rpc('get_profile_badges', { p_profile_id: profile.id });

    if (data) {
      setBadges(data as Badge[]);
    }
  };

  const handleAccountTypeSwitch = async (newType: 'Customer' | 'Provider' | 'Hybrid') => {
    if (!profile || profile.user_type === newType || switchingAccount) return;

    setSwitchingAccount(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newType })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      await checkAdminStatus();
    } catch (error) {
      console.error('Error switching account type:', error);
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleAdminModeToggle = async (value: boolean) => {
    if (!profile || !isAdmin) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_mode: value })
        .eq('id', profile.id);

      if (error) throw error;

      setAdminMode(value);
      await refreshProfile();

      if (value) {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Error toggling admin mode:', error);
      setAdminMode(!value);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.signInPrompt}>
          <Text style={styles.signInText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.signInPrompt}>
          <Text style={styles.signInText}>Please sign in to view your profile</Text>
          <Button title="Sign In" onPress={() => router.push('/(auth)/login')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity Section - Avatar, Name, Email, Edit Button, Account Type Badge */}
        <View style={styles.identitySection}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{profile.full_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/settings/edit-profile' as any)}
          >
            <Edit size={18} color={colors.primary} />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Account Type Badge - appears right below Edit Profile */}
          {(!isAdmin || !adminMode) && (
            <View style={styles.accountTypeBadge}>
              <Text style={styles.accountTypeBadgeText}>{profile.user_type}</Text>
            </View>
          )}

          {badges.length > 0 && (
            <View style={styles.badgesContainer}>
              <BadgeList badges={badges} size="small" maxVisible={4} horizontal />
            </View>
          )}

          {(profile.user_type === 'Provider' || profile.user_type === 'Hybrid') && profile.total_reviews > 0 && (
            <TouchableOpacity
              style={styles.ratingsSection}
              onPress={() => router.push(`/reviews/${profile.id}` as any)}
            >
              <View style={styles.ratingRow}>
                <Star size={18} color={colors.warning} fill={colors.warning} />
                <Text style={styles.ratingValue}>
                  {profile.average_rating?.toFixed(1)} ({profile.total_reviews} reviews)
                </Text>
              </View>
              <Text style={styles.viewReviews}>View all reviews →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Admin Mode Toggle */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Controls</Text>
            <AdminModeToggle
              isAdminMode={adminMode}
              onToggle={handleAdminModeToggle}
              loading={switchingAccount}
            />
          </View>
        )}

        {/* Account Type Switcher - Only show when not in admin mode */}
        {(!isAdmin || !adminMode) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Type</Text>
            <AccountTypeSwitcher
              currentType={profile.user_type as 'Customer' | 'Provider' | 'Hybrid'}
              onSwitch={handleAccountTypeSwitch}
              loading={switchingAccount}
            />
          </View>
        )}

        {/* Verification Section */}
        {(profile.user_type === 'Provider' || profile.user_type === 'Hybrid') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <View style={styles.cardContainer}>
              <View style={styles.verificationCard}>
                <View style={styles.cardIconContainer}>
                  <Shield size={22} color={colors.primary} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Verification Status</Text>
                  <View
                    style={[
                      styles.verificationBadge,
                      {
                        backgroundColor:
                          profile.verification_status === 'Verified'
                            ? colors.success + '15'
                            : profile.verification_status === 'Pending'
                            ? colors.warning + '15'
                            : colors.textLight + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.verificationText,
                        {
                          color:
                            profile.verification_status === 'Verified'
                              ? colors.success
                              : profile.verification_status === 'Pending'
                              ? colors.warning
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {profile.verification_status || 'Unverified'}
                    </Text>
                  </View>
                </View>
              </View>
              {profile.verification_status !== 'Verified' &&
                profile.verification_status !== 'Pending' && (
                  <Button
                    title="Get Verified"
                    onPress={() => router.push('/verification/submit')}
                    style={styles.verifyButton}
                  />
                )}
            </View>
          </View>
        )}

        {/* Payments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push('/wallet')}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <Wallet size={22} color={colors.success} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Wallet</Text>
                <Text style={styles.cardSubtitle}>View earnings & payouts</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push('/payment-methods')}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <CreditCard size={22} color={colors.secondary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Payment Methods</Text>
                <Text style={styles.cardSubtitle}>Manage payment options</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push('/settings/subscription')}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <Award size={22} color={colors.warning} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Subscription Plan</Text>
                <Text style={styles.cardSubtitle}>
                  {profile.subscription_plan || 'Free'} Plan
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={signOut}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={colors.primary} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  signInText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  identitySection: {
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  avatarContainer: {
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.lg,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '700',
    color: colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    backgroundColor: colors.primary + '12',
    marginBottom: spacing.md,
  },
  editProfileText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  accountTypeBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  accountTypeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  ratingsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
    alignItems: 'center',
    width: '100%',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  viewReviews: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  cardContainer: {
    gap: spacing.sm,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  verificationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  verificationText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  verifyButton: {
    marginTop: spacing.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  signOutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    letterSpacing: -0.3,
  },
});
