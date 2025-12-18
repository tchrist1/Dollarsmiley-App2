import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MessageCircle, Clock, CheckCircle, AlertCircle, X } from 'lucide-react-native';

interface ConsultationRequestCardProps {
  consultation?: {
    id: string;
    status: string;
    requested_by: string;
    started_at?: string;
    completed_at?: string;
    waived_at?: string;
    timeout_at?: string;
  };
  isProvider: boolean;
  providerDeadline?: string;
  customerDeadline?: string;
  onStartConsultation?: () => void;
  onCompleteConsultation?: () => void;
  onWaiveConsultation?: () => void;
  onOpenChat?: () => void;
  loading?: boolean;
}

export default function ConsultationRequestCard({
  consultation,
  isProvider,
  providerDeadline,
  customerDeadline,
  onStartConsultation,
  onCompleteConsultation,
  onWaiveConsultation,
  onOpenChat,
  loading = false,
}: ConsultationRequestCardProps) {
  const getTimeRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getStatusInfo = () => {
    if (!consultation) {
      return {
        icon: MessageCircle,
        color: '#6B7280',
        bgColor: '#F3F4F6',
        label: 'No Consultation',
        description: 'Consultation not required for this order',
      };
    }

    switch (consultation.status) {
      case 'pending':
        return {
          icon: Clock,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          label: 'Consultation Pending',
          description:
            consultation.requested_by === 'customer'
              ? 'Customer requested a consultation before work begins'
              : 'Consultation required by provider before work begins',
        };
      case 'in_progress':
        return {
          icon: MessageCircle,
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          label: 'Consultation In Progress',
          description: 'Consultation is currently active',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: '#059669',
          bgColor: '#D1FAE5',
          label: 'Consultation Completed',
          description: 'Consultation has been completed successfully',
        };
      case 'waived':
        return {
          icon: X,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          label: 'Consultation Waived',
          description: 'Consultation requirement has been waived',
        };
      case 'timed_out':
        return {
          icon: AlertCircle,
          color: '#EF4444',
          bgColor: '#FEE2E2',
          label: 'Consultation Timed Out',
          description: 'Consultation deadline was not met',
        };
      default:
        return {
          icon: MessageCircle,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          label: 'Unknown Status',
          description: 'Consultation status unknown',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const deadline = isProvider ? providerDeadline : customerDeadline;
  const timeRemaining = getTimeRemaining(deadline);

  if (!consultation) {
    return null;
  }

  return (
    <View
      style={[styles.container, { borderColor: statusInfo.color }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: statusInfo.bgColor }]}>
          <Icon size={24} color={statusInfo.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
          {timeRemaining && consultation.status === 'pending' && (
            <View style={styles.timerContainer}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.timerText}>
                {isProvider ? 'Response due: ' : 'Waiting: '}
                {timeRemaining}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.description}>{statusInfo.description}</Text>

      {consultation.requested_by === 'customer' && (
        <View style={styles.infoBox}>
          <MessageCircle size={16} color="#3B82F6" />
          <Text style={styles.infoText}>
            Customer has requested a consultation before work begins.
          </Text>
        </View>
      )}

      {consultation.requested_by === 'provider_required' && (
        <View style={styles.infoBox}>
          <AlertCircle size={16} color="#F59E0B" />
          <Text style={styles.infoText}>
            This provider requires consultation for all custom orders.
          </Text>
        </View>
      )}

      {isProvider && consultation.status === 'pending' && (
        <View style={styles.providerActions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onStartConsultation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MessageCircle size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}>Start Consultation</Text>
              </>
            )}
          </TouchableOpacity>

          {consultation.requested_by === 'customer' && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onWaiveConsultation}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Waive Requirement</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {consultation.status === 'in_progress' && (
        <View style={styles.inProgressActions}>
          <TouchableOpacity
            style={[styles.button, styles.chatButton]}
            onPress={onOpenChat}
          >
            <MessageCircle size={18} color="#3B82F6" />
            <Text style={styles.chatButtonText}>Open Consultation Chat</Text>
          </TouchableOpacity>

          {isProvider && (
            <TouchableOpacity
              style={[styles.button, styles.completeButton]}
              onPress={onCompleteConsultation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <CheckCircle size={18} color="#FFF" />
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isProvider && consultation.status === 'pending' && (
        <View style={styles.customerWaiting}>
          <Clock size={16} color="#6B7280" />
          <Text style={styles.customerWaitingText}>
            Waiting for provider to start consultation. Provider must respond within 48 hours.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 13,
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  providerActions: {
    gap: 8,
  },
  inProgressActions: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  chatButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#059669',
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  customerWaiting: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  customerWaitingText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
