import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react-native';
import { CartItem } from '../types/database';
import { CartService } from '../lib/cart';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function CartSummary() {
  const { user } = useAuth();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  async function loadCart() {
    if (!user) return;

    setLoading(true);
    const items = await CartService.getCartItems(user.id);
    const priceBreakdown = await CartService.getCartPriceBreakdown(user.id);
    setCartItems(items);
    setBreakdown(priceBreakdown);
    setLoading(false);
  }

  async function updateQuantity(itemId: string, newQuantity: number) {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    await CartService.updateCartItem(itemId, { quantity: newQuantity });
    loadCart();
  }

  async function removeItem(itemId: string) {
    Alert.alert('Remove Item', 'Remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await CartService.removeFromCart(itemId);
          loadCart();
        },
      },
    ]);
  }

  async function proceedToCheckout() {
    const validation = await CartService.validateCart(user!.id);
    if (!validation.valid) {
      Alert.alert('Cart Error', validation.errors.join('\n'));
      return;
    }

    router.push('/checkout');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ShoppingCart size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>
          Browse services and add items to your cart
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)/index?filter=Service')}
        >
          <Text style={styles.browseButtonText}>Browse Services</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Shopping Cart</Text>
          <Text style={styles.itemCount}>{cartItems.length} items</Text>
        </View>

        {cartItems.map((item: any) => (
          <View key={item.id} style={styles.cartItem}>
            {item.listing?.photos?.[0] && (
              <Image
                source={{ uri: item.listing.photos[0] }}
                style={styles.itemImage}
              />
            )}

            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle}>{item.listing?.title}</Text>
              {item.listing_type === 'CustomService' && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              )}

              {item.custom_options &&
                Object.keys(item.custom_options).length > 0 && (
                  <View style={styles.optionsContainer}>
                    <Text style={styles.optionsLabel}>Selections:</Text>
                    {Object.entries(item.custom_options).map(([key, value], index) => (
                      <Text key={index} style={styles.itemOptions}>
                        • {key}: {value}
                      </Text>
                    ))}
                  </View>
                )}

              {item.selected_vas && item.selected_vas.length > 0 && (
                <Text style={styles.itemVAS}>
                  + {item.selected_vas.length} extra service
                  {item.selected_vas.length > 1 ? 's' : ''}
                </Text>
              )}

              <Text style={styles.itemPrice}>
                ${Math.round(item.price_snapshot.base_price).toLocaleString('en-US')}
              </Text>
            </View>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
              >
                <Minus size={16} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
              >
                <Plus size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(item.id)}
            >
              <Trash2 size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {breakdown && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>
              ${Math.round(breakdown.itemsTotal).toLocaleString('en-US')}
            </Text>
          </View>

          {breakdown.vasTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extra Services</Text>
              <Text style={styles.summaryValue}>
                ${Math.round(breakdown.vasTotal).toLocaleString('en-US')}
              </Text>
            </View>
          )}

          {breakdown.shippingTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>
                ${Math.round(breakdown.shippingTotal).toLocaleString('en-US')}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>
              ${Math.round(breakdown.taxAmount).toLocaleString('en-US')}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>
              ${Math.round(breakdown.total).toLocaleString('en-US')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={proceedToCheckout}
          >
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  customBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  customBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  optionsContainer: {
    marginBottom: 4,
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
    marginBottom: 2,
    lineHeight: 16,
  },
  itemVAS: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 12,
  },
  removeButton: {
    justifyContent: 'center',
  },
  summaryContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
