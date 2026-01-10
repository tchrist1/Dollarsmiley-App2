import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { supabase } from '@/lib/supabase';
import {
  getTripsForBooking,
  getActiveTrip,
  startTrip,
  markTripArrived,
  completeTrip,
  cancelTrip,
  startLocationTracking,
  stopLocationTracking,
  subscribeToBookingTrips,
  getTripTypeDescription,
  isUserMover,
  Trip,
} from '@/lib/trips';
import LiveTripTracker, { TripNotAvailable } from '@/components/LiveTripTracker';
import TripStatusTimeline, { CompactTripTimeline } from '@/components/TripStatusTimeline';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  ArrowLeft,
  Car,
  Play,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  RefreshCw,
} from 'lucide-react-native';

interface MoverInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
}

export default function TripTrackingScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [moverInfo, setMoverInfo] = useState<MoverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    fetchTrips();

    const unsubscribe = subscribeToBookingTrips(id as string, (updatedTrip) => {
      setTrips(prev => {
        const index = prev.findIndex(t => t.id === updatedTrip.id);
        if (index >= 0) {
          const newTrips = [...prev];
          newTrips[index] = updatedTrip;
          return newTrips;
        }
        return [...prev, updatedTrip];
      });

      if (activeTrip?.id === updatedTrip.id) {
        setActiveTrip(updatedTrip);
      }
    });

    return () => {
      unsubscribe();
      stopLocationTracking();
    };
  }, [id]);

  const fetchTrips = async () => {
    try {
      const tripsData = await getTripsForBooking(id as string);
      setTrips(tripsData);

      const active = await getActiveTrip(id as string);
      setActiveTrip(active);

      if (active) {
        const { data: mover } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone')
          .eq('id', active.mover_id)
          .single();

        if (mover) {
          setMoverInfo(mover);
        }
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, []);

  const isMover = activeTrip ? isUserMover(activeTrip, profile?.id || '') : false;

  const handleStartTrip = async () => {
    if (!activeTrip) return;

    Alert.alert(
      'Start Trip',
      'Are you ready to start traveling? Live location tracking will begin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updatedTrip = await startTrip(activeTrip.id);
              if (updatedTrip) {
                setActiveTrip(updatedTrip);

                const trackingStarted = await startLocationTracking(activeTrip.id);
                setIsTracking(trackingStarted);

                if (!trackingStarted) {
                  Alert.alert(
                    'Location Permission',
                    'Location tracking is not available. You can still update your trip status manually.'
                  );
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to start trip');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkArrived = async () => {
    if (!activeTrip) return;

    Alert.alert(
      'Mark as Arrived',
      'Confirm that you have arrived at the destination?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updatedTrip = await markTripArrived(activeTrip.id);
              if (updatedTrip) {
                setActiveTrip(updatedTrip);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark as arrived');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;

    Alert.alert(
      'Complete Trip',
      activeTrip.total_legs > activeTrip.leg_number
        ? 'Complete this leg and proceed to the next?'
        : 'Complete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setActionLoading(true);
            try {
              await stopLocationTracking();
              setIsTracking(false);

              const updatedTrip = await completeTrip(activeTrip.id);
              if (updatedTrip) {
                if (activeTrip.total_legs > activeTrip.leg_number) {
                  fetchTrips();
                  Alert.alert('Leg Completed', 'Proceed to the next leg when ready.');
                } else {
                  setActiveTrip(null);
                  Alert.alert('Trip Completed', 'You have arrived at your destination.');
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete trip');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;

    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await stopLocationTracking();
              setIsTracking(false);

              await cancelTrip(activeTrip.id);
              fetchTrips();
              Alert.alert('Trip Canceled', 'The trip has been canceled.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel trip');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleContactMover = () => {
    if (!activeTrip) return;
    router.push(`/chat/${id}` as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Tracking</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading trip information...</Text>
        </View>
      </View>
    );
  }

  const noTripsAvailable = trips.length === 0;
  const allTripsCompleted = trips.every(t => t.trip_status === 'completed' || t.trip_status === 'canceled');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Tracking</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {noTripsAvailable ? (
          <View style={styles.section}>
            <TripNotAvailable />
          </View>
        ) : allTripsCompleted ? (
          <View style={styles.completedContainer}>
            <CheckCircle size={48} color={colors.success} />
            <Text style={styles.completedTitle}>All Trips Completed</Text>
            <Text style={styles.completedText}>
              All movements for this booking have been completed.
            </Text>
          </View>
        ) : activeTrip ? (
          <>
            <View style={styles.section}>
              <View style={styles.tripHeader}>
                <Car size={24} color={colors.primary} />
                <View style={styles.tripHeaderText}>
                  <Text style={styles.tripTitle}>
                    {getTripTypeDescription(activeTrip.trip_type as any, activeTrip.mover_type)}
                  </Text>
                  {activeTrip.total_legs > 1 && (
                    <Text style={styles.tripLeg}>
                      Leg {activeTrip.leg_number} of {activeTrip.total_legs}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {isMover ? (
              <>
                <View style={styles.section}>
                  <TripStatusTimeline
                    currentStatus={activeTrip.trip_status}
                    startedAt={activeTrip.started_at}
                    arrivingSoonAt={activeTrip.arriving_soon_at}
                    arrivedAt={activeTrip.arrived_at}
                    completedAt={activeTrip.completed_at}
                    canceledAt={activeTrip.canceled_at}
                    legNumber={activeTrip.leg_number}
                    totalLegs={activeTrip.total_legs}
                  />
                </View>

                <View style={styles.section}>
                  <View style={styles.destinationCard}>
                    <MapPin size={20} color={colors.primary} />
                    <View style={styles.destinationContent}>
                      <Text style={styles.destinationLabel}>Destination</Text>
                      <Text style={styles.destinationAddress}>{activeTrip.destination_address}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsSection}>
                  {activeTrip.trip_status === 'not_started' && (
                    <Button
                      title="Start Trip"
                      onPress={handleStartTrip}
                      loading={actionLoading}
                      icon={<Play size={20} color={colors.white} />}
                    />
                  )}

                  {(activeTrip.trip_status === 'on_the_way' || activeTrip.trip_status === 'arriving_soon') && (
                    <>
                      <Button
                        title="I've Arrived"
                        onPress={handleMarkArrived}
                        loading={actionLoading}
                        icon={<MapPin size={20} color={colors.white} />}
                      />
                      {isTracking && (
                        <View style={styles.trackingIndicator}>
                          <View style={styles.trackingDot} />
                          <Text style={styles.trackingText}>Location tracking active</Text>
                        </View>
                      )}
                    </>
                  )}

                  {activeTrip.trip_status === 'arrived' && (
                    <Button
                      title="Complete Trip"
                      onPress={handleCompleteTrip}
                      loading={actionLoading}
                      icon={<CheckCircle size={20} color={colors.white} />}
                    />
                  )}

                  {activeTrip.trip_status !== 'completed' && activeTrip.trip_status !== 'canceled' && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelTrip}
                      disabled={actionLoading}
                    >
                      <XCircle size={16} color={colors.error} />
                      <Text style={styles.cancelButtonText}>Cancel Trip</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.section}>
                <LiveTripTracker
                  tripId={activeTrip.id}
                  moverInfo={moverInfo || undefined}
                  isViewer={true}
                  onContactPress={handleContactMover}
                  showFullMap={false}
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.section}>
            <TripNotAvailable />
          </View>
        )}

        {trips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip History</Text>
            <View style={styles.tripsList}>
              {trips.map((trip) => (
                <View key={trip.id} style={styles.tripHistoryItem}>
                  <View style={styles.tripHistoryHeader}>
                    <Text style={styles.tripHistoryTitle}>
                      Leg {trip.leg_number}: {getTripTypeDescription(trip.trip_type as any, trip.mover_type)}
                    </Text>
                    <CompactTripTimeline currentStatus={trip.trip_status} />
                  </View>
                  <Text style={styles.tripHistoryDestination}>{trip.destination_address}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
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
  headerSpacer: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.md,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  tripHeaderText: {
    flex: 1,
  },
  tripTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  tripLeg: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xxs,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  destinationContent: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  destinationAddress: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  actionsSection: {
    padding: spacing.md,
    gap: spacing.md,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  trackingText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  completedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  completedTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  completedText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tripsList: {
    gap: spacing.sm,
  },
  tripHistoryItem: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tripHistoryTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  tripHistoryDestination: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
