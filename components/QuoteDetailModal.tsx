import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Linking,
} from 'react-native';
import {
  X,
  Star,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  Calendar,
  Award,
  Shield,
  TrendingUp,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  Briefcase,
  Users,
  ThumbsUp,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { Button } from './Button';

interface Provider {
  id: string;
  full_name: string;
  rating_average: number;
  rating_count: number;
  total_bookings: number;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  member_since?: string;
  response_rate?: number;
  response_time?: number;
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  verified_identity?: boolean;
  verified_business?: boolean;
  verified_background?: boolean;
}

interface Quote {
  id: string;
  price: number;
  estimated_duration?: number;
  estimated_duration_unit?: 'hours' | 'days' | 'weeks';
  notes?: string;
  includes?: string[];
  excludes?: string[];
  terms?: string;
  valid_until?: string;
  deposit_required?: number;
  deposit_percentage?: number;
  created_at: string;
  provider: Provider;
}

interface QuoteDetailModalProps {
  visible: boolean;
  quote: Quote | null;
  jobTitle?: string;
  jobLocation?: string;
  jobDate?: string;
  isLowestPrice?: boolean;
  isHighestRated?: boolean;
  onClose: () => void;
  onAccept: () => void;
  onMessage: () => void;
  onViewProfile: () => void;
  accepting?: boolean;
}

export function QuoteDetailModal({
  visible,
  quote,
  jobTitle,
  jobLocation,
  jobDate,
  isLowestPrice,
  isHighestRated,
  onClose,
  onAccept,
  onMessage,
  onViewProfile,
  accepting,
}: QuoteDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'provider' | 'reviews'>('overview');

  if (!quote) return null;

  const hasVerifications =
    quote.provider.verified_identity ||
    quote.provider.verified_business ||
    quote.provider.verified_background;
  const isExperienced = quote.provider.total_bookings > 50;
  const isTopRated = quote.provider.rating_average >= 4.8;

  const depositAmount = quote.deposit_required
    ? quote.deposit_required
    : quote.deposit_percentage
    ? (quote.price * quote.deposit_percentage) / 100
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'provider', label: 'Provider' },
    { id: 'reviews', label: 'Reviews' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Quote Details</Text>
            <Text style={styles.headerSubtitle}>{quote.provider.full_name}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* Job Summary */}
              {jobTitle && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Job Request</Text>
                  <View style={styles.jobCard}>
                    <Text style={styles.jobTitle}>{jobTitle}</Text>
                    <View style={styles.jobMeta}>
                      {jobDate && (
                        <View style={styles.metaItem}>
                          <Calendar size={14} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{jobDate}</Text>
                        </View>
                      )}
                      {jobLocation && (
                        <View style={styles.metaItem}>
                          <MapPin size={14} color={colors.textSecondary} />
                          <Text style={styles.metaText}>{jobLocation}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Price Breakdown */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price Breakdown</Text>
                <View style={styles.priceCard}>
                  <View style={styles.priceHeader}>
                    <View style={styles.priceRow}>
                      <DollarSign size={32} color={colors.primary} />
                      <Text style={styles.priceAmount}>${Math.round(quote.price).toLocaleString('en-US')}</Text>
                    </View>
                    {isLowestPrice && (
                      <View style={styles.bestPriceBadge}>
                        <Text style={styles.bestPriceText}>Best Price</Text>
                      </View>
                    )}
                  </View>

                  {quote.estimated_duration && (
                    <View style={styles.durationRow}>
                      <Clock size={16} color={colors.textSecondary} />
                      <Text style={styles.durationText}>
                        Estimated: {quote.estimated_duration} {quote.estimated_duration_unit || 'hours'}
                      </Text>
                    </View>
                  )}

                  {depositAmount > 0 && (
                    <View style={styles.depositRow}>
                      <AlertCircle size={16} color={colors.warning} />
                      <Text style={styles.depositText}>
                        Deposit Required: ${depositAmount.toFixed(2)}
                        {quote.deposit_percentage && ` (${quote.deposit_percentage}%)`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* What's Included */}
              {quote.includes && quote.includes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>What's Included</Text>
                  <View style={styles.listCard}>
                    {quote.includes.map((item, index) => (
                      <View key={index} style={styles.listItem}>
                        <CheckCircle size={16} color={colors.success} />
                        <Text style={styles.listText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* What's Not Included */}
              {quote.excludes && quote.excludes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Not Included</Text>
                  <View style={styles.listCard}>
                    {quote.excludes.map((item, index) => (
                      <View key={index} style={styles.listItem}>
                        <X size={16} color={colors.error} />
                        <Text style={[styles.listText, styles.listTextExclude]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Provider Notes */}
              {quote.notes && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Provider Notes</Text>
                  <View style={styles.notesCard}>
                    <FileText size={20} color={colors.textSecondary} />
                    <Text style={styles.notesText}>{quote.notes}</Text>
                  </View>
                </View>
              )}

              {/* Terms & Conditions */}
              {quote.terms && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                  <View style={styles.termsCard}>
                    <Text style={styles.termsText}>{quote.terms}</Text>
                  </View>
                </View>
              )}

              {/* Quote Validity */}
              <View style={styles.section}>
                <View style={styles.validityCard}>
                  <Clock size={16} color={colors.textLight} />
                  <Text style={styles.validityText}>
                    Quote sent on {new Date(quote.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {quote.valid_until && (
                    <Text style={styles.validityText}>
                      Valid until {new Date(quote.valid_until).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Provider Tab */}
          {activeTab === 'provider' && (
            <View style={styles.tabContent}>
              {/* Provider Header */}
              <View style={styles.section}>
                <View style={styles.providerHeader}>
                  <View style={styles.providerAvatar}>
                    {quote.provider.avatar_url ? (
                      <Image
                        source={{ uri: quote.provider.avatar_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {quote.provider.full_name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{quote.provider.full_name}</Text>
                    {quote.provider.member_since && (
                      <Text style={styles.memberSince}>
                        Member since {new Date(quote.provider.member_since).getFullYear()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={styles.section}>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Star size={24} color={colors.warning} fill={colors.warning} />
                    <Text style={styles.statValue}>
                      {quote.provider.rating_average.toFixed(1)}
                    </Text>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Briefcase size={24} color={colors.primary} />
                    <Text style={styles.statValue}>{quote.provider.total_bookings}</Text>
                    <Text style={styles.statLabel}>Jobs Done</Text>
                  </View>
                  <View style={styles.statCard}>
                    <ThumbsUp size={24} color={colors.success} />
                    <Text style={styles.statValue}>
                      {quote.provider.response_rate || 95}%
                    </Text>
                    <Text style={styles.statLabel}>Response Rate</Text>
                  </View>
                </View>
              </View>

              {/* Badges */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recognition</Text>
                <View style={styles.badgeGrid}>
                  {isTopRated && (
                    <View style={styles.recognitionBadge}>
                      <Award size={20} color={colors.warning} />
                      <Text style={styles.recognitionText}>Top Rated</Text>
                    </View>
                  )}
                  {isExperienced && (
                    <View style={styles.recognitionBadge}>
                      <TrendingUp size={20} color={colors.primary} />
                      <Text style={styles.recognitionText}>Experienced</Text>
                    </View>
                  )}
                  {quote.provider.response_time && quote.provider.response_time < 60 && (
                    <View style={styles.recognitionBadge}>
                      <Clock size={20} color={colors.success} />
                      <Text style={styles.recognitionText}>Quick Responder</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Verifications */}
              {hasVerifications && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Verifications</Text>
                  <View style={styles.verificationList}>
                    {quote.provider.verified_identity && (
                      <View style={styles.verificationItem}>
                        <Shield size={20} color={colors.success} />
                        <Text style={styles.verificationText}>Identity Verified</Text>
                        <CheckCircle size={16} color={colors.success} />
                      </View>
                    )}
                    {quote.provider.verified_business && (
                      <View style={styles.verificationItem}>
                        <Briefcase size={20} color={colors.success} />
                        <Text style={styles.verificationText}>Business Verified</Text>
                        <CheckCircle size={16} color={colors.success} />
                      </View>
                    )}
                    {quote.provider.verified_background && (
                      <View style={styles.verificationItem}>
                        <Shield size={20} color={colors.success} />
                        <Text style={styles.verificationText}>Background Check</Text>
                        <CheckCircle size={16} color={colors.success} />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Bio */}
              {quote.provider.bio && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <View style={styles.bioCard}>
                    <Text style={styles.bioText}>{quote.provider.bio}</Text>
                  </View>
                </View>
              )}

              {/* Specialties */}
              {quote.provider.specialties && quote.provider.specialties.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Specialties</Text>
                  <View style={styles.tagContainer}>
                    {quote.provider.specialties.map((specialty, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Contact Options */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact</Text>
                <View style={styles.contactList}>
                  <TouchableOpacity style={styles.contactItem} onPress={onMessage}>
                    <MessageCircle size={20} color={colors.primary} />
                    <Text style={styles.contactText}>Send Message</Text>
                    <ExternalLink size={16} color={colors.textLight} />
                  </TouchableOpacity>
                  {quote.provider.phone && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => Linking.openURL(`tel:${quote.provider.phone}`)}
                    >
                      <Phone size={20} color={colors.success} />
                      <Text style={styles.contactText}>{quote.provider.phone}</Text>
                      <ExternalLink size={16} color={colors.textLight} />
                    </TouchableOpacity>
                  )}
                  {quote.provider.email && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => Linking.openURL(`mailto:${quote.provider.email}`)}
                    >
                      <Mail size={20} color={colors.warning} />
                      <Text style={styles.contactText}>{quote.provider.email}</Text>
                      <ExternalLink size={16} color={colors.textLight} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <View style={styles.tabContent}>
              <View style={styles.section}>
                <View style={styles.ratingOverview}>
                  <View style={styles.ratingScore}>
                    <Text style={styles.ratingNumber}>
                      {quote.provider.rating_average.toFixed(1)}
                    </Text>
                    <View style={styles.ratingStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={20}
                          color={
                            i < Math.round(quote.provider.rating_average)
                              ? colors.warning
                              : colors.border
                          }
                          fill={
                            i < Math.round(quote.provider.rating_average)
                              ? colors.warning
                              : 'transparent'
                          }
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingCount}>
                      Based on {quote.provider.rating_count} reviews
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.emptyReviewsText}>
                  Reviews will be displayed here. Full review integration coming soon.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onViewProfile}>
            <Text style={styles.secondaryButtonText}>View Full Profile</Text>
          </TouchableOpacity>
          <Button
            title={accepting ? 'Accepting...' : 'Accept Quote'}
            onPress={onAccept}
            loading={accepting}
            style={styles.acceptButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  jobCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  jobMeta: {
    flexDirection: 'row',
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
  priceCard: {
    padding: spacing.lg,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary + '20',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  bestPriceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  bestPriceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
  },
  depositText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  listText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  listTextExclude: {
    color: colors.textSecondary,
  },
  notesCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  termsCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  termsText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  validityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  validityText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  providerAvatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memberSince: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recognitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recognitionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  verificationList: {
    gap: spacing.sm,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  verificationText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  bioCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  bioText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  contactList: {
    gap: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  ratingOverview: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  ratingScore: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ratingCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyReviewsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  acceptButton: {
    flex: 1,
  },
});
