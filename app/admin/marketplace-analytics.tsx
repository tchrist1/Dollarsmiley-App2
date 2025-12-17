import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Package, Truck, Star, DollarSign } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import CustomServicesAnalyticsPanel from '@/components/CustomServicesAnalyticsPanel';
import ShippingPerformanceDashboard from '@/components/ShippingPerformanceDashboard';
import VASAdoptionAnalytics from '@/components/VASAdoptionAnalytics';
import RevenueBreakdownDashboard from '@/components/RevenueBreakdownDashboard';
import AdminPayoutsManager from '@/components/AdminPayoutsManager';

type TabType = 'custom-services' | 'shipping' | 'vas' | 'revenue' | 'payouts';

export default function MarketplaceAnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('custom-services');

  function renderTabContent() {
    switch (activeTab) {
      case 'custom-services':
        return <CustomServicesAnalyticsPanel />;
      case 'shipping':
        return <ShippingPerformanceDashboard />;
      case 'vas':
        return <VASAdoptionAnalytics />;
      case 'revenue':
        return <RevenueBreakdownDashboard />;
      case 'payouts':
        return <AdminPayoutsManager />;
      default:
        return null;
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Marketplace Analytics',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'custom-services' && styles.tabActive]}
          onPress={() => setActiveTab('custom-services')}
        >
          <Package
            size={20}
            color={activeTab === 'custom-services' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'custom-services' && styles.tabTextActive,
            ]}
          >
            Custom Services
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'shipping' && styles.tabActive]}
          onPress={() => setActiveTab('shipping')}
        >
          <Truck
            size={20}
            color={activeTab === 'shipping' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'shipping' && styles.tabTextActive]}>
            Shipping
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'vas' && styles.tabActive]}
          onPress={() => setActiveTab('vas')}
        >
          <Star
            size={20}
            color={activeTab === 'vas' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'vas' && styles.tabTextActive]}>
            VAS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'revenue' && styles.tabActive]}
          onPress={() => setActiveTab('revenue')}
        >
          <DollarSign
            size={20}
            color={activeTab === 'revenue' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'revenue' && styles.tabTextActive]}>
            Revenue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'payouts' && styles.tabActive]}
          onPress={() => setActiveTab('payouts')}
        >
          <DollarSign
            size={20}
            color={activeTab === 'payouts' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'payouts' && styles.tabTextActive]}>
            Payouts
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.content}>{renderTabContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  tabsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
});
