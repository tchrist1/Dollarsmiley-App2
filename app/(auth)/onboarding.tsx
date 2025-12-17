import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { ShoppingBag, Briefcase, Users } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { UserType } from '@/types/database';

const userTypeOptions = [
  {
    type: 'Customer' as UserType,
    title: 'Customer',
    description: 'Find and book local services',
    icon: ShoppingBag,
  },
  {
    type: 'Provider' as UserType,
    title: 'Provider',
    description: 'Offer your services',
    icon: Briefcase,
  },
  {
    type: 'Hybrid' as UserType,
    title: 'Hybrid',
    description: 'Book and provide services',
    icon: Users,
  },
];

export default function OnboardingScreen() {
  const { profile, refreshProfile } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>('Customer');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!profile) return;

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ user_type: selectedType })
      .eq('id', profile.id);

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } else {
      await refreshProfile();
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://lmjaeulvzxiszyoiegsw.supabase.co/storage/v1/object/sign/assets/Iimages/Dollarsmiley%20logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mZDMzNWQ3Ni02ZmRjLTRjNTAtYjRjMS1hNGI2ZWZhMzhiNjkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvSWltYWdlcy9Eb2xsYXJzbWlsZXkgbG9nby5wbmciLCJpYXQiOjE3NjU3NTg0MDQsImV4cCI6MzM0MjU1ODQwNH0.5ZsGC2LcLf-pw-kuoYVn-t56rfmy0X-0EdwytDTRIJ4' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to Dollarsmiley!</Text>
        <Text style={styles.subtitle}>How would you like to use the app?</Text>
      </View>

      <View style={styles.options}>
        {userTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;

          return (
            <TouchableOpacity
              key={option.type}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelectedType(option.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Icon size={32} color={isSelected ? colors.white : colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.smsOptInText}>
        I agree to receive SMS alerts about jobs, bookings, and account updates. Msg & data rates may apply. Reply STOP to opt out.
      </Text>

      <View style={styles.footer}>
        <Button title="Continue" onPress={handleContinue} loading={loading} />
        <Text style={styles.footerText}>You can change this later in settings</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  options: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  optionTitleSelected: {
    color: colors.white,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  optionDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  footer: {
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  smsOptInText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
});
