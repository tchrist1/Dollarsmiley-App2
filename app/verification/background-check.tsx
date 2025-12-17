import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Plus, FileText } from 'lucide-react-native';
import BackgroundCheckStatus from '@/components/BackgroundCheckStatus';
import BackgroundCheckFlow from '@/components/BackgroundCheckFlow';
import {
  getProviderBackgroundChecks,
  getLatestBackgroundCheck,
  getBackgroundCheckComponents,
  canFileAppeal,
  type BackgroundCheck,
  type BackgroundCheckComponent,
} from '@/lib/background-checks';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function BackgroundCheckScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checks, setChecks] = useState<BackgroundCheck[]>([]);
  const [latestCheck, setLatestCheck] = useState<BackgroundCheck | null>(null);
  const [components, setComponents] = useState<BackgroundCheckComponent[]>([]);
  const [showFlow, setShowFlow] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [checksData, latestData] = await Promise.all([
        getProviderBackgroundChecks(user.id),
        getLatestBackgroundCheck(user.id),
      ]);

      setChecks(checksData);
      setLatestCheck(latestData);

      if (latestData) {
        const componentsData = await getBackgroundCheckComponents(latestData.id);
        setComponents(componentsData);
      }
    } catch (error) {
      console.error('Error loading background checks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartNew = () => {
    setShowFlow(true);
  };

  const handleFlowComplete = (checkId: string) => {
    setShowFlow(false);
    loadData();
  };

  const handleFlowCancel = () => {
    setShowFlow(false);
  };

  const handleViewDetails = (check: BackgroundCheck) => {
    router.push(`/verification/background-check/${check.id}`);
  };

  const handleFileAppeal = (check: BackgroundCheck) => {
    if (canFileAppeal(check)) {
      router.push(`/verification/background-check/${check.id}/appeal`);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Background Check</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please log in to continue</Text>
        </View>
      </View>
    );
  }

  if (showFlow) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleFlowCancel}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Background Check</Text>
          <View style={styles.placeholder} />
        </View>
        <BackgroundCheckFlow
          providerId={user.id}
          onComplete={handleFlowComplete}
          onCancel={handleFlowCancel}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Background Check</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Background Check</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleStartNew}>
          <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {latestCheck ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Status</Text>
            <BackgroundCheckStatus
              check={latestCheck}
              onViewDetails={() => handleViewDetails(latestCheck)}
              onRenew={handleStartNew}
            />

            {canFileAppeal(latestCheck) && (
              <TouchableOpacity
                style={styles.appealButton}
                onPress={() => handleFileAppeal(latestCheck)}
              >
                <FileText size={18} color={colors.white} />
                <Text style={styles.appealButtonText}>File Appeal</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Shield size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No Background Check</Text>
            <Text style={styles.emptySubtext}>
              Complete a background check to verify your identity and increase
              trust with customers
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartNew}
            >
              <Shield size={20} color={colors.white} />
              <Text style={styles.startButtonText}>Start Background Check</Text>
            </TouchableOpacity>
          </View>
        )}

        {checks.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Previous Checks</Text>
            {checks.slice(1).map((check) => (
              <View key={check.id} style={styles.historyItem}>
                <BackgroundCheckStatus
                  check={check}
                  onViewDetails={() => handleViewDetails(check)}
                  compact
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Shield size={20} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Why Background Checks?</Text>
            <Text style={styles.infoText}>
              Background checks help build trust and safety in our community.
              They verify your identity and check for any records that may
              affect your ability to provide services.
            </Text>
            <Text style={styles.infoText}>
              All checks are conducted by certified third-party services and
              comply with FCRA regulations.
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  addButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  historyItem: {
    marginTop: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  startButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  appealButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.info + '15',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  infoContent: {
    flex: 1,
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
  },
});
