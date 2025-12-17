import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { PaymentConfirmation } from '@/components/PaymentConfirmation';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function PaymentConfirmationScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {
    if (params.bookingId || params.transactionId) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [params]);

  const fetchPaymentDetails = async () => {
    try {
      if (params.bookingId) {
        const { data: booking } = await supabase
          .from('bookings')
          .select(
            `
            *,
            listing:service_listings(*),
            provider:profiles!bookings_provider_id_fkey(*)
          `
          )
          .eq('id', params.bookingId)
          .single();

        if (booking) {
          setBookingData(booking);

          const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('booking_id', booking.id)
            .eq('transaction_type', 'Payment')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (transaction) {
            setPaymentData(transaction);
          }
        }
      } else if (params.transactionId) {
        const { data: transaction } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', params.transactionId)
          .single();

        if (transaction) {
          setPaymentData(transaction);
        }
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!paymentData && !bookingData) return;

    try {
      const receiptData = {
        transactionId: paymentData?.id || params.transactionId,
        bookingId: bookingData?.id || params.bookingId,
        amount: paymentData?.amount || bookingData?.price || params.amount,
        date: new Date().toISOString(),
        service: bookingData?.listing?.title || params.serviceName,
        provider: bookingData?.provider?.full_name || params.providerName,
      };

      const receiptContent = `
PAYMENT RECEIPT
===============

Transaction ID: ${receiptData.transactionId}
Booking ID: ${receiptData.bookingId}
Amount: $${receiptData.amount}
Date: ${new Date(receiptData.date).toLocaleString()}

Service: ${receiptData.service || 'N/A'}
Provider: ${receiptData.provider || 'N/A'}

Thank you for your payment!
      `;

      const fileUri = FileSystem.documentDirectory + 'receipt.txt';
      await FileSystem.writeAsStringAsync(fileUri, receiptContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  const handleContactProvider = () => {
    if (bookingData?.provider_id) {
      router.push(`/chat/${bookingData.provider_id}`);
    }
  };

  const handleViewBooking = () => {
    if (bookingData?.id) {
      router.push(`/booking/${bookingData.id}`);
    } else {
      router.push('/bookings');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Confirmation</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </View>
    );
  }

  const status = (params.status as any) || paymentData?.status?.toLowerCase() || 'success';
  const amount = parseFloat(
    (params.amount as string) || paymentData?.amount?.toString() || bookingData?.price?.toString() || '0'
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Confirmation</Text>
      </View>

      <PaymentConfirmation
        status={status}
        amount={amount}
        transactionId={
          (params.transactionId as string) ||
          paymentData?.id ||
          (bookingData?.id ? `BK-${bookingData.id.slice(0, 8)}` : undefined)
        }
        bookingId={(params.bookingId as string) || bookingData?.id}
        serviceName={(params.serviceName as string) || bookingData?.listing?.title}
        providerName={(params.providerName as string) || bookingData?.provider?.full_name}
        date={
          (params.date as string) ||
          (bookingData?.scheduled_date
            ? new Date(bookingData.scheduled_date).toLocaleDateString()
            : undefined)
        }
        time={(params.time as string) || bookingData?.scheduled_time}
        message={params.message as string}
        customTitle={params.title as string}
        customDescription={params.description as string}
        showReceipt={true}
        showContactProvider={!!bookingData?.provider_id}
        showReschedule={false}
        onDownloadReceipt={handleDownloadReceipt}
        onContactProvider={handleContactProvider}
        onViewBooking={handleViewBooking}
        onClose={() => router.push('/(tabs)')}
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
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
