import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Package, Truck, Zap, DollarSign } from 'lucide-react-native';
import { ShippingRateQuote } from '../types/database';
import { ShippingService } from '../lib/shipping';

interface Props {
  originZip: string;
  destinationZip: string;
  weightOz: number;
  dimensions: { length: number; width: number; height: number };
  fulfillmentWindowDays: number;
  onSelectRate: (rate: ShippingRateQuote) => void;
  selectedRate?: ShippingRateQuote;
}

export default function ShippingRateSelector({
  originZip,
  destinationZip,
  weightOz,
  dimensions,
  fulfillmentWindowDays,
  onSelectRate,
  selectedRate,
}: Props) {
  const [rates, setRates] = useState<ShippingRateQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRates();
  }, [originZip, destinationZip, weightOz]);

  async function loadRates() {
    setLoading(true);
    setError(null);

    try {
      const calculatedRates = await ShippingService.calculateShippingRates({
        originZip,
        destinationZip,
        weightOz,
        dimensions,
        fulfillmentWindowDays,
      });

      if (calculatedRates.length === 0) {
        setError('No shipping options available within fulfillment window');
      } else {
        setRates(calculatedRates);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate shipping rates');
    } finally {
      setLoading(false);
    }
  }

  function getRateIcon(rate: ShippingRateQuote) {
    if (rate.is_fastest) return <Zap size={20} color="#FF9500" />;
    if (rate.is_cheapest) return <DollarSign size={20} color="#34C759" />;
    if (rate.is_best_value) return <Package size={20} color="#007AFF" />;
    return <Truck size={20} color="#666" />;
  }

  function getRateBadge(rate: ShippingRateQuote) {
    if (rate.is_fastest) {
      return <Text style={[styles.badge, styles.fastestBadge]}>Fastest</Text>;
    }
    if (rate.is_cheapest) {
      return <Text style={[styles.badge, styles.cheapestBadge]}>Cheapest</Text>;
    }
    if (rate.is_best_value) {
      return <Text style={[styles.badge, styles.bestValueBadge]}>Best Value</Text>;
    }
    return null;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Calculating shipping rates...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRates}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Shipping Option</Text>
      <Text style={styles.subtitle}>
        Delivery within {fulfillmentWindowDays} days
      </Text>

      {rates.map((rate, index) => {
        const isSelected =
          selectedRate?.carrier === rate.carrier &&
          selectedRate?.service_type === rate.service_type;

        return (
          <TouchableOpacity
            key={index}
            style={[styles.rateCard, isSelected && styles.rateCardSelected]}
            onPress={() => onSelectRate(rate)}
          >
            <View style={styles.rateHeader}>
              <View style={styles.rateIconContainer}>{getRateIcon(rate)}</View>
              <View style={styles.rateInfo}>
                <View style={styles.rateCarrierRow}>
                  <Text style={styles.rateCarrier}>{rate.carrier}</Text>
                  {getRateBadge(rate)}
                </View>
                <Text style={styles.rateService}>{rate.service_type}</Text>
              </View>
            </View>

            <View style={styles.rateDetails}>
              <View style={styles.rateDetailRow}>
                <Text style={styles.rateDetailLabel}>Delivery:</Text>
                <Text style={styles.rateDetailValue}>
                  {rate.delivery_days} {rate.delivery_days === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View style={styles.rateDetailRow}>
                <Text style={styles.rateDetailLabel}>Est. Arrival:</Text>
                <Text style={styles.rateDetailValue}>
                  {new Date(rate.delivery_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.ratePriceContainer}>
              <Text style={styles.ratePrice}>${rate.rate.toFixed(2)}</Text>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {rates.length === 0 && (
        <View style={styles.emptyContainer}>
          <Package size={48} color="#CCC" />
          <Text style={styles.emptyText}>No shipping options available</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  rateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  rateCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rateInfo: {
    flex: 1,
  },
  rateCarrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateCarrier: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  rateService: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  fastestBadge: {
    backgroundColor: '#FF9500',
    color: '#FFF',
  },
  cheapestBadge: {
    backgroundColor: '#34C759',
    color: '#FFF',
  },
  bestValueBadge: {
    backgroundColor: '#007AFF',
    color: '#FFF',
  },
  rateDetails: {
    marginBottom: 12,
  },
  rateDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rateDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  rateDetailValue: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  ratePriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ratePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  selectedIndicator: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectedText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});
