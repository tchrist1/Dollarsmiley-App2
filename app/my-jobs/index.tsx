import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, fontSize } from '@/constants/theme';

export default function MyJobsRedirect() {
  const { profile } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/my-jobs') {
      router.replace('/my-jobs/posted');
    }
  }, [pathname]);

  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
