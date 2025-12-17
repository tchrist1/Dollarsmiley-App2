import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Settings,
  Zap,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  History,
  Info,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  feature_description: string;
  category: string;
  is_enabled: boolean;
  config: any;
  usage_count: number;
  last_used_at: string;
  estimated_cost_per_use: number;
  total_cost: number;
  daily_limit: number | null;
  daily_usage: number;
  rate_limit_per_hour: number | null;
  is_beta: boolean;
  min_subscription_tier: string;
}

interface FeatureHistory {
  id: string;
  feature_key: string;
  action: string;
  reason: string;
  changed_by_email: string;
  changed_at: string;
}

export default function FeatureTogglesScreen() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [history, setHistory] = useState<FeatureHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const categories = [
    { key: 'all', label: 'All Features', icon: Settings },
    { key: 'ai', label: 'AI/ML', icon: Zap },
    { key: 'payment', label: 'Payments', icon: DollarSign },
    { key: 'shipping', label: 'Shipping', icon: TrendingUp },
    { key: 'communication', label: 'Communication', icon: AlertCircle },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'integration', label: 'Integrations', icon: Settings },
    { key: 'social', label: 'Social', icon: Clock },
    { key: 'other', label: 'Other', icon: Info },
  ];

  useEffect(() => {
    loadFeatures();
    loadHistory();
  }, []);

  async function loadFeatures() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('feature_flags')) {
          console.log('Feature flags table not found - using empty state');
          setFeatures([]);
          return;
        }
        throw error;
      }
      setFeatures(data || []);
    } catch (error: any) {
      console.error('Error loading features:', error);
      setFeatures([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadHistory() {
    try {
      const { data, error } = await supabase
        .from('feature_flag_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('feature_flag_history')) {
          console.log('Feature flag history table not found - using empty state');
          setHistory([]);
          return;
        }
        throw error;
      }
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error loading history:', error);
    }
  }

  async function toggleFeature(feature: FeatureFlag, enabled: boolean) {
    try {
      const reason = await new Promise<string>((resolve) => {
        Alert.prompt(
          `${enabled ? 'Enable' : 'Disable'} ${feature.feature_name}`,
          'Reason for change (optional):',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
            {
              text: 'Confirm',
              onPress: (text) => resolve(text || 'No reason provided'),
            },
          ]
        );
      });

      if (!reason) return;

      const { error } = await supabase.rpc('toggle_feature', {
        p_feature_key: feature.feature_key,
        p_enabled: enabled,
        p_reason: reason,
        p_changed_by: user?.id,
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        `${feature.feature_name} ${enabled ? 'enabled' : 'disabled'}`
      );

      loadFeatures();
      loadHistory();
    } catch (error: any) {
      console.error('Error toggling feature:', error);
      Alert.alert('Error', error.message);
    }
  }

  function getCategoryIcon(category: string) {
    const cat = categories.find((c) => c.key === category);
    return cat?.icon || Settings;
  }

  const filteredFeatures = features.filter((feature) => {
    const matchesCategory =
      selectedCategory === 'all' || feature.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      feature.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.feature_description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const stats = {
    total: features.length,
    enabled: features.filter((f) => f.is_enabled).length,
    disabled: features.filter((f) => !f.is_enabled).length,
    beta: features.filter((f) => f.is_beta).length,
    totalCost: features.reduce((sum, f) => sum + (f.total_cost || 0), 0),
    totalUsage: features.reduce((sum, f) => sum + (f.usage_count || 0), 0),
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading features...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadFeatures} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Feature Toggles</Text>
        <Text style={styles.subtitle}>
          Enable/disable API-powered functions
        </Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.enabled}</Text>
          <Text style={styles.statLabel}>Enabled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.disabled}</Text>
          <Text style={styles.statLabel}>Disabled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.beta}</Text>
          <Text style={styles.statLabel}>Beta</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${stats.totalCost.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Cost</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search features..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.key;

          return (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Icon
                size={16}
                color={isSelected ? '#FFF' : '#666'}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* History Toggle */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => setShowHistory(!showHistory)}
      >
        <History size={20} color="#007AFF" />
        <Text style={styles.historyButtonText}>
          {showHistory ? 'Hide' : 'Show'} Change History
        </Text>
      </TouchableOpacity>

      {/* History Section */}
      {showHistory && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Changes</Text>
          {history.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyAction}>
                  {item.action.toUpperCase()}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.changed_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.historyFeature}>{item.feature_key}</Text>
              {item.reason && (
                <Text style={styles.historyReason}>{item.reason}</Text>
              )}
              <Text style={styles.historyUser}>
                by {item.changed_by_email || 'System'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Features List */}
      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>
          Features ({filteredFeatures.length})
        </Text>

        {filteredFeatures.map((feature) => {
          const Icon = getCategoryIcon(feature.category);

          return (
            <View key={feature.id} style={styles.featureCard}>
              {/* Header */}
              <View style={styles.featureHeader}>
                <View style={styles.featureHeaderLeft}>
                  <Icon size={24} color="#007AFF" />
                  <View style={styles.featureHeaderText}>
                    <Text style={styles.featureName}>
                      {feature.feature_name}
                    </Text>
                    {feature.is_beta && (
                      <View style={styles.betaBadge}>
                        <Text style={styles.betaText}>BETA</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Switch
                  value={feature.is_enabled}
                  onValueChange={(value) => toggleFeature(feature, value)}
                  trackColor={{ false: '#CCC', true: '#34C759' }}
                />
              </View>

              {/* Description */}
              <Text style={styles.featureDescription}>
                {feature.feature_description}
              </Text>

              {/* Metadata */}
              <View style={styles.featureMetadata}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Category</Text>
                  <Text style={styles.metadataValue}>
                    {feature.category.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Min Tier</Text>
                  <Text style={styles.metadataValue}>
                    {feature.min_subscription_tier}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Cost/Use</Text>
                  <Text style={styles.metadataValue}>
                    ${feature.estimated_cost_per_use.toFixed(4)}
                  </Text>
                </View>
              </View>

              {/* Usage Stats */}
              <View style={styles.usageStats}>
                <View style={styles.usageStat}>
                  <Text style={styles.usageLabel}>Total Usage</Text>
                  <Text style={styles.usageValue}>
                    {feature.usage_count.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.usageStat}>
                  <Text style={styles.usageLabel}>Today</Text>
                  <Text style={styles.usageValue}>
                    {feature.daily_usage}
                    {feature.daily_limit && ` / ${feature.daily_limit}`}
                  </Text>
                </View>
                <View style={styles.usageStat}>
                  <Text style={styles.usageLabel}>Total Cost</Text>
                  <Text style={styles.usageValue}>
                    ${(feature.total_cost || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Limits Warning */}
              {feature.daily_limit && feature.daily_usage >= feature.daily_limit && (
                <View style={styles.warningBanner}>
                  <AlertCircle size={16} color="#FF9500" />
                  <Text style={styles.warningText}>
                    Daily limit reached
                  </Text>
                </View>
              )}

              {/* Last Used */}
              {feature.last_used_at && (
                <Text style={styles.lastUsed}>
                  Last used:{' '}
                  {new Date(feature.last_used_at).toLocaleString()}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
  },
  searchInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FFF',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  historyButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  historySection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  historyFeature: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  historyUser: {
    fontSize: 12,
    color: '#999',
  },
  featuresContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  featureCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  featureHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  betaBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  featureMetadata: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  usageStats: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    gap: 16,
  },
  usageStat: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '500',
  },
  lastUsed: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});
