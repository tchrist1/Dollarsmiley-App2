import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import {
  Mic,
  Search,
  MapPin,
  Star,
  DollarSign,
  TrendingUp,
  Clock,
  Lightbulb,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import VoiceSearchButton from './VoiceSearchButton';
import {
  getVoiceSearchSuggestions,
  getVoiceCommandExamples,
  isVoiceSearchSupported,
} from '@/lib/voice-search';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface VoiceSearchInterfaceProps {
  searchType?: 'providers' | 'jobs';
  onClose?: () => void;
}

export default function VoiceSearchInterface({
  searchType = 'providers',
  onClose,
}: VoiceSearchInterfaceProps) {
  // Voice search only works on web browsers, not native mobile
  if (Platform.OS !== 'web' || !isVoiceSearchSupported()) {
    return null;
  }

  const { user } = useAuth();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [lastQuery, setLastQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [examples] = useState(getVoiceCommandExamples());

  useEffect(() => {
    loadSuggestions();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user?.id) return;

    const data = await getVoiceSearchSuggestions(user.id);
    setSuggestions(data);
  };

  const handleResults = (results: any[], query: string) => {
    setSearchResults(results);
    setLastQuery(query);
  };

  const handleError = (error: string) => {
    console.error('Voice search error:', error);
  };

  const handleItemPress = (item: any) => {
    if (searchType === 'providers') {
      router.push(`/listing/${item.id}`);
    } else {
      router.push(`/jobs/${item.id}`);
    }
    onClose?.();
  };

  const renderProviderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.full_name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName}>{item.full_name}</Text>
          <Text style={styles.resultCategory}>{item.category?.name}</Text>
        </View>
      </View>

      <View style={styles.resultMeta}>
        {item.average_rating && (
          <View style={styles.metaItem}>
            <Star size={14} color={colors.warning} fill={colors.warning} />
            <Text style={styles.metaText}>{item.average_rating.toFixed(1)}</Text>
          </View>
        )}
        {item.hourly_rate && (
          <View style={styles.metaItem}>
            <DollarSign size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>${item.hourly_rate}/hr</Text>
          </View>
        )}
        {item.location && (
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderJobItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetText}>${item.budget}</Text>
        </View>
      </View>

      <Text style={styles.jobDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.jobMeta}>
        <View style={styles.metaItem}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {item.location && (
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Mic size={24} color={colors.primary} />
          <Text style={styles.headerTitle}>Voice Search</Text>
        </View>
        <VoiceSearchButton
          searchType={searchType}
          onResults={handleResults}
          onError={handleError}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Search size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Results for "{lastQuery}"</Text>
            </View>
            <FlatList
              data={searchResults}
              renderItem={searchType === 'providers' ? renderProviderItem : renderJobItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {/* Recent Searches */}
        {suggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Recent Voice Searches</Text>
            </View>
            <View style={styles.suggestionsList}>
              {suggestions.map((suggestion, index) => (
                <View key={index} style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Examples */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Try Saying</Text>
          </View>
          <View style={styles.examplesList}>
            {examples.map((example, index) => (
              <View key={index} style={styles.exampleCard}>
                <Mic size={16} color={colors.primary} />
                <Text style={styles.exampleText}>{example}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>What You Can Search</Text>
          </View>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Search size={20} color={colors.primary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>By Category</Text>
                <Text style={styles.featureDescription}>
                  "Find plumbers" or "Show electricians"
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <MapPin size={20} color={colors.primary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>By Location</Text>
                <Text style={styles.featureDescription}>
                  "Near downtown" or "In Boston"
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <DollarSign size={20} color={colors.primary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>By Price</Text>
                <Text style={styles.featureDescription}>
                  "Under $100" or "Between $50 and $150"
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Star size={20} color={colors.primary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>By Rating</Text>
                <Text style={styles.featureDescription}>
                  "4 stars or higher" or "Top rated"
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  resultCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  jobTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  budgetBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
  },
  budgetText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  jobDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  examplesList: {
    gap: spacing.sm,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
