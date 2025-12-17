import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Flag } from 'lucide-react-native';
import ReportContentModal from './ReportContentModal';
import { colors, spacing } from '@/constants/theme';

interface QuickReportButtonProps {
  contentType: 'post' | 'comment' | 'review' | 'listing' | 'user' | 'message' | 'booking';
  contentId: string;
  size?: number;
  color?: string;
  onReportSubmitted?: () => void;
  style?: any;
}

export default function QuickReportButton({
  contentType,
  contentId,
  size = 20,
  color = colors.textSecondary,
  onReportSubmitted,
  style,
}: QuickReportButtonProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setShowReportModal(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Flag size={size} color={color} />
      </TouchableOpacity>

      <ReportContentModal
        visible={showReportModal}
        contentType={contentType}
        contentId={contentId}
        onClose={() => setShowReportModal(false)}
        onReportSubmitted={() => {
          setShowReportModal(false);
          onReportSubmitted?.();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
});
