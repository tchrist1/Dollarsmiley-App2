import { supabase } from './supabase';
import { CartItem, OrderItem, ServiceListing } from '../types/database';
import { ValueAddedServicesManager } from './value-added-services';
import { ShippingService } from './shipping';

export interface CartPriceBreakdown {
  itemsTotal: number;
  vasTotal: number;
  shippingTotal: number;
  subtotal: number;
  taxAmount: number;
  platformFee: number;
  total: number;
}

export const TAX_RATE = 0.08;
export const PLATFORM_FEE_RATE = 0.10;

export class CartService {
  static async getCartItems(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          listing:service_listings(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }
  }

  static async addToCart(
    userId: string,
    listingId: string,
    listingType: 'Service' | 'CustomService',
    quantity: number = 1,
    customOptions?: any,
    selectedVAS?: any[],
    fulfillmentOptionId?: string,
    shippingAddressId?: string
  ): Promise<CartItem | null> {
    try {
      const { data: listing, error: listingError } = await supabase
        .from('service_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (listingError || !listing) {
        throw new Error('Listing not found');
      }

      const priceSnapshot = await this.calculateItemPrice(
        listing,
        quantity,
        customOptions,
        selectedVAS,
        fulfillmentOptionId
      );

      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          listing_id: listingId,
          listing_type: listingType,
          quantity,
          custom_options: customOptions || {},
          selected_vas: selectedVAS || [],
          fulfillment_option_id: fulfillmentOptionId,
          shipping_address_id: shippingAddressId,
          price_snapshot: priceSnapshot,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return null;
    }
  }

  static async updateCartItem(
    itemId: string,
    updates: Partial<CartItem>
  ): Promise<boolean> {
    try {
      if (updates.quantity || updates.custom_options || updates.selected_vas) {
        const { data: item } = await supabase
          .from('cart_items')
          .select(`
            *,
            listing:service_listings(*)
          `)
          .eq('id', itemId)
          .single();

        if (item) {
          const priceSnapshot = await this.calculateItemPrice(
            item.listing,
            updates.quantity || item.quantity,
            updates.custom_options || item.custom_options,
            updates.selected_vas || item.selected_vas,
            updates.fulfillment_option_id || item.fulfillment_option_id
          );
          updates.price_snapshot = priceSnapshot;
        }
      }

      const { error } = await supabase
        .from('cart_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating cart item:', error);
      return false;
    }
  }

  static async removeFromCart(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }

