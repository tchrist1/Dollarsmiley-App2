import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Package, Truck, MapPin, Calendar, DollarSign, CheckCircle } from 'lucide-react-native';
import { ShippingService } from '@/lib/shipping';

interface Props {
  booking: any;
  onUpdate?: () => void;
}

export default function OrderFulfillmentCard({ booking, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCreateShipment() {
    if (!booking.id) return;

    setLoading(true);
    try {
      const orderItems = booking.order_items || [];
      const firstItem = orderItems[0];

      if (!firstItem) {
        throw new Error('No order items found');
      }

      const shippingAddress = booking.shipping_address;
      if (!shippingAddress) {
        throw new Error('No shipping address found');
      }

      const shipmentData = {
        booking_id: booking.id,
        carrier: firstItem.selected_shipping_carrier || 'USPS',
        service_type: firstItem.selected_shipping_service || 'Priority Mail',
        tracking_number: `TRACK${Date.now()}`,
        shipping_label_url: null,
        origin_address: {
          name: booking.provider?.full_name,
          address: booking.provider?.location || 'Provider Address',
          city: 'Provider City',
          state: 'CA',
          zip: '90001',
        },
        destination_address: {
          name: shippingAddress.full_name,
          address: shippingAddress.address_line1,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zip: shippingAddress.zip_code,
        },
        estimated_delivery_date: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      const shipment = await ShippingService.createShipment(shipmentData);

      if (shipment) {
        Alert.alert('Success', 'Shipment created successfully');
        onUpdate?.();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  }

  function handleTrackShipment(shipmentId: string) {
    router.push(`/provider/shipment/${shipmentId}`);
  }

  const shipment = booking.shipment;
  const hasShipment = !!shipment;
  const requiresShipping = booking.fulfillment_type === 'Shipping';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Package size={24} color="#007AFF" />
        <Text style={styles.title}>Order Fulfillment</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Fulfillment Type:</Text>
          <Text style={styles.value}>{booking.fulfillment_type || 'In-Person'}</Text>
        </View>

        {booking.order_items && booking.order_items.length > 0 && (
          <View style={styles.itemsContainer}>
            <Text style={styles.sectionTitle}>Order Items ({booking.order_items.length})</Text>
            {booking.order_items.map((item: any, index: number) => (
              <View key={index} style={styles.orderItem}>
                <Text style={styles.itemName}>{item.listing_title}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetail}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemDetail}>${Math.round(item.unit_price).toLocaleString('en-US')}</Text>
                </View>
                {item.custom_options && Object.keys(item.custom_options).length > 0 && (
                  <View style={styles.optionsContainer}>
                    <Text style={styles.optionsLabel}>Selections:</Text>
                    {Object.entries(item.custom_options).map(([key, value], optIndex) => (
                      <Text key={optIndex} style={styles.itemOptions}>
                        • {key}: {value}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {requiresShipping && booking.shipping_address && (
          <View style={styles.addressContainer}>
            <View style={styles.addressHeader}>
              <MapPin size={16} color="#666" />
              <Text style={styles.sectionTitle}>Shipping Address</Text>
            </View>
            <Text style={styles.addressText}>{booking.shipping_address.full_name}</Text>
            <Text style={styles.addressText}>{booking.shipping_address.address_line1}</Text>
            {booking.shipping_address.address_line2 && (
              <Text style={styles.addressText}>{booking.shipping_address.address_line2}</Text>
            )}
            <Text style={styles.addressText}>
              {booking.shipping_address.city}, {booking.shipping_address.state}{' '}
              {booking.shipping_address.zip_code}
            </Text>
          </View>
        )}

        {requiresShipping && !hasShipment && booking.status === 'InProgress' && (
          <TouchableOpacity
            style={styles.createShipmentButton}
            onPress={handleCreateShipment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Truck size={20} color="#FFF" />
                <Text style={styles.createShipmentText}>Create Shipment</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {hasShipment && (
          <View style={styles.shipmentCard}>
            <View style={styles.shipmentHeader}>
              <Truck size={20} color="#007AFF" />
              <Text style={styles.shipmentTitle}>Shipment Details</Text>
            </View>

            <View style={styles.shipmentRow}>
              <Text style={styles.shipmentLabel}>Carrier:</Text>
              <Text style={styles.shipmentValue}>{shipment.carrier}</Text>
            </View>

            <View style={styles.shipmentRow}>
              <Text style={styles.shipmentLabel}>Service:</Text>
              <Text style={styles.shipmentValue}>{shipment.service_type}</Text>
            </View>

            <View style={styles.shipmentRow}>
              <Text style={styles.shipmentLabel}>Tracking:</Text>
              <Text style={styles.shipmentValue}>{shipment.tracking_number}</Text>
            </View>

            <View style={styles.shipmentRow}>
              <Text style={styles.shipmentLabel}>Status:</Text>
              <View style={[styles.statusBadge, getStatusStyle(shipment.shipment_status)]}>
                <Text style={styles.statusText}>{shipment.shipment_status}</Text>
              </View>
            </View>

            {shipment.estimated_delivery_date && (
              <View style={styles.shipmentRow}>
                <Calendar size={16} color="#666" />
                <Text style={styles.deliveryText}>
                  Est. Delivery: {new Date(shipment.estimated_delivery_date).toLocaleDateString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => handleTrackShipment(shipment.id)}
            >
              <Text style={styles.trackButtonText}>Track Shipment</Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === 'Completed' && (
          <View style={styles.completedBanner}>
            <CheckCircle size={20} color="#34C759" />
            <Text style={styles.completedText}>Order Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Delivered':
      return { backgroundColor: '#34C759' };
    case 'InTransit':
    case 'OutForDelivery':
      return { backgroundColor: '#007AFF' };
    case 'Exception':
      return { backgroundColor: '#FF9500' };
    case 'Cancelled':
      return { backgroundColor: '#FF3B30' };
    default:
      return { backgroundColor: '#8E8E93' };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  section: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  itemsContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  orderItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
  },
  optionsContainer: {
    marginTop: 4,
  },
  optionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  itemOptions: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  addressContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  createShipmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  createShipmentText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shipmentCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shipmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  shipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shipmentLabel: {
    fontSize: 13,
    color: '#666',
  },
  shipmentValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  deliveryText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  trackButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  trackButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F9ED',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
});
