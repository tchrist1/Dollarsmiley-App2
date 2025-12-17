import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import DiscountCodeCreator from '@/components/DiscountCodeCreator';
import DiscountCodeManager from '@/components/DiscountCodeManager';
import {
  getCampaignDetails,
  type DiscountCode,
  type PromotionalCampaign,
} from '@/lib/promotional-campaigns';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function CampaignCodesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<PromotionalCampaign | null>(null);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    loadCampaignData();
  }, [id]);

  const loadCampaignData = async () => {
    if (!id) return;

    try {
      const data = await getCampaignDetails(id);
      if (data) {
        setCampaign(data.campaign);
        setCodes(data.codes);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleCodesCreated = (newCodes: DiscountCode[]) => {
    setCodes([...newCodes, ...codes]);
    setShowCreator(false);
  };

  const handleToggleCode = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: isActive })
        .eq('id', codeId);

      if (error) throw error;

      setCodes(codes.map(c => (c.id === codeId ? { ...c, is_active: isActive } : c)));
    } catch (error) {
      console.error('Error toggling code:', error);
      Alert.alert('Error', 'Failed to update code status');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    try {
      // Check if code has been used
      const { data: usage } = await supabase
        .from('campaign_usage')
        .select('id')
        .eq('code_id', codeId)
        .limit(1);

      if (usage && usage.length > 0) {
        Alert.alert(
          'Cannot Delete',
          'This code has been used and cannot be deleted. You can deactivate it instead.'
        );
        return;
      }

      const { error } = await supabase.from('discount_codes').delete().eq('id', codeId);

      if (error) throw error;

      setCodes(codes.filter(c => c.id !== codeId));
    } catch (error) {
      console.error('Error deleting code:', error);
      Alert.alert('Error', 'Failed to delete code');
    }
  };

  const handleExportCodes = () => {
    // In a real app, this would export to CSV or share
    const codesList = codes.map(c => c.code).join('\n');
    Alert.alert('Export Codes', `${codes.length} codes:\n\n${codesList}`, [
      { text: 'Copy to Clipboard' },
      { text: 'Share' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading codes...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Campaign not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Discount Codes',
          headerShown: true,
          headerRight: () =>
            !showCreator && (
              <TouchableOpacity
                onPress={() => setShowCreator(true)}
                style={styles.headerButton}
              >
                <Plus size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
        }}
      />

      <View style={styles.container}>
        {/* Campaign Info */}
        <View style={styles.campaignInfo}>
          <Text style={styles.campaignName}>{campaign.name}</Text>
          <Text style={styles.campaignDescription}>{campaign.description}</Text>
        </View>

        {showCreator ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.creatorHeader}>
              <TouchableOpacity
                onPress={() => setShowCreator(false)}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color={colors.primary} />
                <Text style={styles.backButtonText}>Back to Codes</Text>
              </TouchableOpacity>
            </View>

            <DiscountCodeCreator
              campaignId={campaign.id}
              onCodesCreated={handleCodesCreated}
              existingCodes={codes.map(c => c.code)}
            />
          </ScrollView>
        ) : (
          <View style={styles.content}>
            <DiscountCodeManager
              codes={codes}
              onToggleCode={handleToggleCode}
              onDeleteCode={handleDeleteCode}
              onExportCodes={handleExportCodes}
              showUsage={true}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerButton: {
    marginRight: spacing.md,
  },
  campaignInfo: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  campaignName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  campaignDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  contentPadding: {
    paddingBottom: spacing.xxl,
  },
  creatorHeader: {
    marginBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
  },
  backButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
