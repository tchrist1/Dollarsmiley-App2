/**
 * Feature Flag Service
 *
 * Central service for checking and managing feature flags
 */

import { supabase } from './supabase';

interface FeatureConfig {
  [key: string]: any;
}

class FeatureFlagService {
  private cache: Map<string, { enabled: boolean; config: FeatureConfig; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a feature is enabled
   */
  async isEnabled(featureKey: string): Promise<boolean> {
    // Check cache first
    const cached = this.cache.get(featureKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.enabled;
    }

    // Query database
    try {
      const { data, error } = await supabase.rpc('is_feature_enabled', {
        p_feature_key: featureKey,
      });

      if (error) {
        console.error(`Error checking feature ${featureKey}:`, error);
        return false;
      }

      // Update cache
      this.cache.set(featureKey, {
        enabled: data || false,
        config: {},
        timestamp: Date.now(),
      });

      return data || false;
    } catch (error) {
      console.error(`Error checking feature ${featureKey}:`, error);
      return false;
    }
  }

  /**
   * Get feature configuration
   */
  async getConfig(featureKey: string): Promise<FeatureConfig> {
    // Check cache first
    const cached = this.cache.get(featureKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.config;
    }

    // Query database
    try {
      const { data, error } = await supabase.rpc('get_feature_config', {
        p_feature_key: featureKey,
      });

      if (error) {
        console.error(`Error getting config for ${featureKey}:`, error);
        return {};
      }

      // Update cache
      const config = data || {};
      this.cache.set(featureKey, {
        enabled: true,
        config,
        timestamp: Date.now(),
      });

      return config;
    } catch (error) {
      console.error(`Error getting config for ${featureKey}:`, error);
      return {};
    }
  }

  /**
   * Check if feature is enabled and return config
   */
  async checkAndGetConfig(
    featureKey: string
  ): Promise<{ enabled: boolean; config: FeatureConfig }> {
    const enabled = await this.isEnabled(featureKey);
    if (!enabled) {
      return { enabled: false, config: {} };
    }

    const config = await this.getConfig(featureKey);
    return { enabled: true, config };
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(featureKey: string, cost: number = 0): Promise<void> {
    try {
      await supabase.rpc('increment_feature_usage', {
        p_feature_key: featureKey,
        p_cost: cost,
      });
    } catch (error) {
      console.error(`Error incrementing usage for ${featureKey}:`, error);
    }
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(featureKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_feature_rate_limit', {
        p_feature_key: featureKey,
      });

      if (error) {
        console.error(`Error checking rate limit for ${featureKey}:`, error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error(`Error checking rate limit for ${featureKey}:`, error);
      return false;
    }
  }

  /**
   * Execute function only if feature is enabled
   */
  async withFeature<T>(
    featureKey: string,
    fn: (config: FeatureConfig) => Promise<T>,
    fallback?: T
  ): Promise<T> {
    const { enabled, config } = await this.checkAndGetConfig(featureKey);

    if (!enabled) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`Feature ${featureKey} is not enabled`);
    }

    // Check rate limit
    const withinLimit = await this.checkRateLimit(featureKey);
    if (!withinLimit) {
      throw new Error(`Rate limit exceeded for feature ${featureKey}`);
    }

    // Execute function
    const result = await fn(config);

    // Increment usage (don't await to avoid blocking)
    this.incrementUsage(featureKey, config.estimated_cost_per_use || 0);

    return result;
  }

  /**
   * Clear cache
   */
  clearCache(featureKey?: string): void {
    if (featureKey) {
      this.cache.delete(featureKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get all features
   */
  async getAllFeatures() {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all features:', error);
      return [];
    }
  }

  /**
   * Toggle feature (admin only)
   */
  async toggleFeature(
    featureKey: string,
    enabled: boolean,
    reason: string = ''
  ): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.rpc('toggle_feature', {
        p_feature_key: featureKey,
        p_enabled: enabled,
        p_reason: reason,
        p_changed_by: userData.user?.id,
      });

      if (error) throw error;

      // Clear cache for this feature
      this.clearCache(featureKey);
    } catch (error) {
      console.error(`Error toggling feature ${featureKey}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();

// Export convenience functions
export const isFeatureEnabled = (featureKey: string) =>
  featureFlags.isEnabled(featureKey);

export const getFeatureConfig = (featureKey: string) =>
  featureFlags.getConfig(featureKey);

export const withFeature = <T>(
  featureKey: string,
  fn: (config: FeatureConfig) => Promise<T>,
  fallback?: T
) => featureFlags.withFeature(featureKey, fn, fallback);

// Export feature keys as constants
export const FeatureKeys = {
  // AI/ML
  AI_RECOMMENDATIONS: 'ai_recommendations',
  AI_SMART_SCHEDULING: 'ai_smart_scheduling',
  VOICE_SEARCH: 'voice_search',
  IMAGE_SEARCH: 'image_search',
  SMART_NOTIFICATIONS: 'smart_notifications',

  // Shipping
  REAL_SHIPPING_RATES: 'real_shipping_rates',
  SHIPPING_LABEL_GENERATION: 'shipping_label_generation',
  SHIPMENT_TRACKING: 'shipment_tracking',
  ADDRESS_VALIDATION: 'address_validation',

  // Payment
  STRIPE_PAYMENTS: 'stripe_payments',
  STRIPE_CONNECT: 'stripe_connect',
  SUBSCRIPTION_BILLING: 'subscription_billing',
  PAYMENT_PLANS: 'payment_plans',

  // Communication
  EMAIL_NOTIFICATIONS: 'email_notifications',
  SMS_NOTIFICATIONS: 'sms_notifications',
  WHATSAPP_NOTIFICATIONS: 'whatsapp_notifications',
  PUSH_NOTIFICATIONS: 'push_notifications',

  // Analytics
  ADVANCED_ANALYTICS: 'advanced_analytics',
  BEHAVIOR_TRACKING: 'behavior_tracking',
  AB_TESTING: 'ab_testing',

  // Integration
  QUICKBOOKS_SYNC: 'quickbooks_sync',
  XERO_SYNC: 'xero_sync',
  CALENDAR_SYNC: 'calendar_sync',

  // Social
  SOCIAL_FEED: 'social_feed',
  GAMIFICATION: 'gamification',

  // Other
  FRAUD_DETECTION: 'fraud_detection',
  BACKGROUND_CHECKS: 'background_checks',
  PHONE_VERIFICATION: 'phone_verification',
} as const;

// React hook for feature flags
import { useState, useEffect } from 'react';

export function useFeatureFlag(featureKey: string) {
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<FeatureConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFeature() {
      try {
        const result = await featureFlags.checkAndGetConfig(featureKey);
        setEnabled(result.enabled);
        setConfig(result.config);
      } catch (error) {
        console.error('Error checking feature:', error);
        setEnabled(false);
        setConfig({});
      } finally {
        setLoading(false);
      }
    }

    checkFeature();
  }, [featureKey]);

  return { enabled, config, loading };
}

// React hook for multiple feature flags
export function useFeatureFlags(featureKeys: string[]) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFeatures() {
      try {
        const results = await Promise.all(
          featureKeys.map((key) => featureFlags.isEnabled(key))
        );

        const flagsMap: Record<string, boolean> = {};
        featureKeys.forEach((key, index) => {
          flagsMap[key] = results[index];
        });

        setFlags(flagsMap);
      } catch (error) {
        console.error('Error checking features:', error);
      } finally {
        setLoading(false);
      }
    }

    checkFeatures();
  }, [featureKeys.join(',')]);

  return { flags, loading };
}
