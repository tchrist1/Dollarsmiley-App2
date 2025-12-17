import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';
import LogisticsEnhancedService from '@/lib/logistics-enhanced';
import { MapPin, Navigation, Clock, Package, CheckCircle } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface DeliveryTrackerProps {
  shipmentId: string;
  destinationLat: number;
  destinationLng: number;
  onDelivered?: () => void;
}

export default function LiveDeliveryTracker({
  shipmentId,
  destinationLat,
  destinationLng,
  onDelivered,
}: DeliveryTrackerProps) {
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationTrail, setLocationTrail] = useState<any[]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  useEffect(() => {
    loadTrackingData();
    const interval = setInterval(loadTrackingData, 30000);
    return () => clearInterval(interval);
  }, [shipmentId]);

  const loadTrackingData = async () => {
    try {
      const [trackingData, trail] = await Promise.all([
        LogisticsEnhancedService.getLiveTracking(shipmentId),
        LogisticsEnhancedService.getLocationTrail(shipmentId, 24),
      ]);

      setTracking(trackingData);
      setLocationTrail(trail);
    } catch (error) {
      console.error('Failed to load tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpInput || otpInput.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP code');
      return;
    }

    try {
      const isValid = await LogisticsEnhancedService.verifyDeliveryOTP(shipmentId, otpInput);

      if (isValid) {
        Alert.alert('Success', 'Delivery verified successfully!');
        onDelivered?.();
      } else {
        Alert.alert('Invalid OTP', 'The OTP code you entered is incorrect');
      }
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      Alert.alert('Error', 'Failed to verify OTP');
    }
  };

  const getMapRegion = () => {
    if (!tracking?.current_lat || !tracking?.current_lng) {
      return {
        latitude: destinationLat,
        longitude: destinationLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const minLat = Math.min(tracking.current_lat, destinationLat);
    const maxLat = Math.max(tracking.current_lat, destinationLat);
    const minLng = Math.min(tracking.current_lng, destinationLng);
    const maxLng = Math.max(tracking.current_lng, destinationLng);

    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  const trailCoordinates = locationTrail.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={getMapRegion()}
          showsUserLocation
          showsMyLocationButton
        >
          {tracking?.current_lat && tracking?.current_lng && (
            <Marker
              coordinate={{
                latitude: tracking.current_lat,
                longitude: tracking.current_lng,
              }}
              title="Delivery Driver"
              description="Current location"
            >
              <View style={styles.driverMarker}>
                <Navigation size={20} color={colors.white} />
              </View>
            </Marker>
          )}

          <Marker
            coordinate={{
              latitude: destinationLat,
              longitude: destinationLng,
            }}
            title="Delivery Destination"
            description="Your delivery location"
          >
            <View style={styles.destinationMarker}>
              <MapPin size={20} color={colors.white} />
            </View>
          </Marker>

          {trailCoordinates.length > 0 && (
            <Polyline
              coordinates={trailCoordinates}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          )}
        </MapView>
      </View>

      <View style={styles.infoContainer}>
        {tracking?.eta && (
          <View style={styles.etaCard}>
            <Clock size={24} color={colors.primary} />
            <View style={styles.etaInfo}>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>
                {LogisticsEnhancedService.formatETA(tracking.eta)}
              </Text>
            </View>
          </View>
        )}

        {tracking?.last_update && (
          <View style={styles.statusCard}>
            <Package size={20} color={colors.textSecondary} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Last Update</Text>
              <Text style={styles.statusText}>
                {new Date(tracking.last_update).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}

        {!showOtpInput ? (
          <TouchableOpacity
            style={styles.otpButton}
            onPress={() => setShowOtpInput(true)}
          >
            <CheckCircle size={20} color={colors.white} />
            <Text style={styles.otpButtonText}>Verify Delivery with OTP</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.otpInputContainer}>
            <Text style={styles.otpLabel}>Enter 6-digit OTP from driver:</Text>
            <View style={styles.otpInputRow}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View key={index} style={styles.otpDigit}>
                  <Text style={styles.otpDigitText}>
                    {otpInput[index] || ''}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.otpActions}>
              <TouchableOpacity
                style={styles.otpCancelButton}
                onPress={() => {
                  setShowOtpInput(false);
                  setOtpInput('');
                }}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.otpVerifyButton}
                onPress={handleVerifyOTP}
              >
                <Text style={styles.otpVerifyText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Track your delivery in real-time. The driver's location updates every 30 seconds.
            You'll receive an OTP when the driver arrives for verification.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  mapContainer: {
    height: 400,
    backgroundColor: colors.surface,
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  destinationMarker: {
    width: 40,
    height: 40,
    backgroundColor: colors.error,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  infoContainer: {
    padding: spacing.md,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryLighter,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  etaInfo: {
    flex: 1,
  },
  etaLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  etaTime: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  otpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  otpButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  otpInputContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  otpLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  otpDigit: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  otpDigitText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  otpActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  otpCancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  otpCancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  otpVerifyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  otpVerifyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  infoBox: {
    padding: spacing.sm,
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
});