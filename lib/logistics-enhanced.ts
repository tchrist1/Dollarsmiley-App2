import { supabase } from './supabase';
import * as Location from 'expo-location';

interface LocationUpdate {
  shipmentId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
}

interface DeliveryProof {
  shipmentId: string;
  proofType: 'photo' | 'signature' | 'otp' | 'location';
  proofData: Record<string, any>;
  photoUrls?: string[];
  signatureData?: string;
  otpCode?: string;
  locationLat?: number;
  locationLng?: number;
}

export class LogisticsEnhancedService {
  static async updateShipmentLocation(update: LocationUpdate) {
    const { error } = await supabase.rpc('update_shipment_location', {
      shipment_id_param: update.shipmentId,
      lat: update.latitude,
      lng: update.longitude,
      accuracy: update.accuracy || null,
      speed: update.speed || null,
    });

    if (error) throw error;
  }

  static async getLocationTrail(shipmentId: string, hours: number = 24) {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    const { data, error } = await supabase
      .from('delivery_location_trail')
      .select('*')
      .eq('shipment_id', shipmentId)
      .gte('recorded_at', hoursAgo.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getLiveTracking(shipmentId: string) {
    const { data, error } = await supabase.rpc('get_shipment_tracking', {
      shipment_id_param: shipmentId,
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  static async calculateETA(
    shipmentId: string,
    currentLat: number,
    currentLng: number,
    destinationLat: number,
    destinationLng: number,
    avgSpeedKmh: number = 40
  ) {
    const { data, error } = await supabase.rpc('calculate_eta', {
      shipment_id_param: shipmentId,
      current_lat: currentLat,
      current_lng: currentLng,
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      avg_speed_kmh: avgSpeedKmh,
    });

    if (error) throw error;
    return data;
  }

  static async getETAHistory(shipmentId: string) {
    const { data, error } = await supabase
      .from('eta_calculations')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async generateDeliveryOTP(shipmentId: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_delivery_otp', {
      shipment_id_param: shipmentId,
    });

    if (error) throw error;
    return data || '';
  }

  static async verifyDeliveryOTP(shipmentId: string, otpCode: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_delivery_otp', {
      shipment_id_param: shipmentId,
      otp_code_param: otpCode,
    });

    if (error) throw error;
    return data || false;
  }

  static async submitDeliveryProof(proof: DeliveryProof) {
    const { data, error } = await supabase
      .from('delivery_proofs')
      .insert({
        shipment_id: proof.shipmentId,
        proof_type: proof.proofType,
        proof_data: proof.proofData,
        photo_urls: proof.photoUrls || [],
        signature_data: proof.signatureData,
        otp_code: proof.otpCode,
        location_lat: proof.locationLat,
        location_lng: proof.locationLng,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getDeliveryProofs(shipmentId: string) {
    const { data, error } = await supabase
      .from('delivery_proofs')
      .select('*')
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async captureDeliveryPhoto(
    shipmentId: string,
    photoUri: string
  ): Promise<string> {
    const photoUrl = await this.uploadDeliveryPhoto(photoUri);

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      maximumAge: 30000,
    });

    await this.submitDeliveryProof({
      shipmentId,
      proofType: 'photo',
      proofData: {
        photo_url: photoUrl,
        captured_at: new Date().toISOString(),
      },
      photoUrls: [photoUrl],
      locationLat: location.coords.latitude,
      locationLng: location.coords.longitude,
    });

    return photoUrl;
  }

  private static async uploadDeliveryPhoto(photoUri: string): Promise<string> {
    const filename = `delivery_${Date.now()}.jpg`;
    const filePath = `deliveries/${filename}`;

    const response = await fetch(photoUri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('delivery-proofs')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('delivery-proofs').getPublicUrl(filePath);

    return publicUrl;
  }

  static async captureSignature(shipmentId: string, signatureData: string) {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      maximumAge: 30000,
    });

    return await this.submitDeliveryProof({
      shipmentId,
      proofType: 'signature',
      proofData: {
        signature: signatureData,
        captured_at: new Date().toISOString(),
      },
      signatureData,
      locationLat: location.coords.latitude,
      locationLng: location.coords.longitude,
    });
  }

  static async startLiveTracking(shipmentId: string, updateInterval: number = 30000) {
    let tracking = true;

    const updateLocation = async () => {
      if (!tracking) return;

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          maximumAge: 30000,
        });

        await this.updateShipmentLocation({
          shipmentId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
          speed: location.coords.speed || undefined,
        });
      } catch (error) {
        console.error('Failed to update location:', error);
      }

      if (tracking) {
        setTimeout(updateLocation, updateInterval);
      }
    };

    await updateLocation();

    return () => {
      tracking = false;
    };
  }

  static async getShipmentDistance(
    shipmentId: string,
    destinationLat: number,
    destinationLng: number
  ): Promise<number | null> {
    const tracking = await this.getLiveTracking(shipmentId);

    if (!tracking || !tracking.current_lat || !tracking.current_lng) {
      return null;
    }

    const { data, error } = await supabase.rpc('calculate_distance', {
      lat1: tracking.current_lat,
      lon1: tracking.current_lng,
      lat2: destinationLat,
      lon2: destinationLng,
    });

    if (error) throw error;
    return data || null;
  }

  static async getDeliveryStats(providerId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('*, bookings!inner(provider_id)')
      .eq('bookings.provider_id', providerId)
      .gte('created_at', dateFrom.toISOString());

    if (error) throw error;

    const stats = {
      total: shipments?.length || 0,
      in_transit: shipments?.filter((s) => s.status === 'in_transit').length || 0,
      delivered: shipments?.filter((s) => s.status === 'delivered').length || 0,
      failed: shipments?.filter((s) => s.status === 'failed').length || 0,
      avg_delivery_time_hours: 0,
    };

    return stats;
  }

  static formatETA(eta: string): string {
    const etaDate = new Date(eta);
    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 0) {
      return 'Overdue';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  static getDeliveryModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      pickup: 'Customer Pickup',
      provider_delivery: 'Provider Delivery',
      shipping: 'Shipping',
      hybrid: 'Hybrid Delivery',
    };

    return labels[mode] || mode;
  }
}

export default LogisticsEnhancedService;
