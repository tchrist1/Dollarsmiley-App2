import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Code, Key, BookOpen, Zap, Package, Terminal, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { getApiKeys, getApiUsage } from '@/lib/developer-portal';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  environment: 'production' | 'development';
  created_at: string;
  last_used_at?: string;
}

interface ApiUsage {
  total_requests: number;
  requests_today: number;
  rate_limit: number;
  rate_limit_remaining: number;
}

export default function DeveloperPortalScreen() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [keys, usageData] = await Promise.all([
      getApiKeys(),
      getApiUsage()
    ]);
    setApiKeys(keys);
    setUsage(usageData);
    setLoading(false);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
    }
  };

  const maskApiKey = (key: string) => {
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  const quickLinks = [
    {
      icon: BookOpen,
      title: 'API Documentation',
      description: 'Complete API reference',
      route: '/developer/documentation'
    },
    {
      icon: Code,
      title: 'Code Examples',
      description: 'Sample code & tutorials',
      route: '/developer/examples'
    },
    {
      icon: Package,
      title: 'SDKs',
      description: 'Client libraries',
      route: '/developer/sdks'
    },
    {
      icon: Terminal,
      title: 'API Console',
      description: 'Test API calls',
      route: '/developer/console'
    },
    {
      icon: Key,
      title: 'API Keys',
      description: 'Manage your keys',
      route: '/developer/keys'
    },
    {
      icon: Zap,
      title: 'Webhooks',
      description: 'Event notifications',
      route: '/developer/webhooks'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Developer Portal</Text>
        <Text style={styles.subtitle}>Build amazing integrations with our API</Text>
      </View>

      {usage && (
        <View style={styles.usageCard}>
          <Text style={styles.cardTitle}>API Usage</Text>
          <View style={styles.usageGrid}>
            <View style={styles.usageStat}>
              <Text style={styles.statValue}>{usage.requests_today}</Text>
              <Text style={styles.statLabel}>Requests Today</Text>
            </View>
            <View style={styles.usageStat}>
              <Text style={styles.statValue}>{usage.total_requests}</Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </View>
            <View style={styles.usageStat}>
              <Text style={styles.statValue}>{usage.rate_limit_remaining}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.usageStat}>
              <Text style={styles.statValue}>{usage.rate_limit}</Text>
              <Text style={styles.statLabel}>Rate Limit</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
        </View>
        <View style={styles.quickLinks}>
          {quickLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickLink}
              onPress={() => router.push(link.route as any)}
            >
              <link.icon size={24} color={colors.primary} />
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>{link.title}</Text>
                <Text style={styles.quickLinkDescription}>{link.description}</Text>
              </View>
              <ExternalLink size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {apiKeys.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your API Keys</Text>
            <TouchableOpacity onPress={() => router.push('/developer/keys')}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {apiKeys.slice(0, 2).map((key) => (
            <View key={key.id} style={styles.keyCard}>
              <View style={styles.keyHeader}>
                <View>
                  <Text style={styles.keyName}>{key.name}</Text>
                  <Text style={styles.keyEnvironment}>{key.environment}</Text>
                </View>
                <View style={styles.keyActions}>
                  <TouchableOpacity
                    onPress={() => toggleKeyVisibility(key.id)}
                    style={styles.keyAction}
                  >
                    {visibleKeys.has(key.id) ? (
                      <EyeOff size={20} color={colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(key.key)}
                    style={styles.keyAction}
                  >
                    <Copy size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.keyValue}>
                <Text style={styles.keyText} selectable>
                  {visibleKeys.has(key.id) ? key.key : maskApiKey(key.key)}
                </Text>
              </View>
              {key.last_used_at && (
                <Text style={styles.keyLastUsed}>
                  Last used: {new Date(key.last_used_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Getting Started</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeTitle}>Install SDK</Text>
          <Text style={styles.code}>npm install @dollarsmiley/sdk</Text>
        </View>
        <View style={styles.codeBlock}>
          <Text style={styles.codeTitle}>Initialize</Text>
          <Text style={styles.code}>
            {`import DollarsmileySDK from '@dollarsmiley/sdk';\n\nconst client = new DollarsmileySDK({\n  apiKey: 'YOUR_API_KEY'\n});`}
          </Text>
        </View>
        <View style={styles.codeBlock}>
          <Text style={styles.codeTitle}>Make Your First Request</Text>
          <Text style={styles.code}>
            {`const listings = await client.listings.list({\n  category: 'photography',\n  location: 'New York'\n});`}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resources</Text>
        <View style={styles.resources}>
          <TouchableOpacity style={styles.resource}>
            <BookOpen size={20} color={colors.primary} />
            <Text style={styles.resourceText}>API Reference</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resource}>
            <Code size={20} color={colors.primary} />
            <Text style={styles.resourceText}>Code Examples</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resource}>
            <Terminal size={20} color={colors.primary} />
            <Text style={styles.resourceText}>API Console</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resource}>
            <ExternalLink size={20} color={colors.primary} />
            <Text style={styles.resourceText}>GitHub</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.white,
    opacity: 0.9,
  },
  usageCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  usageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  usageStat: {
    width: '50%',
    padding: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sectionLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  quickLinks: {
    gap: spacing.md,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  quickLinkContent: {
    flex: 1,
  },
  quickLinkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  quickLinkDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  keyCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  keyName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  keyEnvironment: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  keyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  keyAction: {
    padding: spacing.xs,
  },
  keyValue: {
    padding: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  keyText: {
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text,
  },
  keyLastUsed: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeBlock: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  code: {
    fontSize: fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.text,
  },
  resources: {
    gap: spacing.sm,
  },
  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  resourceText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
});
