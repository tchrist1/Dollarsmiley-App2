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
import { ShippingService } from '@/lib/shipping';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';

export default function ShipmentTrackingScreen() {
  const { id } = useLocalSearchParams();
  const [shipment, setShipment] = useState<any>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadShipmentDetails();
    }
  }, [id]);

  async function loadShipmentDetails() {
    setLoading(true);
    try {
      const { data: shipmentData, error } = await supabase
        .from('shipments')
        .select(`
          *,
          booking:bookings(
            id,
            title,
            customer_id,
            provider_id,
            shipping_address:shipping_addresses(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setShipment(shipmentData);

      const tracking = await ShippingService.trackShipment(
        shipmentData.id,
        shipmentData.tracking_number,
        shipmentData.carrier
      );

      if (tracking) {
        setTrackingEvents(tracking.events || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!shipment) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ shipment_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', shipment.id);

      if (error) throw error;

      Alert.alert('Success', `Shipment status updated to ${newStatus}`);
      loadShipmentDetails();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update shipment status');
    } finally {
      setUpdating(false);
    }
  }

  async function handleMarkDelivered() {
    if (!shipment) return;

    Alert.alert(
      'Mark as Delivered',
      'Are you sure the shipment has been delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              const { error } = await supabase
                .from('shipments')
                .update({
                  shipment_status: 'Delivered',
                  actual_delivery_date: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', shipment.id);

              if (error) throw error;

              const { error: bookingError } = await supabase
                .from('bookings')
                .update({ status: 'Completed' })
                .eq('id', shipment.booking_id);

              if (bookingError) throw bookingError;

              Alert.alert('Success', 'Shipment marked as delivered and booking completed');
              loadShipmentDetails();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark as delivered');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipment Tracking</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shipment Tracking</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Package size={64} color="#CCC" />
          <Text style={styles.emptyText}>Shipment not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Tracking</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, getStatusStyle(shipment.shipment_status)]}>
              {getStatusIcon(shipment.shipment_status)}
              <Text style={styles.statusText}>{shipment.shipment_status}</Text>
            </View>
          </View>

          <View style={styles.trackingRow}>
            <Package size={20} color={colors.textSecondary} />
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Tracking Number</Text>
              <Text style={styles.trackingValue}>{shipment.tracking_number}</Text>
            </View>
          </View>

          <View style={styles.trackingRow}>
            <Truck size={20} color={colors.textSecondary} />
            <View style={styles.trackingInfo}>
              <Text style={styles.trackingLabel}>Carrier</Text>
              <Text style={styles.trackingValue}>
                {shipment.carrier} - {shipment.service_type}
              </Text>
            </View>
          </View>

          {shipment.estimated_delivery_date && (
            <View style={styles.trackingRow}>
              <Calendar size={20} color={colors.textSecondary} />
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Estimated Delivery</Text>
                <Text style={styles.trackingValue}>
                  {new Date(shipment.estimated_delivery_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {shipment.actual_delivery_date && (
            <View style={styles.trackingRow}>
              <CheckCircle size={20} color={colors.success} />
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Delivered On</Text>
                <Text style={styles.trackingValue}>
                  {new Date(shipment.actual_delivery_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>

        {shipment.booking?.shipping_address && (
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <MapPin size={20} color={colors.primary} />
              <Text style={styles.addressTitle}>Delivery Address</Text>
            </View>
            <Text style={styles.addressText}>
              {shipment.booking.shipping_address.full_name}
            </Text>
            <Text style={styles.addressText}>
              {shipment.booking.shipping_address.address_line1}
            </Text>
            {shipment.booking.shipping_address.address_line2 && (
              <Text style={styles.addressText}>
                {shipment.booking.shipping_address.address_line2}
              </Text>
            )}
            <Text style={styles.addressText}>
              {shipment.booking.shipping_address.city},{' '}
              {shipment.booking.shipping_address.state}{' '}
              {shipment.booking.shipping_address.zip_code}
            </Text>
          </View>
        )}

        {trackingEvents.length > 0 && (
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Tracking History</Text>
            {trackingEvents.map((event: any, index: number) => (
              <View key={index} style={styles.timelineEvent}>
                <View style={styles.timelineDot} />
                {index < trackingEvents.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.eventStatus}>{event.status}</Text>
                  <Text style={styles.eventLocation}>{event.location}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.timestamp).toLocaleString()}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {shipment.shipment_status !== 'Delivered' &&
          shipment.shipment_status !== 'Cancelled' && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsTitle}>Update Shipment</Text>

              {shipment.shipment_status === 'Pending' && (
                <Button
                  title="Mark as In Transit"
                  onPress={() => handleUpdateStatus('InTransit')}
                  loading={updating}
                  style={styles.actionButton}
                />
              )}

              {shipment.shipment_status === 'InTransit' && (
                <Button
                  title="Mark as Out for Delivery"
                  onPress={() => handleUpdateStatus('OutForDelivery')}
                  loading={updating}
                  style={styles.actionButton}
                />
              )}

              {(shipment.shipment_status === 'OutForDelivery' ||
                shipment.shipment_status === 'InTransit') && (
                <Button
                  title="Mark as Delivered"
                  onPress={handleMarkDelivered}
                  loading={updating}
                  style={styles.actionButton}
                />
              )}
            </View>
          )}
      </ScrollView>
    </View>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'Delivered':
      return <CheckCircle size={16} color="#FFF" />;
    case 'Exception':
    case 'Cancelled':
      return <AlertCircle size={16} color="#FFF" />;
    default:
      return <Package size={16} color="#FFF" />;
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Delivered':
      return { backgroundColor: colors.success };
    case 'InTransit':
    case 'OutForDelivery':
      return { backgroundColor: colors.primary };
    case 'Exception':
      return { backgroundColor: colors.warning };
    case 'Cancelled':
      return { backgroundColor: colors.error };
    default:
      return { backgroundColor: colors.textSecondary };
  }
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
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
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  trackingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trackingLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  trackingValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addressTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timelineCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  timelineTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  timelineEvent: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 20,
    bottom: -spacing.lg,
    width: 1,
    backgroundColor: colors.border,
  },
  timelineContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  eventStatus: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  eventTime: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  eventDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
});
