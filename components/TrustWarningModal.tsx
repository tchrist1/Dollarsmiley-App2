import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AlertCircle, X, CheckCircle } from 'lucide-react-native';

interface TrustWarningModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  trustLevel: number;
  role: 'customer' | 'provider';
  warnings: string[];
  requiresNoShowFee?: boolean;
  requiresConfirmation?: boolean;
}

export function TrustWarningModal({
  visible,
  onClose,
  onContinue,
  trustLevel,
  role,
  warnings,
  requiresNoShowFee = false,
  requiresConfirmation = false,
}: TrustWarningModalProps) {
  const getTrustLevelColor = () => {
    switch (trustLevel) {
      case 1:
        return '#F59E0B';
      case 2:
        return '#EF4444';
      case 3:
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getTrustLevelLabel = () => {
    if (role === 'customer') {
      switch (trustLevel) {
        case 1:
          return 'Soft Warning';
        case 2:
          return 'Reliability Risk';
        case 3:
          return 'High Risk';
        default:
          return 'Advisory';
      }
    } else {
      switch (trustLevel) {
        case 1:
          return 'Advisory';
        case 2:
          return 'Reliability Risk';
        case 3:
          return 'High Risk';
        default:
          return 'Advisory';
      }
    }
  };

  const trustColor = getTrustLevelColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#6B7280" />
          </TouchableOpacity>

          <View style={[styles.header, { backgroundColor: `${trustColor}15` }]}>
            <AlertCircle size={48} color={trustColor} />
            <Text style={styles.headerTitle}>Reliability Advisory</Text>
            <Text style={[styles.headerSubtitle, { color: trustColor }]}>
              {getTrustLevelLabel()}
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.introText}>
              {role === 'customer'
                ? 'Your reliability status requires attention before proceeding.'
                : 'Your provider status requires acknowledgment before proceeding.'}
            </Text>

            {warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {warnings.map((warning, index) => (
                  <View key={index} style={styles.warningRow}>
                    <View style={styles.warningBullet} />
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            {requiresNoShowFee && (
              <View style={styles.requirementBox}>
                <AlertCircle size={20} color="#F59E0B" />
                <View style={styles.requirementTextContainer}>
                  <Text style={styles.requirementTitle}>
                    No-Show Fee Required
                  </Text>
                  <Text style={styles.requirementText}>
                    Due to your reliability status, you must set a no-show fee for
                    this job posting. This protects providers who accept your job.
                  </Text>
                </View>
              </View>
            )}

            {requiresConfirmation && (
              <View style={styles.requirementBox}>
                <AlertCircle size={20} color="#F59E0B" />
                <View style={styles.requirementTextContainer}>
                  <Text style={styles.requirementTitle}>
                    Confirmation Required
                  </Text>
                  <Text style={styles.requirementText}>
                    Please confirm that you can complete this job. Your reliability
                    status requires additional acknowledgment.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.improvementBox}>
              <CheckCircle size={20} color="#10B981" />
              <View style={styles.improvementTextContainer}>
                <Text style={styles.improvementTitle}>How to Improve</Text>
                <Text style={styles.improvementText}>
                  {role === 'customer'
                    ? 'Complete jobs as scheduled and avoid no-shows to improve your status. 5 consecutive completed jobs will reduce restrictions.'
                    : 'Complete jobs successfully and maintain reliability to improve your status. 10 consecutive completed jobs will reduce restrictions.'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: trustColor }]}
              onPress={onContinue}
            >
              <Text style={styles.primaryButtonText}>
                {requiresConfirmation || requiresNoShowFee
                  ? 'I Understand, Continue'
                  : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: 24,
  },
  introText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  warningsContainer: {
    marginBottom: 16,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warningBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginTop: 7,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  requirementBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 16,
  },
  requirementTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  requirementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  improvementBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    marginBottom: 16,
  },
  improvementTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  improvementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  improvementText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  secondaryButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  primaryButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
