import { View, Text, StyleSheet } from 'react-native';
import { Wrench, Briefcase } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface ProviderCapabilityBadgeProps {
  type: 'job' | 'service';
  size?: 'sm';
}

export default function ProviderCapabilityBadge({
  type,
  size = 'sm',
}: ProviderCapabilityBadgeProps) {
  const isJob = type === 'job';

  return (
    <View style={styles.badge}>
      {isJob ? (
        <Briefcase size={14} color={theme.colors.textLight} />
      ) : (
        <Wrench size={14} color={theme.colors.textLight} />
      )}
      <Text style={styles.badgeText}>{isJob ? 'Jobs' : 'Services'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textLight,
  },
});
