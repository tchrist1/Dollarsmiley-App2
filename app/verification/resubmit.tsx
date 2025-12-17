import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { RejectedRequestCard } from '@/components/RejectedRequestCard';
import { DocumentResubmissionFlow } from '@/components/DocumentResubmissionFlow';
import { useAuth } from '@/contexts/AuthContext';
import { getRejectedRequests, type RejectedRequest } from '@/lib/document-resubmission';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { AlertCircle } from 'lucide-react-native';

export default function ResubmitVerificationScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [requests, setRequests] = useState<RejectedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    params.requestId as string || null
  );

  useEffect(() => {
    if (user) {
      loadRejectedRequests();
    }
  }, [user]);

  const loadRejectedRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getRejectedRequests(user.id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading rejected requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRejectedRequests();
    setRefreshing(false);
  };

  const handleResubmit = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  const handleResubmitSuccess = () => {
    setSelectedRequestId(null);
    loadRejectedRequests();
    router.back();
  };

  const handleResubmitCancel = () => {
    setSelectedRequestId(null);
  };

  const handleViewDetails = (request: RejectedRequest) => {
    console.log('View details for request:', request.id);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view rejected verifications</Text>
      </View>
    );
  }

  if (selectedRequestId) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Resubmit Documents',
            headerShown: true,
          }}
        />
        <DocumentResubmissionFlow
          requestId={selectedRequestId}
          onSuccess={handleResubmitSuccess}
          onCancel={handleResubmitCancel}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Resubmit Verification',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <AlertCircle size={32} color={colors.error} />
          <Text style={styles.headerTitle}>Rejected Verifications</Text>
          <Text style={styles.headerSubtitle}>
            Review the rejection reasons and resubmit with corrected documents
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading rejected verifications...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Rejected Verifications</Text>
            <Text style={styles.emptyStateText}>
              You don't have any rejected verification requests that need resubmission
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => (
              <RejectedRequestCard
                key={request.id}
                request={request}
                onResubmit={() => handleResubmit(request.id)}
                onViewDetails={() => handleViewDetails(request)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  requestsList: {
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
