# Frontend Integration Guide - Custom Service Payments

Quick reference for integrating the Custom Service payment flow into your React Native app.

---

## Setup

The payment libraries are already configured in `lib/custom-service-payments.ts`. All functions are ready to use.

---

## Step-by-Step Integration

### 1. **Customer Checkout - Create Authorization Hold**

When customer confirms order and proceeds to payment:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { StripePaymentSheet } from '@/components/StripePaymentSheet';

// In your checkout component
const handleCheckout = async () => {
  try {
    // 1. Create authorization hold
    const result = await CustomServicePayments.createAuthorizationHold({
      productionOrderId: order.id,
      customerId: user.id,
      providerId: order.provider_id,
      amount: estimatedPrice,
      description: `Custom ${order.product_type}`,
      metadata: {
        order_type: 'custom_service',
      },
    });

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    // 2. Show Stripe payment sheet for confirmation
    const { error: paymentError } = await presentPaymentSheet({
      clientSecret: result.clientSecret,
    });

    if (paymentError) {
      Alert.alert('Payment Failed', paymentError.message);
      return;
    }

    // 3. Success! Authorization hold placed
    Alert.alert(
      'Order Confirmed',
      'Authorization hold placed. Provider will review your order.'
    );

    navigation.navigate('OrderTracking', { orderId: order.id });
  } catch (error) {
    console.error('Checkout error:', error);
    Alert.alert('Error', 'Failed to process payment');
  }
};
```

**UI Requirements:**
- Show "Estimated Price: $XX.XX"
- Display message: "This places a hold on your card but doesn't charge you yet"
- Show "Your card will be charged when provider confirms the order"

---

### 2. **Provider Proposes Price**

When provider reviews requirements and proposes final price:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';

const handleProposePrice = async (orderId: string, newPrice: number, reason: string) => {
  try {
    const result = await CustomServicePayments.proposePrice(
      orderId,
      newPrice,
      reason
    );

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    Alert.alert(
      'Price Proposed',
      `Final price of $${newPrice.toFixed(2)} sent to customer for approval`
    );
  } catch (error) {
    Alert.alert('Error', 'Failed to propose price');
  }
};
```

**UI Requirements:**
- Input field for final price
- Textarea for reason/explanation
- Show difference from estimated price
- Confirmation before submitting

---

### 3. **Customer Approves Price**

When customer receives price proposal and approves:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';

