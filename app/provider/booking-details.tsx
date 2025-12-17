import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { EscrowStatus } from '@/components/EscrowStatus';
import { EscrowActions } from '@/components/EscrowActions';
import { quickAwardXP } from '@/lib/gamification';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  PlayCircle,
  FileText,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import EscrowService from '@/lib/escrow';

interface BookingDetails {
  id: string;
  title: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  price: number;
  status: string;
  payment_status: string;
  escrow_status: string;
  customer_id: string;
  provider_id: string;
  customer: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  created_at: string;
}

export default function ProviderBookingDetailsScreen() {
  const { bookingId } = useLocalSearchParams();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [escrowHold, setEscrowHold] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);

      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select(
          `
          *,
          customer:profiles!bookings_customer_id_fkey(
            full_name,
            email,
            phone,
            avatar_url
          )
        `
        )
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      setBooking(bookingData as any);

      const escrow = await EscrowService.getEscrowHold(bookingId as string);
      setEscrowHold(escrow);
    } catch (error) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async () => {
    Alert.alert('Accept Booking', 'Are you sure you want to accept this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            setProcessing(true);

            const { error } = await supabase
              .from('bookings')
              .update({
                status: 'Confirmed',
                provider_response_deadline: null,
              })
              .eq('id', bookingId);

            if (error) throw error;

            await supabase.from('notifications').insert({
              user_id: booking!.customer_id,
              type: 'booking_confirmed',
              title: 'Booking Confirmed',
              message: `Your booking for ${booking!.title} has been confirmed`,
              data: { booking_id: bookingId },
            });

            if (profile) {
              await quickAwardXP.bookingAccepted(profile.id, bookingId as string);
            }

            Alert.alert('Success', 'Booking accepted! +15 XP earned');
            fetchBookingDetails();
          } catch (error) {
            Alert.alert('Error', 'Failed to accept booking');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleDeclineBooking = async () => {
    Alert.alert('Decline Booking', 'Are you sure you want to decline this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            setProcessing(true);

            const { error } = await supabase
              .from('bookings')
              .update({
                status: 'Cancelled',
                cancellation_reason: 'Declined by provider',
                cancelled_at: new Date().toISOString(),
              })
              .eq('id', bookingId);

            if (error) throw error;

            await supabase.from('notifications').insert({
              user_id: booking!.customer_id,
              type: 'booking_cancelled',
              title: 'Booking Cancelled',
              message: `Your booking for ${booking!.title} has been cancelled`,
              data: { booking_id: bookingId },
            });

            Alert.alert('Success', 'Booking declined');
            router.back();
          } catch (error) {
            Alert.alert('Error', 'Failed to decline booking');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleStartService = async () => {
    try {
      setProcessing(true);

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'InProgress' })
        .eq('id', bookingId);

      if (error) throw error;

      Alert.alert('Success', 'Service started');
      fetchBookingDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to start service');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteService = async () => {
    Alert.alert(
      'Complete Service',
      'Mark this service as completed? Escrow funds will be released to your wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setProcessing(true);

              const { error } = await supabase
                .from('bookings')
                .update({
                  status: 'Completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

              if (error) throw error;

              if (escrowHold) {
                await EscrowService.releaseEscrow(escrowHold.id, bookingId as string);
              }

              await supabase.from('notifications').insert({
                user_id: booking!.customer_id,
                type: 'booking_completed',
                title: 'Service Completed',
                message: `${booking!.title} has been completed. Please leave a review!`,
                data: { booking_id: bookingId },
              });

              Alert.alert('Success', 'Service completed and payment released');
              fetchBookingDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to complete service');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  const providerEarnings = booking.price * 0.9;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Booking Status</Text>
          <Text style={[styles.statusValue, { color: colors.primary }]}>{booking.status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <User size={24} color={colors.white} />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{booking.customer.full_name}</Text>
                <Text style={styles.customerEmail}>{booking.customer.email}</Text>
              </View>
            </View>

            <View style={styles.customerActions}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => router.push(`/chat/${booking.customer_id}`)}
              >
                <MessageCircle size={20} color={colors.primary} />
                <Text style={styles.contactButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.detailsCard}>
            <Text style={styles.serviceTitle}>{booking.title}</Text>
            {booking.description && (
              <Text style={styles.serviceDescription}>{booking.description}</Text>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Calendar size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Clock size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{booking.scheduled_time}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MapPin size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{booking.location}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Amount</Text>
              <Text style={styles.paymentValue}>${booking.price.toFixed(2)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Platform Fee (10%)</Text>
              <Text style={styles.paymentValue}>-${(booking.price * 0.1).toFixed(2)}</Text>
            </View>
            <View style={[styles.paymentRow, styles.paymentRowTotal]}>
              <Text style={styles.paymentLabelTotal}>Your Earnings</Text>
              <Text style={styles.paymentValueTotal}>${providerEarnings.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {escrowHold && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escrow Protection</Text>
            <EscrowStatus bookingId={booking.id} userRole="provider" />
            {escrowHold.status === 'Held' && booking.status === 'Completed' && (
              <EscrowActions
                bookingId={booking.id}
                escrowHoldId={escrowHold.id}
                escrowStatus={escrowHold.status}
                amount={booking.price}
                userRole="provider"
                customerId={booking.customer_id}
                providerId={booking.provider_id}
                onActionComplete={fetchBookingDetails}
              />
            )}
          </View>
        )}

        <View style={styles.actionsSection}>
          {booking.status === 'PendingApproval' && (
            <>
              <Button
                title="Accept Booking"
                onPress={handleAcceptBooking}
                loading={processing}
                icon={<CheckCircle size={20} color={colors.white} />}
              />
              <Button
                title="Decline Booking"
                onPress={handleDeclineBooking}
                loading={processing}
                variant="outline"
                icon={<XCircle size={20} color={colors.error} />}
              />
            </>
          )}

          {booking.status === 'Confirmed' && (
            <Button
              title="Start Service"
              onPress={handleStartService}
              loading={processing}
              icon={<PlayCircle size={20} color={colors.white} />}
            />
          )}

          {booking.status === 'InProgress' && (
            <Button
              title="Mark as Completed"
              onPress={handleCompleteService}
              loading={processing}
              icon={<CheckCircle size={20} color={colors.white} />}
            />
          )}
        </View>
      </ScrollView>
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
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
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
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: colors.primary + '10',
    padding: spacing.lg,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  customerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customerEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  customerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  serviceTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  paymentRowTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  paymentLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  paymentValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  paymentLabelTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  paymentValueTotal: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  actionsSection: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
