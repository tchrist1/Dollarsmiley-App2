import { supabase } from './supabase';
import { PersonalizationService } from './personalization';
import { PersonalizationSubmission, PersonalizationSnapshot } from '../types/database';

export interface CartItem {
  id: string;
  user_id: string;
  listing_id: string;
  listing_type: 'Service' | 'CustomService';
  quantity: number;
  custom_options: Record<string, any>;
  selected_vas: any[];
  fulfillment_option_id?: string;
  shipping_address_id?: string;
  price_snapshot: {
    base_price: number;
    options_total: number;
    vas_total: number;
    estimated_shipping: number;
    personalization_total?: number;
  };
  personalization_snapshot_id?: string;
  has_personalization?: boolean;
  created_at: string;
}

export interface NormalizedCartItem extends CartItem {
  unit_index?: number;
  parent_cart_item_id?: string;
}

export interface CartItemWithPersonalization extends CartItem {
  personalization_snapshot?: PersonalizationSnapshot;
}

export class CustomServiceCart {
  static async addToCart(
    userId: string,
    listingId: string,
    listingType: 'Service' | 'CustomService',
    quantity: number,
    customOptions: Record<string, any>,
    selectedVas: any[],
    fulfillmentOptionId?: string,
    shippingAddressId?: string,
    priceSnapshot?: any
  ): Promise<{ success: boolean; itemIds?: string[]; error?: string }> {
    try {
      if (listingType === 'CustomService' && quantity > 1) {
        const itemIds = await this.normalizeCustomServiceQuantity(
          userId,
          listingId,
          quantity,
          customOptions,
          selectedVas,
          fulfillmentOptionId,
          shippingAddressId,
          priceSnapshot
        );

        return {
          success: true,
          itemIds,
        };
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          listing_id: listingId,
          listing_type: listingType,
          quantity,
          custom_options: customOptions,
          selected_vas: selectedVas,
          fulfillment_option_id: fulfillmentOptionId,
          shipping_address_id: shippingAddressId,
          price_snapshot: priceSnapshot || {
            base_price: 0,
            options_total: 0,
            vas_total: 0,
            estimated_shipping: 0,
          },
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        itemIds: [data.id],
      };
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: error.message || 'Failed to add item to cart',
      };
    }
  }

  private static async normalizeCustomServiceQuantity(
    userId: string,
    listingId: string,
    quantity: number,
    customOptions: Record<string, any>,
    selectedVas: any[],
    fulfillmentOptionId?: string,
    shippingAddressId?: string,
    priceSnapshot?: any
  ): Promise<string[]> {
    const items = [];

    for (let i = 0; i < quantity; i++) {
      items.push({
        user_id: userId,
        listing_id: listingId,
        listing_type: 'CustomService',
        quantity: 1,
        custom_options: { ...customOptions, unit_index: i + 1 },
        selected_vas: selectedVas,
        fulfillment_option_id: fulfillmentOptionId,
        shipping_address_id: shippingAddressId,
        price_snapshot: priceSnapshot || {
          base_price: 0,
          options_total: 0,
          vas_total: 0,
          estimated_shipping: 0,
        },
      });
    }

    const { data, error } = await supabase
      .from('cart_items')
      .insert(items)
      .select('id');

    if (error) throw error;

    return data.map((item: any) => item.id);
  }

  static async getCartItems(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting cart items:', error);
      return [];
    }
  }

  static async updateCartItemQuantity(
    cartItemId: string,
    newQuantity: number,
    listingType: 'Service' | 'CustomService'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (listingType === 'CustomService') {
        return {
          success: false,
          error:
            'Custom service quantities cannot be changed. Please remove and re-add with desired quantity.',
        };
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating cart item quantity:', error);
      return {
        success: false,
        error: error.message || 'Failed to update quantity',
      };
    }
  }

  static async removeCartItem(cartItemId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing cart item:', error);
      return { success: false };
    }
  }

  static async clearCart(userId: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false };
    }
  }

  static calculateCartTotal(items: CartItem[]): {
    subtotal: number;
    shipping: number;
    total: number;
    itemCount: number;
  } {
    let subtotal = 0;
    let shipping = 0;
    let itemCount = 0;

    items.forEach((item) => {
      const itemTotal =
        item.price_snapshot.base_price +
        item.price_snapshot.options_total +
        item.price_snapshot.vas_total;

      subtotal += itemTotal * item.quantity;
      shipping += item.price_snapshot.estimated_shipping * item.quantity;
      itemCount += item.quantity;
    });

    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
      itemCount,
    };
  }

  static groupCustomServiceItems(items: CartItem[]): Map<string, CartItem[]> {
    const grouped = new Map<string, CartItem[]>();

    items.forEach((item) => {
      if (item.listing_type === 'CustomService') {
        const key = `${item.listing_id}_${JSON.stringify(item.custom_options)}_${JSON.stringify(item.selected_vas)}`;

        if (!grouped.has(key)) {
          grouped.set(key, []);
        }

        grouped.get(key)!.push(item);
      }
    });

    return grouped;
  }

  static async validateCartForCheckout(
    userId: string
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const items = await this.getCartItems(userId);

      if (items.length === 0) {
        errors.push('Cart is empty');
        return { isValid: false, errors, warnings };
      }

      for (const item of items) {
        const { data: listing } = await supabase
          .from('service_listings')
          .select('is_active, listing_type')
          .eq('id', item.listing_id)
          .single();

        if (!listing) {
          errors.push(`Listing ${item.listing_id} no longer exists`);
          continue;
        }

        if (!listing.is_active) {
          errors.push(`Item "${item.listing_id}" is no longer available`);
        }

        if (item.listing_type === 'CustomService') {
          if (!item.fulfillment_option_id) {
            errors.push('Custom service requires fulfillment option selection');
          }

          if (item.quantity !== 1) {
            warnings.push(
              'Custom service items should have quantity of 1. Consider normalizing.'
            );
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        isValid: false,
        errors: ['Failed to validate cart'],
        warnings,
      };
    }
  }

  static async migrateExistingCartItems(userId: string): Promise<{
    migrated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migrated = 0;

    try {
      const items = await this.getCartItems(userId);

      for (const item of items) {
        if (item.listing_type === 'CustomService' && item.quantity > 1) {
          try {
            await this.removeCartItem(item.id);

            await this.normalizeCustomServiceQuantity(
              userId,
              item.listing_id,
              item.quantity,
              item.custom_options,
              item.selected_vas,
              item.fulfillment_option_id,
              item.shipping_address_id,
              item.price_snapshot
            );

            migrated++;
          } catch (error: any) {
            errors.push(`Failed to migrate item ${item.id}: ${error.message}`);
          }
        }
      }

      return { migrated, errors };
    } catch (error: any) {
      console.error('Error migrating cart items:', error);
      return {
        migrated,
        errors: [error.message || 'Migration failed'],
      };
    }
  }

  static async addToCartWithPersonalization(
    userId: string,
    listingId: string,
    providerId: string,
    customOptions: Record<string, any>,
    selectedVas: any[],
    personalizations: Partial<PersonalizationSubmission>[],
    fulfillmentOptionId?: string,
    shippingAddressId?: string,
    priceSnapshot?: any
  ): Promise<{ success: boolean; cartItemId?: string; snapshotId?: string; error?: string }> {
    try {
      const { data: cartItem, error: cartError } = await supabase
        .from('cart_items')
        .insert({
          user_id: userId,
          listing_id: listingId,
          listing_type: 'CustomService',
          quantity: 1,
          custom_options: customOptions,
          selected_vas: selectedVas,
          fulfillment_option_id: fulfillmentOptionId,
          shipping_address_id: shippingAddressId,
          price_snapshot: priceSnapshot || {
            base_price: 0,
            options_total: 0,
            vas_total: 0,
            estimated_shipping: 0,
            personalization_total: 0,
          },
          has_personalization: personalizations.length > 0,
        })
        .select('id')
        .single();

      if (cartError) throw cartError;

      const cartItemId = cartItem.id;
      let snapshotId: string | undefined;

      if (personalizations.length > 0) {
        for (const personalization of personalizations) {
          await PersonalizationService.createSubmission(userId, listingId, {
            ...personalization,
            cart_item_id: cartItemId,
          });
        }

        snapshotId = await PersonalizationService.createSnapshot(
          cartItemId,
          userId,
          listingId,
          providerId
        );
      }

      return {
        success: true,
        cartItemId,
        snapshotId,
      };
    } catch (error: any) {
      console.error('Error adding to cart with personalization:', error);
      return {
        success: false,
        error: error.message || 'Failed to add item to cart',
      };
    }
  }

  static async getCartItemsWithPersonalization(userId: string): Promise<CartItemWithPersonalization[]> {
    try {
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          personalization_snapshots (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (cartItems || []).map((item: any) => ({
        ...item,
        personalization_snapshot: item.personalization_snapshots?.[0] || undefined,
      }));
    } catch (error) {
      console.error('Error getting cart items with personalization:', error);
      return [];
    }
  }

  static async transferPersonalizationToOrder(
    cartItemId: string,
    bookingId: string,
    productionOrderId?: string
  ): Promise<boolean> {
    try {
      return await PersonalizationService.transferToOrder(
        cartItemId,
        bookingId,
        productionOrderId
      );
    } catch (error) {
      console.error('Error transferring personalization to order:', error);
      return false;
    }
  }

  static async getPersonalizationSummary(cartItemId: string): Promise<{
    hasPersonalization: boolean;
    snapshot?: PersonalizationSnapshot;
    priceImpact: number;
  }> {
    try {
      const { data: cartItem } = await supabase
        .from('cart_items')
        .select('personalization_snapshot_id, has_personalization')
        .eq('id', cartItemId)
        .single();

      if (!cartItem?.personalization_snapshot_id) {
        return {
          hasPersonalization: false,
          priceImpact: 0,
        };
      }

      const { data: snapshot } = await supabase
        .from('personalization_snapshots')
        .select('*')
        .eq('id', cartItem.personalization_snapshot_id)
        .single();

      return {
        hasPersonalization: true,
        snapshot: snapshot || undefined,
        priceImpact: snapshot?.total_price_impact || 0,
      };
    } catch (error) {
      console.error('Error getting personalization summary:', error);
      return {
        hasPersonalization: false,
        priceImpact: 0,
      };
    }
  }
}

export default CustomServiceCart;