const handleApprovePrice = async (orderId: string) => {
  try {
    const result = await CustomServicePayments.approvePrice(orderId);

    if (result.needsReauthorization) {
      Alert.alert(
        'Authorization Expired',
        'Your payment authorization has expired. Please reauthorize.',
        [
          {
            text: 'Reauthorize',
            onPress: () => handleReauthorization(orderId),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    Alert.alert(
      'Price Approved',
      'Provider has been notified. They will mark your order as received to begin production.'
    );
  } catch (error) {
    Alert.alert('Error', 'Failed to approve price');
  }
};
```

**UI Requirements:**
- Show original estimate vs final price
- Display price difference clearly (increase/decrease)
- Show provider's reason for change
- Prominent "Approve" and "Decline" buttons
- If price increased, show additional authorization message

---

### 4. **Provider Marks Order Received (Captures Payment)**

When provider confirms order and is ready to begin production:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';

const handleMarkOrderReceived = async (orderId: string) => {
  try {
    const result = await CustomServicePayments.markOrderReceived(orderId);

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    Alert.alert(
      'Order Received',
      'Payment captured. You can now begin production. Payout scheduled in 14 days.'
    );

    navigation.navigate('ProductionDashboard', { orderId });
  } catch (error) {
    Alert.alert('Error', 'Failed to mark order as received');
  }
};
```

**UI Requirements:**
- Show final approved price
- Warning: "This will charge the customer's card"
- Confirmation modal before capture
- Success message with payout timeline

---

### 5. **Cancel Order (Before Capture)**

When customer or provider cancels before payment is captured:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';

const handleCancelOrder = async (orderId: string, paymentIntentId: string, reason: string) => {
  try {
    const result = await CustomServicePayments.cancelAuthorization(
      orderId,
      paymentIntentId,
      reason
    );

    if (!result.success) {
      Alert.alert('Error', result.error);
      return;
    }

    Alert.alert(
      'Order Cancelled',
      'Authorization hold has been released. No charges were made.'
    );

    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', 'Failed to cancel order');
  }
};
```

**UI Requirements:**
- Show current refund policy
- Textarea for cancellation reason
- Warning about hold release timing
- Confirmation before cancelling

---

### 6. **Refund Order (After Capture)**

When refund is needed after payment was captured:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { CustomServicePricing } from '@/lib/custom-service-pricing';

const handleRefundOrder = async (orderId: string, reason: string) => {
  try {
    // Get order details
    const { data: order } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');

    // Calculate refund amount based on policy
    const refundAmount = CustomServicePricing.getRefundAmount(
      order.final_price,
      order.refund_policy,
      order.shipping_cost || 0
    );

    if (refundAmount === 0) {
      Alert.alert('Not Refundable', 'This order is no longer eligible for refund.');
      return;
    }

    // Confirm with user
    Alert.alert(
      'Confirm Refund',
      `Refund amount: $${refundAmount.toFixed(2)}\nPolicy: ${CustomServicePricing.formatRefundPolicy(order.refund_policy)}`,
      [
        {
          text: 'Refund',
          onPress: async () => {
            const result = await CustomServicePayments.refundOrder(
              orderId,
              reason,
              refundAmount
            );

            if (!result.success) {
              Alert.alert('Error', result.error);
              return;
            }

            Alert.alert(
              'Refund Processed',
              `$${result.refundedAmount?.toFixed(2)} will be returned to your card in 5-10 business days.`
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  } catch (error) {
    Alert.alert('Error', 'Failed to process refund');
  }
};
```

**UI Requirements:**
- Display current refund policy prominently
- Show refund amount calculation
- Textarea for refund reason
- Warning about processing time
- Confirmation before submitting

---

### 7. **Check Authorization Status**

Periodically check if authorization is still valid:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';
import { CustomServicePricing } from '@/lib/custom-service-pricing';

const checkAuthorizationStatus = async (order: any) => {
  if (!order.payment_intent_id) return;

  try {
    const result = await CustomServicePayments.checkAuthorizationStatus(
      order.payment_intent_id
    );

    if (result.error) {
      console.error('Status check failed:', result.error);
      return;
    }

    // Check if needs reauthorization
    const needsReauth = CustomServicePricing.needsReauthorization(
      order.status,
      order.authorization_expires_at,
      order.payment_captured_at
    );

    if (needsReauth || !result.isValid) {
      Alert.alert(
        'Authorization Expired',
        'Your payment authorization has expired. Please reauthorize to continue.',
        [
          {
            text: 'Reauthorize Now',
            onPress: () => handleReauthorization(order.id),
          },
          { text: 'Later', style: 'cancel' },
        ]
      );
    }
  } catch (error) {
    console.error('Error checking status:', error);
  }
};

// Call this when order screen mounts
useEffect(() => {
  if (order && ['procurement_started', 'price_proposed', 'price_approved'].includes(order.status)) {
    checkAuthorizationStatus(order);
  }
}, [order]);
```

**UI Requirements:**
- Show authorization expiry countdown
- Display "Reauthorize" button when expired
- Badge showing authorization status
- Warning when expiry is near (<24 hours)

---

## UI Components Needed

### 1. **PriceApprovalModal**

```typescript
interface PriceApprovalModalProps {
  visible: boolean;
  order: ProductionOrder;
  onApprove: () => void;
  onDecline: () => void;
}

// Shows:
// - Original estimate
// - Proposed price
// - Difference (+ or -)
// - Provider's reason
// - "Approve" and "Decline" buttons
```

### 2. **AuthorizationStatusBadge**

```typescript
interface AuthorizationStatusBadgeProps {
  status: string;
  expiresAt?: string;
  isCaptured: boolean;
}

// Shows:
// - "Authorized" (green)
// - "Expiring Soon" (yellow)
// - "Expired" (red)
// - "Captured" (blue)
```

### 3. **RefundPolicyCard**

```typescript
interface RefundPolicyCardProps {
  policy: RefundPolicy;
  finalPrice: number;
  shippingCost: number;
}

// Shows:
// - Refund policy label
// - Refundable amount
// - Policy explanation
// - Colored indicator
```

### 4. **PaymentTimelineCard**

```typescript
interface PaymentTimelineCardProps {
  order: ProductionOrder;
}

// Shows:
// - Authorization date
// - Price approval date
// - Capture date
// - Expected payout date
// - All payment events
```

---

## Helper Functions

### **Format Currency**

```typescript
import { formatCurrency } from '@/lib/currency-utils';

const displayPrice = formatCurrency(50.00, 'USD');
// Output: "$50.00"
```

### **Calculate Price Difference**

```typescript
const calculatePriceDiff = (original: number, proposed: number) => {
  const diff = proposed - original;
  const percentage = ((diff / original) * 100).toFixed(1);
  const sign = diff > 0 ? '+' : '';

  return {
    amount: Math.abs(diff),
    isIncrease: diff > 0,
    formatted: `${sign}$${Math.abs(diff).toFixed(2)}`,
    percentage: `${sign}${percentage}%`,
  };
};
```

### **Format Authorization Expiry**

```typescript
const formatExpiryCountdown = (expiresAt: string) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 1) return `${days} days`;
  if (days === 1) return '1 day';
  if (hours > 1) return `${hours} hours`;
  return 'Less than 1 hour';
};
```

---

## Error Handling

### **Common Errors & Solutions**

```typescript
const handlePaymentError = (error: string) => {
  switch (true) {
    case error.includes('Authorization expired'):
      return {
        title: 'Authorization Expired',
        message: 'Please reauthorize payment to continue.',
        action: 'Reauthorize',
      };

    case error.includes('Unauthorized'):
      return {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        action: null,
      };

    case error.includes('not found'):
      return {
        title: 'Order Not Found',
        message: 'This order may have been cancelled or deleted.',
        action: null,
      };

    case error.includes('non-refundable'):
      return {
        title: 'Cannot Refund',
        message: 'This order is no longer eligible for refund.',
        action: null,
      };

    default:
      return {
        title: 'Error',
        message: error || 'Something went wrong. Please try again.',
        action: 'Retry',
      };
  }
};
```

---

## Testing Checklist

- [ ] Authorization hold creation
- [ ] Payment sheet confirmation
- [ ] Price proposal from provider
- [ ] Customer price approval (same price)
- [ ] Customer price approval (price increase)
- [ ] Customer price approval (price decrease)
- [ ] Provider marks order received (captures payment)
- [ ] Cancel before capture (hold released)
- [ ] Refund after capture (full refund)
- [ ] Refund after capture (partial refund)
- [ ] Authorization expiry detection
- [ ] Reauthorization flow
- [ ] Status checking
- [ ] Error handling for all scenarios
- [ ] Wallet transaction recording
- [ ] Timeline event creation
- [ ] Payout schedule creation

---

## Next Steps

1. Create the UI components listed above
2. Integrate payment flows into existing order screens
3. Add notifications for price proposals and approvals
4. Implement authorization expiry monitoring
5. Test with Stripe test cards
6. Add analytics tracking for payment events

---

## 📞 Need Help?

Refer to:
- `CUSTOM_SERVICE_PAYMENT_FLOW_IMPLEMENTATION.md` - Complete system overview
- `STRIPE_EDGE_FUNCTIONS_DEPLOYED.md` - Edge functions documentation
- `lib/custom-service-payments.ts` - Payment logic
- `lib/custom-service-pricing.ts` - Pricing utilities
- `lib/custom-service-availability.ts` - Availability validation

The payment system is fully implemented and ready for UI integration!
