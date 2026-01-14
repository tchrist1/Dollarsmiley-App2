import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, fontSize } from '@/constants/theme';

export default function MyJobsRedirect() {
  const { profile } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (!profile) {
      router.replace('/login');
      return;
    }

    // Redirect based on account type and optional preference
    const redirectTo = params.view || 'posted';

    if (redirectTo === 'applied') {
      router.replace('/my-jobs/applied');
    } else {
      router.replace('/my-jobs/posted');
    }
  }, [profile, params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
