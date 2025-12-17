import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { DollarSign, Clock, CheckCircle, Calendar } from 'lucide-react-native';
import { PayoutSchedule } from '../types/database';
import { PayoutScheduleService } from '../lib/payout-schedules';
import { useAuth } from '../contexts/AuthContext';

export default function PayoutScheduleDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [pendingPayouts, setPendingPayouts] = useState<PayoutSchedule[]>([]);
  const [earlyEligible, setEarlyEligible] = useState<PayoutSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingEarly, setRequestingEarly] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPayoutData();
    }
  }, [user]);

  async function loadPayoutData() {
    if (!user) return;

    setLoading(true);
    try {
      const summaryData = await PayoutScheduleService.getPayoutSummary(user.id);
      const pending = await PayoutScheduleService.getProviderPayoutSchedules(
        user.id,
        'Pending'
      );
      const eligible = await PayoutScheduleService.getEarlyPayoutEligibleSchedules(
        user.id
      );

      setSummary(summaryData);
      setPendingPayouts(pending);
      setEarlyEligible(eligible);
    } catch (error) {
      console.error('Error loading payout data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEarlyPayoutRequest(scheduleId: string) {
    Alert.alert(
      'Request Early Payout',
      'Request early payout for this booking? The funds will be processed immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            setRequestingEarly(scheduleId);
            try {
              const result = await PayoutScheduleService.requestEarlyPayout(
                scheduleId
              );
              if (result.success) {
                Alert.alert('Success', 'Early payout request submitted');
                loadPayoutData();
              } else {
                Alert.alert('Error', result.error || 'Request failed');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setRequestingEarly(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <DollarSign size={64} color="#CCC" />
        <Text style={styles.emptyText}>No payout data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payout Schedule</Text>
        <Text style={styles.subtitle}>Track your earnings and payouts</Text>
      </View>

      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Clock size={24} color="#FF9500" />
          <Text style={styles.summaryAmount}>
            ${summary.totalPending.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>

        <View style={[styles.summaryCard, styles.scheduledCard]}>
          <Calendar size={24} color="#007AFF" />
          <Text style={styles.summaryAmount}>
            ${summary.totalScheduled.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Scheduled</Text>
        </View>

        <View style={[styles.summaryCard, styles.completedCard]}>
          <CheckCircle size={24} color="#34C759" />
          <Text style={styles.summaryAmount}>
            ${summary.totalCompleted.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      {summary.nextPayoutDate && (
        <View style={styles.nextPayoutCard}>
          <View style={styles.nextPayoutHeader}>
            <Text style={styles.nextPayoutTitle}>Next Payout</Text>
            <Text style={styles.nextPayoutAmount}>
              ${summary.nextPayoutAmount?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <Text style={styles.nextPayoutDate}>
            {new Date(summary.nextPayoutDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}

      {summary.earlyPayoutAvailable && (
        <View style={styles.earlyPayoutBanner}>
          <View style={styles.earlyPayoutInfo}>
            <Text style={styles.earlyPayoutTitle}>Early Payout Available</Text>
            <Text style={styles.earlyPayoutAmount}>
              ${summary.earlyPayoutAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Early Payout Eligible</Text>
        {earlyEligible.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              No bookings eligible for early payout
            </Text>
          </View>
        ) : (
          earlyEligible.map((schedule) => (
            <View key={schedule.id} style={styles.payoutCard}>
              <View style={styles.payoutCardHeader}>
                <View style={styles.payoutTypeContainer}>
                  <Text style={styles.payoutType}>{schedule.transaction_type}</Text>
                </View>
                <Text style={styles.payoutAmount}>
                  ${schedule.payout_amount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.payoutCardDetails}>
                <Text style={styles.payoutCardLabel}>Completed:</Text>
                <Text style={styles.payoutCardValue}>
                  {new Date(schedule.completed_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.payoutCardDetails}>
                <Text style={styles.payoutCardLabel}>Regular payout:</Text>
                <Text style={styles.payoutCardValue}>
                  {new Date(schedule.scheduled_payout_date).toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.earlyPayoutButton}
                onPress={() => handleEarlyPayoutRequest(schedule.id)}
                disabled={requestingEarly === schedule.id}
              >
                {requestingEarly === schedule.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.earlyPayoutButtonText}>
                    Request Early Payout
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Payouts</Text>
        {pendingPayouts.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No pending payouts</Text>
          </View>
        ) : (
          pendingPayouts.map((schedule) => (
            <View key={schedule.id} style={styles.payoutCard}>
              <View style={styles.payoutCardHeader}>
                <View style={styles.payoutTypeContainer}>
                  <Text style={styles.payoutType}>{schedule.transaction_type}</Text>
                </View>
                <Text style={styles.payoutAmount}>
                  ${schedule.payout_amount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.payoutCardDetails}>
                <Text style={styles.payoutCardLabel}>Scheduled:</Text>
                <Text style={styles.payoutCardValue}>
                  {new Date(schedule.scheduled_payout_date).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.payoutCardDetails}>
                <Text style={styles.payoutCardLabel}>Days until payout:</Text>
                <Text style={styles.payoutCardValue}>
                  {PayoutScheduleService.getDaysUntilPayout(schedule)}
                </Text>
              </View>

              {PayoutScheduleService.canRequestEarlyPayout(schedule) && (
                <TouchableOpacity
                  style={styles.earlyPayoutButtonSecondary}
                  onPress={() => handleEarlyPayoutRequest(schedule.id)}
                  disabled={requestingEarly === schedule.id}
                >
                  {requestingEarly === schedule.id ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Text style={styles.earlyPayoutButtonSecondaryText}>
                      Request Early Payout
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Payout Schedule</Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Jobs:</Text> Payout every 7 days (3-day
          cut-off, early request after 3 days)
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Services & Custom Services:</Text> Payout
          every 14 days (5-day cut-off, early request after 7 days)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  scheduledCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    marginRight: 0,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  nextPayoutCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  nextPayoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextPayoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  nextPayoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  nextPayoutDate: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  earlyPayoutBanner: {
    backgroundColor: '#34C759',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  earlyPayoutInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earlyPayoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  earlyPayoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  emptySection: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#999',
  },
  payoutCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  payoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutTypeContainer: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payoutType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  payoutCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payoutCardLabel: {
    fontSize: 13,
    color: '#666',
  },
  payoutCardValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  earlyPayoutButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  earlyPayoutButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  earlyPayoutButtonSecondary: {
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  earlyPayoutButtonSecondaryText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
    color: '#000',
  },
});
