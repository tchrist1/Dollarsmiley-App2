import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import DisputeManager from '@/components/DisputeManager';
import { AddToCalendarButton } from '@/components/AddToCalendarButton';
import { RescheduleBookingModal } from '@/components/RescheduleBookingModal';
import OrderFulfillmentCard from '@/components/OrderFulfillmentCard';
import OrderCommunicationThread from '@/components/OrderCommunicationThread';
import CommunicationPanel from '@/components/CommunicationPanel';
import CommunicationHistory from '@/components/CommunicationHistory';
import ConsultationRequestCard from '@/components/ConsultationRequestCard';
import PriceAdjustmentCard from '@/components/PriceAdjustmentCard';
import { syncBookingToCalendar } from '@/lib/calendar';
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  User,
  Star,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Shield,
  Car,
  Navigation,
} from 'lucide-react-native';

interface Booking {
  id: string;
  title: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  price: number;
  status: string;
  payment_status: string;
  created_at: string;
  completed_at: string | null;
  customer_id: string;
  provider_id: string;
  calendar_event_id?: string;
  order_type?: string;
  production_order_id?: string;
  consultation_required?: boolean;
  consultation_requested?: boolean;
  escrow_amount?: number;
  customer: {
    full_name: string;
    rating_average: number;
    rating_count: number;
  };
  provider: {
    full_name: string;
    rating_average: number;
    rating_count: number;
    phone: string;
  };
}

interface Consultation {
  id: string;
  status: string;
  requested_by: string;
  started_at?: string;
  completed_at?: string;
  waived_at?: string;
  timeout_at?: string;
}

