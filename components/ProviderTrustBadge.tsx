import { View, Text, StyleSheet } from 'react-native';
import { Award } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface ProviderTrustBadgeProps {
  type: 'job' | 'service';
}

export default function ProviderTrustBadge({ type }: ProviderTrustBadgeProps) {
  const label = type === 'job' ? 'Top Job Provider' : 'Top Service Provider';

  return (
    <View style={styles.badge}>
      <Award size={14} color={theme.colors.warning} fill={theme.colors.warning} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B8860B',
  },
});
