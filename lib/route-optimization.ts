import { supabase } from './supabase';

interface DeliveryRoute {
  id: string;
  provider_id: string;
  route_name: string;
  route_date: string;
  start_location: { lat: number; lng: number; address?: string };
  end_location?: { lat: number; lng: number; address?: string };
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  total_distance: number;
  estimated_duration: number;
  actual_duration?: number;
  optimization_score: number;
  vehicle_type?: string;
  driver_name?: string;
  notes?: string;
}

interface RouteStop {
  id: string;
  route_id: string;
  shipment_id?: string;
  stop_order: number;
  location: { lat: number; lng: number };
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  estimated_duration: number;
  status: 'pending' | 'in_transit' | 'arrived' | 'completed' | 'failed';
  notes?: string;
}

export class RouteOptimizationService {
  static async createRoute(
    providerId: string,
    routeName: string,
    routeDate: string,
    startLocation: { lat: number; lng: number; address?: string },
    stops: Array<{
      location: { lat: number; lng: number };
      address?: string;
      contact_name?: string;
      contact_phone?: string;
      shipment_id?: string;
    }>
  ): Promise<DeliveryRoute> {
    const { data: route, error: routeError } = await supabase
      .from('delivery_routes')
      .insert({
        provider_id: providerId,
        route_name: routeName,
        route_date: routeDate,
        start_location: startLocation,
        status: 'planned',
      })
      .select()
      .single();

    if (routeError) throw routeError;

    const stopsToInsert = stops.map((stop, index) => ({
      route_id: route.id,
      stop_order: index + 1,
      location: stop.location,
      address: stop.address,
      contact_name: stop.contact_name,
      contact_phone: stop.contact_phone,
      shipment_id: stop.shipment_id,
      estimated_duration: 15,
    }));

    const { error: stopsError } = await supabase
      .from('route_stops')
      .insert(stopsToInsert);

    if (stopsError) throw stopsError;

    await this.calculateRouteDistance(route.id);

    return route;
  }

  static async getRoute(routeId: string): Promise<DeliveryRoute & { stops: RouteStop[] }> {
    const { data: route, error: routeError } = await supabase
      .from('delivery_routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (routeError) throw routeError;

    const { data: stops, error: stopsError } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', routeId)
      .order('stop_order');

    if (stopsError) throw stopsError;

    return { ...route, stops: stops || [] };
  }

  static async getProviderRoutes(providerId: string, limit: number = 50): Promise<DeliveryRoute[]> {
    const { data, error } = await supabase
      .from('delivery_routes')
      .select('*')
      .eq('provider_id', providerId)
      .order('route_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async calculateRouteDistance(routeId: string): Promise<number> {
    const route = await this.getRoute(routeId);

    let totalDistance = 0;
    let prevLocation = route.start_location;

    for (const stop of route.stops) {
      const distance = await this.calculateDistance(
        prevLocation.lat,
        prevLocation.lng,
        stop.location.lat,
        stop.location.lng
      );
      totalDistance += distance;
      prevLocation = stop.location;
    }

    const { error } = await supabase
      .from('delivery_routes')
      .update({
        total_distance: totalDistance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', routeId);

    if (error) throw error;

    return totalDistance;
  }

  static async calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_distance', {
      lat1,
      lng1,
      lat2,
      lng2,
    });

    if (error) throw error;
    return data || 0;
  }

  static async optimizeRoute(routeId: string): Promise<void> {
    const route = await this.getRoute(routeId);

    const originalDistance = route.total_distance;

    const optimized = this.nearestNeighborOptimization(route.start_location, route.stops);

    const updatePromises = optimized.map((stop, index) =>
      supabase
        .from('route_stops')
        .update({ stop_order: index + 1 })
        .eq('id', stop.id)
    );

    await Promise.all(updatePromises);

    const newDistance = await this.calculateRouteDistance(routeId);

    await supabase.from('route_optimizations').insert({
      route_id: routeId,
      optimization_type: 'distance',
      original_distance: originalDistance,
      optimized_distance: newDistance,
      distance_saved: originalDistance - newDistance,
      algorithm_used: 'nearest_neighbor',
    });
  }

  private static nearestNeighborOptimization(
    startLocation: { lat: number; lng: number },
    stops: RouteStop[]
  ): RouteStop[] {
    const unvisited = [...stops];
    const optimized: RouteStop[] = [];
    let currentLocation = startLocation;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.haversineDistance(
          currentLocation.lat,
          currentLocation.lng,
          unvisited[i].location.lat,
          unvisited[i].location.lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      const nearestStop = unvisited.splice(nearestIndex, 1)[0];
      optimized.push(nearestStop);
      currentLocation = nearestStop.location;
    }

    return optimized;
  }

  private static haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static async updateStopStatus(
    stopId: string,
    status: 'pending' | 'in_transit' | 'arrived' | 'completed' | 'failed'
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'arrived' || status === 'completed') {
      updates.actual_arrival = new Date().toISOString();
    }

    const { error } = await supabase.from('route_stops').update(updates).eq('id', stopId);

    if (error) throw error;
  }

  static async updateRouteStatus(
    routeId: string,
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<void> {
    const { error } = await supabase
      .from('delivery_routes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', routeId);

    if (error) throw error;
  }

  static formatDistance(km: number): string {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(2)}km`;
  }

  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  static calculateEstimatedDuration(distanceKm: number, avgSpeedKmh: number = 50): number {
    return Math.round((distanceKm / avgSpeedKmh) * 60);
  }

  static async getTodaysRoutes(providerId: string): Promise<DeliveryRoute[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('delivery_routes')
      .select('*')
      .eq('provider_id', providerId)
      .eq('route_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static getRouteStatusColor(status: string): string {
    const colors: Record<string, string> = {
      planned: '#3B82F6',
      in_progress: '#F59E0B',
      completed: '#10B981',
      cancelled: '#DC2626',
    };
    return colors[status] || '#6B7280';
  }

  static getStopStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#6B7280',
      in_transit: '#3B82F6',
      arrived: '#F59E0B',
      completed: '#10B981',
      failed: '#DC2626',
    };
    return colors[status] || '#6B7280';
  }
}

export default RouteOptimizationService;