interface PriceAdjustment {
  id: string;
  original_price: number;
  adjusted_price: number;
  adjustment_amount: number;
  adjustment_type: 'increase' | 'decrease';
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  response_deadline?: string;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [priceAdjustment, setPriceAdjustment] = useState<PriceAdjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        customer:profiles!bookings_customer_id_fkey(full_name, rating_average, rating_count),
        provider:profiles!bookings_provider_id_fkey(full_name, rating_average, rating_count, phone),
        order_items(*),
        shipment:shipments(*),
        shipping_address:shipping_addresses(*)
      `
      )
      .eq('id', id)
      .single();

    if (data && !error) {
      setBooking(data as any);

      if (data.production_order_id || data.order_type === 'CustomService') {
        const orderIdToUse = data.production_order_id || data.id;

        const { data: consultationData } = await supabase
          .from('custom_service_consultations')
          .select('*')
          .eq('production_order_id', orderIdToUse)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (consultationData) {
          setConsultation(consultationData);
        }

        const { data: adjustmentData } = await supabase
          .from('price_adjustments')
          .select('*')
          .eq('production_order_id', orderIdToUse)
          .eq('status', 'pending')
          .maybeSingle();

        if (adjustmentData) {
          setPriceAdjustment(adjustmentData);
        }
      }
    }

    setLoading(false);
  };

  const isCustomer = profile?.id === booking?.customer_id;
  const isProvider = profile?.id === booking?.provider_id;

  const handleAcceptBooking = async () => {
    if (!booking || !isProvider) return;

    Alert.alert('Accept Booking', 'Confirm this booking with the customer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setUpdating(true);
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'Accepted' })
            .eq('id', booking.id);

          setUpdating(false);

          if (error) {
            Alert.alert('Error', 'Failed to accept booking. Please try again.');
          } else {
            Alert.alert('Success', 'Booking accepted! Customer will be notified.');
            fetchBookingDetails();
          }
        },
      },
    ]);
  };

  const handleStartService = async () => {
    if (!booking || !isProvider) return;

    Alert.alert('Start Service', 'Mark this booking as in progress?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          setUpdating(true);
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'InProgress' })
            .eq('id', booking.id);

          setUpdating(false);

          if (error) {
            Alert.alert('Error', 'Failed to update status. Please try again.');
          } else {
            Alert.alert('Success', 'Service started! Good luck!');
            fetchBookingDetails();
          }
        },
      },
    ]);
  };

  const handleCompleteService = async () => {
    if (!booking || !isProvider) return;

    Alert.alert(
      'Complete Service',
      'Mark this service as completed? Customer will be charged and you will receive payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setUpdating(true);
            const { error } = await supabase
              .from('bookings')
              .update({
                status: 'Completed',
                completed_at: new Date().toISOString(),
                payment_status: 'Released',
              })
              .eq('id', booking.id);

            setUpdating(false);

            if (error) {
              Alert.alert('Error', 'Failed to complete booking. Please try again.');
            } else {
              Alert.alert(
                'Service Completed!',
                'Payment has been processed. Thank you for using Dollarsmiley!',
                [
                  {
                    text: 'OK',
                    onPress: () => fetchBookingDetails(),
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);

            try {
              const { error: updateError } = await supabase
                .from('bookings')
                .update({ status: 'Cancelled' })
                .eq('id', booking.id);

              if (updateError) throw updateError;

              if (booking.calendar_event_id) {
                const providerName = isCustomer
                  ? booking.provider.full_name
                  : booking.customer.full_name;

                const syncResult = await syncBookingToCalendar(
                  { ...booking, status: 'Cancelled' },
                  providerName
                );

                if (syncResult.success && syncResult.action === 'deleted') {
                  Alert.alert(
                    'Booking Cancelled',
                    'This booking has been cancelled and removed from your calendar.'
                  );
                } else {
                  Alert.alert(
                    'Booking Cancelled',
                    'This booking has been cancelled. You may need to manually remove it from your calendar.'
                  );
                }
              } else {
                Alert.alert('Booking Cancelled', 'This booking has been cancelled.');
              }

              fetchBookingDetails();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveReview = () => {
    if (!booking) return;
    router.push(`/review/${booking.id}` as any);
  };

  const handleMessage = () => {
    if (!booking) return;
    router.push(`/chat/${booking.id}` as any);
  };

  const handleCalendarEventCreated = async (eventId: string) => {
    if (!booking) return;

    const { error } = await supabase
      .from('bookings')
      .update({ calendar_event_id: eventId })
      .eq('id', booking.id);

    if (!error) {
      setBooking({ ...booking, calendar_event_id: eventId });
    }
  };

  const handleStartConsultation = async () => {
    if (!consultation) return;
    setConsultationLoading(true);

    const { error } = await supabase
      .from('custom_service_consultations')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', consultation.id);

    if (!error) {
      router.push(`/call/video?orderId=${booking?.production_order_id || booking?.id}&consultationId=${consultation.id}` as any);
    }

    setConsultationLoading(false);
    fetchBookingDetails();
  };

  const handleCompleteConsultation = async () => {
    if (!consultation) return;
    setConsultationLoading(true);

    const result = await CustomServicePayments.completeConsultation(consultation.id);

    if (result.success) {
      Alert.alert('Success', 'Consultation completed successfully');
      fetchBookingDetails();
    } else {
      Alert.alert('Error', result.error || 'Failed to complete consultation');
    }

    setConsultationLoading(false);
  };

  const handleWaiveConsultation = async () => {
    if (!booking || !profile?.id) return;

    Alert.alert(
      'Waive Consultation',
      'Are you sure you want to waive the consultation requirement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Waive',
          onPress: async () => {
            setConsultationLoading(true);
            const orderIdToUse = booking.production_order_id || booking.id;
            const result = await CustomServicePayments.waiveConsultation(orderIdToUse, profile.id);

            if (result.success) {
              Alert.alert('Success', 'Consultation requirement waived');
              fetchBookingDetails();
            } else {
              Alert.alert('Error', result.error || 'Failed to waive consultation');
            }
            setConsultationLoading(false);
          },
        },
      ]
    );
  };

  const parseBookingDateTime = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    date.setHours(hour24, minutes, 0, 0);
    return date;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requested':
        return colors.warning;
      case 'Accepted':
        return colors.success;
      case 'InProgress':
        return colors.primary;
      case 'Completed':
        return colors.success;
      case 'Cancelled':
        return colors.error;
      case 'Disputed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Requested':
        return <Clock size={20} color={colors.warning} />;
      case 'Accepted':
        return <CheckCircle size={20} color={colors.success} />;
      case 'InProgress':
        return <Package size={20} color={colors.primary} />;
      case 'Completed':
        return <CheckCircle size={20} color={colors.success} />;
      case 'Cancelled':
        return <XCircle size={20} color={colors.error} />;
      case 'Disputed':
        return <AlertCircle size={20} color={colors.error} />;
      default:
        return <AlertCircle size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Requested':
        return 'Pending Provider Approval';
      case 'Accepted':
        return 'Confirmed';
      case 'InProgress':
        return 'Service In Progress';
      case 'Completed':
        return 'Completed';
      case 'Cancelled':
        return 'Cancelled';
      case 'Disputed':
        return 'Disputed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorText}>Booking not found</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack('/bookings')}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
          <MessageCircle size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            {getStatusIcon(booking.status)}
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {getStatusText(booking.status)}
            </Text>
          </View>
          {booking.payment_status && (
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentText}>Payment: {booking.payment_status}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.bookingTitle}>{booking.title}</Text>
          {booking.description && (
            <Text style={styles.bookingDescription}>{booking.description}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Calendar size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Clock size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{booking.scheduled_time}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{booking.location}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <DollarSign size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.priceValue}>{formatCurrency(booking.price)}</Text>
              </View>
            </View>
          </View>
        </View>

        {(booking.status === 'Accepted' || booking.status === 'InProgress') && !booking.calendar_event_id && (
          <View style={styles.section}>
            <AddToCalendarButton
              bookingId={booking.id}
              serviceName={booking.title}
              providerName={isCustomer ? booking.provider.full_name : booking.customer.full_name}
              startDate={parseBookingDateTime(booking.scheduled_date, booking.scheduled_time)}
              endDate={
                new Date(
                  parseBookingDateTime(booking.scheduled_date, booking.scheduled_time).getTime() +
                    2 * 60 * 60 * 1000
                )
              }
              location={booking.location}
              price={booking.price}
              onSuccess={handleCalendarEventCreated}
              variant="outline"
              fullWidth
            />
          </View>
        )}

        {booking.calendar_event_id && (
          <View style={styles.calendarAddedBanner}>
            <Calendar size={16} color={colors.success} />
            <Text style={styles.calendarAddedText}>Added to your calendar</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isCustomer ? 'Provider' : 'Customer'}</Text>
          <View style={styles.personCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(isCustomer ? booking.provider.full_name : booking.customer.full_name)
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>
                {isCustomer ? booking.provider.full_name : booking.customer.full_name}
              </Text>
              {(isCustomer ? booking.provider.rating_count : booking.customer.rating_count) > 0 && (
                <View style={styles.ratingRow}>
                  <Star size={14} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.ratingText}>
                    {(isCustomer
                      ? booking.provider.rating_average
                      : booking.customer.rating_average
                    ).toFixed(1)}{' '}
                    (
                    {isCustomer ? booking.provider.rating_count : booking.customer.rating_count}{' '}
                    reviews)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {(booking.order_type === 'CustomService' || booking.production_order_id) && booking.escrow_amount && (
          <View style={styles.escrowSection}>
            <View style={styles.escrowHeader}>
              <Shield size={20} color={colors.success} />
              <Text style={styles.escrowTitle}>Payment Protected</Text>
            </View>
            <Text style={styles.escrowDescription}>
              Your payment is held securely in escrow until the order is complete
            </Text>
            <View style={styles.escrowPriceRow}>
              <Text style={styles.escrowPriceLabel}>Escrow Amount</Text>
              <Text style={styles.escrowPriceValue}>{formatCurrency(booking.escrow_amount)}</Text>
            </View>
          </View>
        )}

        {consultation && (booking.consultation_required || booking.consultation_requested) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consultation</Text>
            <ConsultationRequestCard
              consultation={consultation}
              isProvider={isProvider}
              onStartConsultation={handleStartConsultation}
              onCompleteConsultation={handleCompleteConsultation}
              onWaiveConsultation={handleWaiveConsultation}
              onOpenChat={handleMessage}
              loading={consultationLoading}
            />
          </View>
        )}

        {(booking.order_type === 'CustomService' || booking.production_order_id) && (
          <View style={styles.section}>
            <PriceAdjustmentCard
              adjustment={priceAdjustment || undefined}
              isProvider={isProvider}
              orderId={booking.production_order_id || booking.id}
              currentPrice={booking.escrow_amount || booking.price}
              canRequestAdjustment={isProvider && !priceAdjustment}
              onAdjustmentCreated={fetchBookingDetails}
              onAdjustmentResolved={fetchBookingDetails}
            />
          </View>
        )}

        {(booking.status === 'Accepted' || booking.status === 'InProgress' || booking.status === 'Completed') && booking && (
          <>
            <CommunicationPanel
              bookingId={booking.id}
              otherPartyId={isCustomer ? booking.provider_id : booking.customer_id}
              otherPartyName={isCustomer ? booking.provider.full_name : booking.customer.full_name}
              otherPartyPhone={isCustomer ? booking.provider.phone : undefined}
            />

            <CommunicationHistory
              bookingId={booking.id}
              currentUserId={profile?.id || ''}
            />
          </>
        )}

        {isProvider && (booking.status === 'Accepted' || booking.status === 'InProgress' || booking.status === 'Completed') && (
          <OrderFulfillmentCard booking={booking} onUpdate={fetchBookingDetails} />
        )}

        {(booking.status === 'Accepted' || booking.status === 'InProgress' || booking.status === 'Completed') && booking && (
          <OrderCommunicationThread
            bookingId={booking.id}
            otherPartyId={isCustomer ? booking.provider_id : booking.customer_id}
            otherPartyName={isCustomer ? booking.provider.full_name : booking.customer.full_name}
          />
        )}

        {booking.status === 'Completed' && (
          <View style={styles.section}>
            <Button
              title={isCustomer ? 'Leave Review' : 'Review Customer'}
              onPress={handleLeaveReview}
              variant="outline"
              leftIcon={<Star size={20} color={colors.primary} />}
            />
          </View>
        )}

        {(booking.status === 'Completed' || booking.status === 'InProgress' || booking.status === 'Disputed') && profile?.id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dispute Resolution</Text>
            <DisputeManager
              bookingId={booking.id}
              userId={profile.id}
              onDisputeFiled={fetchBookingDetails}
            />
          </View>
        )}

        {isProvider && booking.status === 'Requested' && (
          <View style={styles.actionSection}>
            <Button
              title="Accept Booking"
              onPress={handleAcceptBooking}
              loading={updating}
              style={styles.actionButton}
            />
            <Button
              title="Decline"
              onPress={handleCancelBooking}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        )}

        {isProvider && booking.status === 'Accepted' && (
          <View style={styles.actionSection}>
            <Button
              title="Start Service"
              onPress={handleStartService}
              loading={updating}
              style={styles.actionButton}
            />
          </View>
        )}

        {(booking.status === 'Accepted' || booking.status === 'InProgress') && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.tripTrackingCard}
              onPress={() => router.push(`/booking/${booking.id}/trip` as any)}
            >
              <View style={styles.tripTrackingIcon}>
                <Car size={24} color={colors.primary} />
              </View>
              <View style={styles.tripTrackingContent}>
                <Text style={styles.tripTrackingTitle}>Trip Tracking</Text>
                <Text style={styles.tripTrackingSubtitle}>
                  Track live movements and update trip status
                </Text>
              </View>
              <Navigation size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {isProvider && booking.status === 'InProgress' && (
          <View style={styles.actionSection}>
            <Button
              title="Complete Service"
              onPress={handleCompleteService}
              loading={updating}
              style={styles.actionButton}
            />
          </View>
        )}

        {(booking.status === 'Requested' || booking.status === 'Accepted') && (
          <View style={styles.actionSection}>
            <Button
              title="Reschedule"
              onPress={() => setShowRescheduleModal(true)}
              variant="secondary"
              style={styles.actionButton}
            />
            <Button
              title="Cancel Booking"
              onPress={handleCancelBooking}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        )}
      </ScrollView>

      {booking && (
        <RescheduleBookingModal
          visible={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          booking={booking}
          isProvider={isProvider}
          onRescheduled={() => {
            setShowRescheduleModal(false);
            fetchBookingDetails();
          }}
        />
      )}
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
  messageButton: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  content: {
    flex: 1,
  },
  statusSection: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  paymentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  paymentText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },
  bookingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bookingDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailsContainer: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  priceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionSection: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: 0,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  calendarAddedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  calendarAddedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  escrowSection: {
    backgroundColor: colors.success + '10',
    padding: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  escrowTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  escrowDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  escrowPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  escrowPriceLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  escrowPriceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tripTrackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  tripTrackingIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTrackingContent: {
    flex: 1,
  },
  tripTrackingTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  tripTrackingSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