  static async clearCart(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  static async calculateItemPrice(
    listing: ServiceListing,
    quantity: number,
    customOptions?: any,
    selectedVAS?: any[],
    fulfillmentOptionId?: string
  ): Promise<any> {
    let basePrice = listing.base_price;

    if (customOptions && listing.listing_type === 'CustomService') {
      const options = await ValueAddedServicesManager.getCustomServiceOptions(
        listing.id
      );
      basePrice = ValueAddedServicesManager.calculateCustomOptionsPrice(
        basePrice,
        customOptions,
        options
      );
    }

    const vasTotal = selectedVAS
      ? selectedVAS.reduce((sum, vas) => sum + (vas.price || 0), 0)
      : 0;

    let estimatedShipping = 0;
    if (fulfillmentOptionId) {
      const { data: fulfillment } = await supabase
        .from('fulfillment_options')
        .select('*')
        .eq('id', fulfillmentOptionId)
        .single();

      if (fulfillment) {
        if (fulfillment.fulfillment_type === 'Shipping') {
          estimatedShipping = 10.0;
        } else {
          estimatedShipping = fulfillment.base_cost || 0;
        }
      }
    }

    return {
      base_price: basePrice,
      options_total: 0,
      vas_total: vasTotal,
      estimated_shipping: estimatedShipping,
    };
  }

  static async getCartPriceBreakdown(
    userId: string
  ): Promise<CartPriceBreakdown> {
    try {
      const items = await this.getCartItems(userId);

      let itemsTotal = 0;
      let vasTotal = 0;
      let shippingTotal = 0;

      items.forEach((item) => {
        const snapshot = item.price_snapshot;
        itemsTotal += snapshot.base_price * item.quantity;
        vasTotal += snapshot.vas_total * item.quantity;
        shippingTotal += snapshot.estimated_shipping;
      });

      const subtotal = itemsTotal + vasTotal;
      const platformFee = subtotal * PLATFORM_FEE_RATE;
      const taxableAmount = subtotal + vasTotal;
      const taxAmount = taxableAmount * TAX_RATE;
      const total = subtotal + shippingTotal + taxAmount;

      return {
        itemsTotal,
        vasTotal,
        shippingTotal,
        subtotal,
        taxAmount,
        platformFee,
        total,
      };
    } catch (error) {
      console.error('Error calculating cart breakdown:', error);
      return {
        itemsTotal: 0,
        vasTotal: 0,
        shippingTotal: 0,
        subtotal: 0,
        taxAmount: 0,
        platformFee: 0,
        total: 0,
      };
    }
  }

  static async getCartCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting cart count:', error);
      return 0;
    }
  }

  static async createOrderFromCart(
    userId: string,
    shippingAddressId?: string,
    shippingRates?: Array<{
      cart_item_id: string;
      carrier: string;
      service_type: string;
      rate: number;
      delivery_days: number;
    }>
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const items = await this.getCartItems(userId);
      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      const breakdown = await this.getCartPriceBreakdown(userId);
      const providerId = items[0].listing?.provider_id;

      if (!providerId) {
        throw new Error('Invalid provider');
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: userId,
          provider_id: providerId,
          title: `Order with ${items.length} items`,
          description: 'Multi-item order from cart',
          scheduled_date: new Date().toISOString().split('T')[0],
          location: '',
          price: breakdown.subtotal,
          status: 'Requested',
          payment_status: 'Pending',
          platform_fee: breakdown.platformFee,
          provider_payout: breakdown.subtotal - breakdown.platformFee,
          order_type: items[0].listing_type === 'CustomService' ? 'CustomService' : 'Service',
          fulfillment_type: items[0].fulfillment_option_id ? 'Shipping' : undefined,
          shipping_cost: breakdown.shippingTotal,
          vas_total: breakdown.vasTotal,
          tax_amount: breakdown.taxAmount,
          subtotal: breakdown.subtotal,
          total_amount: breakdown.total,
          shipping_address_id: shippingAddressId,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const orderItems = items.map((item) => {
        const shippingRate = shippingRates?.find(r => r.cart_item_id === item.id);
        return {
          booking_id: booking.id,
          listing_id: item.listing_id,
          listing_type: item.listing_type,
          listing_title: item.listing?.title || 'Item',
          quantity: item.quantity,
          unit_price: item.price_snapshot.base_price,
          custom_options: item.custom_options,
          selected_vas: item.selected_vas,
          fulfillment_type: item.fulfillment_option_id ? 'Shipping' : undefined,
          shipping_cost: item.price_snapshot.estimated_shipping,
          selected_shipping_carrier: shippingRate?.carrier,
          selected_shipping_service: shippingRate?.service_type,
          selected_shipping_rate: shippingRate?.rate,
          estimated_delivery_days: shippingRate?.delivery_days,
          subtotal: item.price_snapshot.base_price * item.quantity + item.price_snapshot.vas_total,
          total: item.price_snapshot.base_price * item.quantity + item.price_snapshot.vas_total + item.price_snapshot.estimated_shipping,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await this.clearCart(userId);

      return {
        success: true,
        order: booking,
      };
    } catch (error: any) {
      console.error('Error creating order from cart:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  static async validateCart(userId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const items = await this.getCartItems(userId);
      const errors: string[] = [];

      if (items.length === 0) {
        errors.push('Cart is empty');
        return { valid: false, errors };
      }

      for (const item of items) {
        const { data: listing } = await supabase
          .from('service_listings')
          .select('*')
          .eq('id', item.listing_id)
          .single();

        if (!listing) {
          errors.push(`Listing ${item.listing_id} not found`);
          continue;
        }

        if (!listing.is_active) {
          errors.push(`${listing.title} is no longer available`);
        }

        if (item.listing_type === 'CustomService' && item.custom_options) {
          const options = await ValueAddedServicesManager.getCustomServiceOptions(
            item.listing_id
          );
          const validation = ValueAddedServicesManager.validateCustomOptions(
            item.custom_options,
            options
          );
          if (!validation.valid) {
            errors.push(...validation.errors);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        valid: false,
        errors: ['Failed to validate cart'],
      };
    }
  }
}

export default CartService;
