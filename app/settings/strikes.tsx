import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, AlertTriangle, Shield, FileText, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserStrikes,
  getUserActiveStrikes,
  type ContentStrike,
} from '@/lib/content-reports';
import StrikeAppealModal from '@/components/StrikeAppealModal';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

export default function StrikesScreen() {
  const { profile } = useAuth();
  const [strikes, setStrikes] = useState<ContentStrike[]>([]);
  const [activeStrikesCount, setActiveStrikesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStrike, setSelectedStrike] = useState<ContentStrike | null>(null);
  const [showAppealModal, setShowAppealModal] = useState(false);

  useEffect(() => {
    if (profile) {
      loadStrikes();
    }
  }, [profile]);

  const loadStrikes = async () => {
    if (!profile) return;

    try {
      const [strikesData, activeCount] = await Promise.all([
        getUserStrikes(profile.id),
        getUserActiveStrikes(profile.id),
      ]);
      setStrikes(strikesData);
      setActiveStrikesCount(activeCount);
    } catch (error) {
      console.error('Error loading strikes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStrikes();
  };

  const handleAppeal = (strike: ContentStrike) => {
    if (strike.appealed) {
      Alert.alert(
        'Already Appealed',
        'You have already submitted an appeal for this strike. Please wait for a response from the moderation team.'
      );
      return;
    }

    setSelectedStrike(strike);
    setShowAppealModal(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'severe':
        return '#EA580C';
      case 'moderate':
        return '#F59E0B';
      case 'minor':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  const isStrikeActive = (strike: ContentStrike) => {
    if (!strike.expires_at) return true;
    return new Date(strike.expires_at) > new Date();
  };

  const renderStrike = ({ item }: { item: ContentStrike }) => {
    const isActive = isStrikeActive(item);

    return (
      <View
        style={[
          styles.strikeCard,
          !isActive && styles.strikeCardInactive,
        ]}
      >
        <View style={styles.strikeHeader}>
          <View style={styles.strikeHeaderLeft}>
            <AlertTriangle
              size={20}
              color={isActive ? getSeverityColor(item.severity) : colors.textSecondary}
            />
            <View
              style={[
                styles.severityBadge,
                {
                  backgroundColor: isActive
                    ? getSeverityColor(item.severity) + '20'
                    : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.severityText,
                  {
                    color: isActive
                      ? getSeverityColor(item.severity)
                      : colors.textSecondary,
                  },
                ]}
              >
                {item.severity}
              </Text>
            </View>
          </View>
          <View style={styles.strikePoints}>
            <Text
              style={[
                styles.strikePointsText,
                { color: isActive ? colors.error : colors.textSecondary },
              ]}
            >
              {item.strike_count} {item.strike_count === 1 ? 'strike' : 'strikes'}
            </Text>
          </View>
        </View>

        <Text style={styles.violationCategory}>{item.violation_category}</Text>
        <Text style={styles.violationDescription}>{item.violation_description}</Text>

        <View style={styles.strikeFooter}>
          <View style={styles.strikeFooterLeft}>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            {item.expires_at && (
              <Text style={styles.expiry}>
                {isActive
                  ? `Expires ${new Date(item.expires_at).toLocaleDateString()}`
                  : 'Expired'}
              </Text>
            )}
          </View>

          {isActive && !item.appealed && (
            <TouchableOpacity
              style={styles.appealButton}
              onPress={() => handleAppeal(item)}
            >
              <FileText size={16} color={colors.primary} />
              <Text style={styles.appealButtonText}>Appeal</Text>
            </TouchableOpacity>
          )}

          {item.appealed && (
            <View style={styles.appealStatusBadge}>
              <Clock size={14} color={colors.secondary} />
              <Text style={styles.appealStatusText}>
                {item.appeal_status === 'pending'
                  ? 'Appeal Pending'
                  : item.appeal_status === 'approved'
                  ? 'Appeal Approved'
                  : 'Appeal Rejected'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Strikes</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Strikes</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIconContainer}>
          <Shield
            size={32}
            color={activeStrikesCount === 0 ? colors.success : colors.error}
          />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>Active Strikes</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  activeStrikesCount === 0
                    ? colors.success
                    : activeStrikesCount < 3
                    ? colors.secondary
                    : colors.error,
              },
            ]}
          >
            {activeStrikesCount}
          </Text>
          <Text style={styles.summaryDescription}>
            {activeStrikesCount === 0
              ? 'Your account is in good standing'
              : activeStrikesCount < 3
              ? 'Be mindful of community guidelines'
              : 'Your account may be at risk of suspension'}
          </Text>
        </View>
      </View>

      <FlatList
        data={strikes}
        renderItem={renderStrike}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Shield size={64} color={colors.success} />
            <Text style={styles.emptyTitle}>No Strikes</Text>
            <Text style={styles.emptyText}>
              Your account has no violations. Keep following our community guidelines!
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      <StrikeAppealModal
        visible={showAppealModal}
        strike={selectedStrike}
        onClose={() => {
          setShowAppealModal(false);
          setSelectedStrike(null);
        }}
        onAppealSubmitted={() => {
          loadStrikes();
        }}
      />
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.lg,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  summaryDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  listContent: {
    padding: spacing.md,
  },
  strikeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  strikeCardInactive: {
    opacity: 0.6,
  },
  strikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  strikeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  strikePoints: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  strikePointsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  violationCategory: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  violationDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  strikeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  strikeFooterLeft: {
    gap: spacing.xs,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expiry: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  appealButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  appealStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  appealStatusText: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
