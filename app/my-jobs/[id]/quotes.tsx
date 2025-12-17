import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { QuoteComparisonCard } from '@/components/QuoteComparisonCard';
import { QuoteComparisonHeader, SortOption } from '@/components/QuoteComparisonHeader';
import { QuoteSideBySide } from '@/components/QuoteSideBySide';
import { QuoteDetailModal } from '@/components/QuoteDetailModal';
import { AcceptQuoteModal } from '@/components/AcceptQuoteModal';
import { acceptQuote, validateQuoteForAcceptance } from '@/lib/quote-acceptance';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Award,
  LayoutGrid,
  List,
} from 'lucide-react-native';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  execution_date_start: string;
  preferred_time: string;
}

interface Quote {
  id: string;
  price: number;
  status: string;
  created_at: string;
  provider: {
    id: string;
    full_name: string;
    rating_average: number;
    rating_count: number;
    total_bookings: number;
    bio: string;
  };
}

export default function JobQuotesScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sortedQuotes, setSortedQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('price_low');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [compareQuotes, setCompareQuotes] = useState<[Quote, Quote] | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [quoteToAccept, setQuoteToAccept] = useState<Quote | null>(null);

  useEffect(() => {
    fetchJobAndQuotes();
  }, [id]);

  useEffect(() => {
    sortQuotes();
  }, [quotes, sortBy]);

  const fetchJobAndQuotes = async () => {
    setLoading(true);

    const [jobResult, quotesResult] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase
        .from('bookings')
        .select(
          `
          id,
          price,
          status,
          created_at,
          provider:profiles!bookings_provider_id_fkey(
            id,
            full_name,
            rating_average,
            rating_count,
            total_bookings,
            bio
          )
        `
        )
        .eq('job_id', id)
        .eq('status', 'Requested')
        .order('created_at', { ascending: false }),
    ]);

    if (jobResult.data && !jobResult.error) {
      setJob(jobResult.data as any);
    }

    if (quotesResult.data && !quotesResult.error) {
      setQuotes(quotesResult.data as any);
    }

    setLoading(false);
  };

  const sortQuotes = () => {
    const sorted = [...quotes].sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'rating':
          return b.provider.rating_average - a.provider.rating_average;
        case 'experience':
          return b.provider.total_bookings - a.provider.total_bookings;
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
    setSortedQuotes(sorted);
  };

  const handleAcceptQuote = async (quoteId: string, providerId: string, price: number) => {
    if (!job || !profile) return;

    // Find the quote
    const quote = sortedQuotes.find((q) => q.id === quoteId);
    if (!quote) return;

    // Validate quote first
    const validation = await validateQuoteForAcceptance(quoteId);
    if (!validation.valid) {
      Alert.alert('Unable to Accept', validation.error || 'This quote is no longer valid.');
      return;
    }

    // Show acceptance modal
    setQuoteToAccept(quote);
    setAcceptModalVisible(true);
  };

  const confirmAcceptQuote = async () => {
    if (!quoteToAccept || !job || !profile) return;

    setAccepting(quoteToAccept.id);

    const result = await acceptQuote({
      quoteId: quoteToAccept.id,
      jobId: job.id,
      customerId: profile.id,
      providerId: quoteToAccept.provider.id,
      price: quoteToAccept.price,
      jobTitle: job.title,
    });

    setAccepting(null);
    setAcceptModalVisible(false);
    setQuoteToAccept(null);

    if (result.success) {
      Alert.alert(
        'Quote Accepted!',
        'Your booking has been confirmed. The provider has been notified and your payment is secured in escrow.',
        [
          {
            text: 'View Booking',
            onPress: () => router.push(`/booking/${result.bookingId}` as any),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to accept quote. Please try again.');
    }
  };

  const handleContactProvider = (providerId: string) => {
    Alert.alert(
      'Contact Provider',
      'Messaging feature coming soon! You can contact the provider after accepting their quote.',
      [{ text: 'OK' }]
    );
  };

  const handleViewProfile = (providerId: string) => {
    Alert.alert('View Profile', 'Provider profile coming soon!', [{ text: 'OK' }]);
  };

  const handleCompare = () => {
    if (selectedForComparison.length !== 2) {
      Alert.alert('Select Quotes', 'Please select exactly 2 quotes to compare.');
      return;
    }

    const quote1 = sortedQuotes.find((q) => q.id === selectedForComparison[0]);
    const quote2 = sortedQuotes.find((q) => q.id === selectedForComparison[1]);

    if (quote1 && quote2) {
      setCompareQuotes([quote1, quote2]);
    }
  };

  const toggleComparisonSelection = (quoteId: string) => {
    if (selectedForComparison.includes(quoteId)) {
      setSelectedForComparison(selectedForComparison.filter((id) => id !== quoteId));
    } else if (selectedForComparison.length < 2) {
      setSelectedForComparison([...selectedForComparison, quoteId]);
    } else {
      Alert.alert('Limit Reached', 'You can only compare 2 quotes at a time.');
    }
  };

  const getQuoteInsights = () => {
    if (sortedQuotes.length === 0) return { lowestPrice: null, highestRated: null, fastest: null };

    const lowestPrice = sortedQuotes.reduce((min, q) => (q.price < min.price ? q : min), sortedQuotes[0]);
    const highestRated = sortedQuotes.reduce(
      (max, q) => (q.provider.rating_average > max.provider.rating_average ? q : max),
      sortedQuotes[0]
    );
    const fastest = sortedQuotes.reduce(
      (earliest, q) => (new Date(q.created_at) < new Date(earliest.created_at) ? q : earliest),
      sortedQuotes[0]
    );

    return {
      lowestPrice: lowestPrice.id,
      highestRated: highestRated.id,
      fastest: fastest.id,
    };
  };

  const insights = getQuoteInsights();

  const handleViewQuoteDetails = (quote: Quote) => {
    setSelectedQuote(quote);
    setDetailModalVisible(true);
  };

  const renderQuoteCard = ({ item }: { item: Quote }) => (
    <TouchableOpacity onPress={() => handleViewQuoteDetails(item)}>
      <QuoteComparisonCard
        quote={item}
        isLowestPrice={item.id === insights.lowestPrice}
        isHighestRated={item.id === insights.highestRated}
        isFastest={item.id === insights.fastest}
        onAccept={() => handleAcceptQuote(item.id, item.provider.id, item.price)}
        onMessage={() => handleContactProvider(item.provider.id)}
        onViewProfile={() => handleViewProfile(item.provider.id)}
        accepting={accepting === item.id}
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading quotes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quotes</Text>
        <View style={styles.backButton} />
      </View>

      {job && (
        <View style={styles.jobSummary}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {new Date(job.execution_date_start).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{job.location}</Text>
            </View>
          </View>
        </View>
      )}

      {sortedQuotes.length > 0 ? (
        <>
          <QuoteComparisonHeader
            totalQuotes={sortedQuotes.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
          <FlatList
            data={sortedQuotes}
            renderItem={renderQuoteCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Award size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No quotes yet</Text>
          <Text style={styles.emptyText}>
            Providers will submit quotes for your job. Check back soon!
          </Text>
        </View>
      )}

      {compareQuotes && (
        <Modal visible transparent animationType="fade">
          <QuoteSideBySide
            quotes={compareQuotes}
            onClose={() => setCompareQuotes(null)}
            onSelect={(quoteId) => {
              setCompareQuotes(null);
              const quote = sortedQuotes.find((q) => q.id === quoteId);
              if (quote) {
                handleAcceptQuote(quoteId, quote.provider.id, quote.price);
              }
            }}
          />
        </Modal>
      )}

      <QuoteDetailModal
        visible={detailModalVisible}
        quote={selectedQuote}
        jobTitle={job?.title}
        jobLocation={job?.location}
        jobDate={
          job?.execution_date_start
            ? new Date(job.execution_date_start).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : undefined
        }
        isLowestPrice={selectedQuote?.id === insights.lowestPrice}
        isHighestRated={selectedQuote?.id === insights.highestRated}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedQuote(null);
        }}
        onAccept={() => {
          if (selectedQuote) {
            setDetailModalVisible(false);
            handleAcceptQuote(selectedQuote.id, selectedQuote.provider.id, selectedQuote.price);
          }
        }}
        onMessage={() => {
          if (selectedQuote) {
            handleContactProvider(selectedQuote.provider.id);
          }
        }}
        onViewProfile={() => {
          if (selectedQuote) {
            handleViewProfile(selectedQuote.provider.id);
          }
        }}
        accepting={selectedQuote ? accepting === selectedQuote.id : false}
      />

      <AcceptQuoteModal
        visible={acceptModalVisible}
        quote={quoteToAccept}
        job={job}
        onClose={() => {
          setAcceptModalVisible(false);
          setQuoteToAccept(null);
        }}
        onConfirm={confirmAcceptQuote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  jobSummary: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobTitle: {
    fontSize: fontSize.lg,
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
  listContainer: {
    padding: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
