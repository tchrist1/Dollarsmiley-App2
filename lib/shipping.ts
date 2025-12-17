import { supabase } from './supabase';
import {
  ShippingAddress,
  Shipment,
  ShipmentStatus,
  ShippingRateQuote,
  FulfillmentOption,
} from '../types/database';

export interface ShippingCalculationParams {
  originZip: string;
  destinationZip: string;
  weightOz: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fulfillmentWindowDays: number;
  carrierPreference?: string[];
}

export interface ShipmentCreateParams {
  bookingId: string;
  carrier: string;
  originAddress: any;
  destinationAddress: any;
  weightOz: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  shippingCost: number;
  estimatedDeliveryDate?: string;
}

export class ShippingService {
  static async getShippingAddresses(userId: string): Promise<ShippingAddress[]> {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shipping addresses:', error);
      return [];
    }
  }

  static async getDefaultAddress(userId: string): Promise<ShippingAddress | null> {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching default address:', error);
      return null;
    }
  }

  static async createAddress(
    address: Omit<ShippingAddress, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ShippingAddress | null> {
    try {
      if (address.is_default) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }

      const { data, error } = await supabase
        .from('shipping_addresses')
        .insert(address)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating address:', error);
      return null;
    }
  }

  static async updateAddress(
    addressId: string,
    updates: Partial<ShippingAddress>
  ): Promise<boolean> {
    try {
      if (updates.is_default && updates.user_id) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('user_id', updates.user_id);
      }

      const { error } = await supabase
        .from('shipping_addresses')
        .update(updates)
        .eq('id', addressId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating address:', error);
      return false;
    }
  }

  static async deleteAddress(addressId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      return false;
    }
  }

  static async calculateShippingRates(
    params: ShippingCalculationParams
  ): Promise<ShippingRateQuote[]> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/calculate-shipping-rates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to calculate shipping rates');
      }

      const { rates } = await response.json();
      return rates || [];
    } catch (error) {
      console.error('Error calculating shipping rates:', error);
      return [];
    }
  }

  static async getCachedRate(
    originZip: string,
    destinationZip: string,
    weightOz: number,
    dimensionsHash: string,
    carrier: string,
    serviceType: string
  ): Promise<ShippingRateQuote | null> {
    try {
      const { data, error } = await supabase
        .from('shipping_rate_cache')
        .select('*')
        .eq('origin_zip', originZip)
        .eq('destination_zip', destinationZip)
        .eq('weight_oz', weightOz)
        .eq('dimensions_hash', dimensionsHash)
        .eq('carrier', carrier)
        .eq('service_type', serviceType)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) return null;

      return {
        carrier: data.carrier,
        service_type: data.service_type,
        rate: data.rate,
        delivery_days: data.delivery_days,
        delivery_date: new Date(
          Date.now() + data.delivery_days * 24 * 60 * 60 * 1000
        ).toISOString(),
        is_fastest: false,
        is_cheapest: false,
        is_best_value: false,
      };
    } catch (error) {
      console.error('Error fetching cached rate:', error);
      return null;
    }
  }

  static async createShipment(
    params: ShipmentCreateParams
  ): Promise<Shipment | null> {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          booking_id: params.bookingId,
          carrier: params.carrier,
          origin_address: params.originAddress,
          destination_address: params.destinationAddress,
          weight_oz: params.weightOz,
          dimensions: params.dimensions,
          shipping_cost: params.shippingCost,
          estimated_delivery_date: params.estimatedDeliveryDate,
          status: 'Pending' as ShipmentStatus,
          tracking_events: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating shipment:', error);
      return null;
    }
  }

  static async updateShipmentTracking(
    shipmentId: string,
    trackingNumber: string,
    carrier?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        tracking_number: trackingNumber,
        status: 'InTransit' as ShipmentStatus,
      };

      if (carrier) {
        updates.carrier = carrier;
      }

      const { error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', shipmentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating shipment tracking:', error);
      return false;
    }
  }

  static async getShipmentByBooking(bookingId: string): Promise<Shipment | null> {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching shipment:', error);
      return null;
    }
  }

  static async trackShipment(shipmentId: string): Promise<{
    status: ShipmentStatus;
    events: any[];
    estimatedDelivery?: string;
  } | null> {
    try {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();

      if (!shipment || !shipment.tracking_number) {
        return null;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/track-shipment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            shipmentId,
            trackingNumber: shipment.tracking_number,
            carrier: shipment.carrier,
          }),
        }
      );

      if (!response.ok) {
        return {
          status: shipment.status,
          events: shipment.tracking_events || [],
          estimatedDelivery: shipment.estimated_delivery_date,
        };
      }

      const trackingData = await response.json();
      return trackingData;
    } catch (error) {
      console.error('Error tracking shipment:', error);
      return null;
    }
  }

  static async confirmDelivery(
    shipmentId: string,
    proofUrl?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'Delivered' as ShipmentStatus,
          actual_delivery_date: new Date().toISOString().split('T')[0],
          proof_of_delivery_url: proofUrl,
        })
        .eq('id', shipmentId);

      if (error) throw error;

      const { data: shipment } = await supabase
        .from('shipments')
        .select('booking_id')
        .eq('id', shipmentId)
        .single();

      if (shipment) {
        await supabase
          .from('bookings')
          .update({ delivery_confirmed_at: new Date().toISOString() })
          .eq('id', shipment.booking_id);
      }

      return true;
    } catch (error) {
      console.error('Error confirming delivery:', error);
      return false;
    }
  }

  static async calculatePickupDropoffCost(
    distanceMiles: number,
    weightLbs: number,
    quantity: number,
    fulfillmentOption: FulfillmentOption
  ): Promise<number> {
    const baseCost = fulfillmentOption.base_cost || 0;
    const distanceCost = distanceMiles * (fulfillmentOption.cost_per_mile || 0);
    const weightCost = weightLbs * (fulfillmentOption.cost_per_pound || 0);

    const totalCost = (baseCost + distanceCost + weightCost) * quantity;
    return Math.max(totalCost, 0);
  }

  static async getFulfillmentOptions(
    listingId: string
  ): Promise<FulfillmentOption[]> {
    try {
      const { data, error } = await supabase
        .from('fulfillment_options')
        .select('*')
        .eq('listing_id', listingId)
        .eq('is_active', true)
        .order('fulfillment_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching fulfillment options:', error);
      return [];
    }
  }

  static async createFulfillmentOption(
    option: Omit<FulfillmentOption, 'id' | 'created_at' | 'updated_at'>
  ): Promise<FulfillmentOption | null> {
    try {
      const { data, error } = await supabase
        .from('fulfillment_options')
        .insert(option)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating fulfillment option:', error);
      return null;
    }
  }

  static async updateFulfillmentOption(
    optionId: string,
    updates: Partial<FulfillmentOption>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fulfillment_options')
        .update(updates)
        .eq('id', optionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating fulfillment option:', error);
      return false;
    }
  }
}

export default ShippingService;

// Export static methods directly (no bind needed for static methods)
export const calculatePlatformShippingRates = (params: ShippingCalculationParams) =>
  ShippingService.calculatePlatformShippingRates(params);
export const createShipment = (params: ShipmentCreateParams) =>
  ShippingService.createShipment(params);
export const updateShipmentStatus = (shipmentId: string, status: ShipmentStatus, notes?: string) =>
  ShippingService.updateShipmentStatus(shipmentId, status, notes);
export const trackShipment = (shipmentId: string) =>
  ShippingService.trackShipment(shipmentId);
