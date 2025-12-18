import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, CheckCircle, DollarSign, Calendar } from 'lucide-react-native';
import { ProductionOrder } from '@/types/database';

interface PaymentTimelineCardProps {
  order: ProductionOrder;
}

interface TimelineEvent {
  label: string;
  date?: string;
  amount?: number;
  completed: boolean;
  icon: any;
  color: string;
}

export default function PaymentTimelineCard({ order }: PaymentTimelineCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculatePayoutDate = () => {
    if (!order.payment_captured_at) return null;
    const captureDate = new Date(order.payment_captured_at);
    const payoutDate = new Date(captureDate);
    payoutDate.setDate(payoutDate.getDate() + 14);
    return payoutDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const events: TimelineEvent[] = [
    {
      label: 'Authorization Hold Placed',
      date: order.created_at,
      amount: order.authorization_amount,
      completed: true,
      icon: Clock,
      color: '#3B82F6',
    },
    {
      label: 'Price Approved by Customer',
      date: order.customer_price_approved_at,
      amount: order.final_price,
      completed: !!order.customer_price_approved_at,
      icon: CheckCircle,
      color: '#059669',
    },
    {
      label: 'Payment Captured',
      date: order.payment_captured_at,
      amount: order.final_price,
      completed: !!order.payment_captured_at,
      icon: DollarSign,
      color: '#8B5CF6',
    },
  ];

  const payoutDate = calculatePayoutDate();
  if (payoutDate) {
    events.push({
      label: 'Provider Payout (14 days)',
      date: payoutDate,
      completed: false,
      icon: Calendar,
      color: '#F59E0B',
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Timeline</Text>

      <View style={styles.timeline}>
        {events.map((event, index) => {
          const Icon = event.icon;
          const isLast = index === events.length - 1;

          return (
            <View key={index} style={styles.eventContainer}>
              <View style={styles.iconColumn}>
                <View
                  style={[
                    styles.iconCircle,
                    event.completed ? styles.iconCircleCompleted : styles.iconCirclePending,
                    { backgroundColor: event.completed ? event.color : '#E5E7EB' },
                  ]}
                >
                  <Icon
                    size={16}
                    color={event.completed ? '#FFF' : '#9CA3AF'}
                  />
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.connector,
                      event.completed ? styles.connectorCompleted : styles.connectorPending,
                    ]}
                  />
                )}
              </View>

              <View style={styles.eventContent}>
                <Text
                  style={[
                    styles.eventLabel,
                    event.completed ? styles.eventLabelCompleted : styles.eventLabelPending,
                  ]}
                >
                  {event.label}
                </Text>
                {event.date && (
                  <Text style={styles.eventDate}>
                    {typeof event.date === 'string' ? formatDate(event.date) : event.date}
                  </Text>
                )}
                {event.amount && (
                  <Text style={styles.eventAmount}>${event.amount.toFixed(2)}</Text>
                )}
                {!event.completed && !event.date && (
                  <Text style={styles.eventPending}>Pending</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {order.price_changes && order.price_changes.length > 0 && (
        <View style={styles.priceChanges}>
          <Text style={styles.priceChangesTitle}>Price Change History</Text>
          {order.price_changes.map((change: any, index: number) => (
            <View key={index} style={styles.priceChange}>
              <Text style={styles.priceChangeDate}>
                {formatDate(change.timestamp)}
              </Text>
              <Text style={styles.priceChangeText}>
                ${change.old_proposed_price?.toFixed(2) || '0.00'} → $
                {change.new_proposed_price?.toFixed(2) || '0.00'}
              </Text>
              {change.reason && (
                <Text style={styles.priceChangeReason}>{change.reason}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  timeline: {
    gap: 4,
  },
  eventContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  iconColumn: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleCompleted: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCirclePending: {
    opacity: 0.6,
  },
  connector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  connectorCompleted: {
    backgroundColor: '#D1D5DB',
  },
  connectorPending: {
    backgroundColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  eventContent: {
    flex: 1,
    paddingBottom: 16,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  eventLabelCompleted: {
    color: '#1F2937',
  },
  eventLabelPending: {
    color: '#9CA3AF',
  },
  eventDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  eventAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
  eventPending: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  priceChanges: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceChangesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  priceChange: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  priceChangeDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  priceChangeReason: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },
});
