# Custom Services: Consultation Timeout Customer Control

## Overview

When a Custom Service requires consultation and the provider fails to respond within 48 hours, the customer gains control to either proceed with the order at the original price or cancel for a full refund.

## How It Works

### 1. Consultation Timeout Detection

The system automatically detects when a consultation deadline has passed:

```typescript
// Cron job runs periodically to check for expired consultations
const result = await supabase.rpc('check_consultation_timeouts');
```

### 2. Customer Gains Control

When timeout is detected:
- Consultation status → `timed_out`
- `customer_can_decide` flag → `true`
- Timeline event created for audit trail
- Customer receives notification (to be implemented in UI)

### 3. Customer Options

#### Option A: Proceed at Original Price

Customer chooses to continue without consultation:

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';

const result = await CustomServicePayments.customerProceedAfterTimeout(
  productionOrderId,
  customerId
);

if (result.success) {
  // Order proceeds to pending_order_received
  // Provider can begin work
  // No refund issued
}
```

**What happens:**
- Consultation marked as `waived`
- Order status → `pending_order_received`
- Provider receives notification to begin work
- Order continues through normal Custom Services lifecycle

#### Option B: Cancel and Receive Full Refund

Customer chooses to cancel:

```typescript
const result = await CustomServicePayments.customerCancelAfterTimeout(
  productionOrderId,
  customerId
);

if (result.success) {
  // Order cancelled
  // Full refund processed automatically
  // refundAmount: result.refundAmount
}
```

**What happens:**
- Order status → `cancelled`
- Escrow funds refunded to customer (100%)
- No payout to provider
- Timeline shows cancellation reason
- Customer receives refund confirmation

### 4. Check Customer Options

To display available options to customer:

```typescript
const options = await CustomServicePayments.getCustomerTimeoutOptions(
  productionOrderId,
  customerId
);

if (options.customerCanDecide) {
  console.log('Customer can proceed:', options.canProceed);
  console.log('Customer can cancel:', options.canCancel);
  console.log('Original price:', options.originalPrice);
  console.log('Refund amount:', options.refundAmount);
}
```

## UI Implementation Guide

### Order Status Display

```typescript
const status = await CustomServicePayments.getOrderStatus(productionOrderId);

if (status.customerCanDecide) {
  // Show customer decision UI
  return (
    <ConsultationTimeoutCustomerDecision
      orderId={productionOrderId}
      originalPrice={status.order.escrow_amount}
      onProceed={handleProceed}
      onCancel={handleCancel}
    />
  );
}
```

### Decision Component Example

```tsx
function ConsultationTimeoutCustomerDecision({ orderId, originalPrice, onProceed, onCancel }) {
  return (
    <View>
      <Text>Provider Did Not Respond</Text>
      <Text>
        The provider has not responded to your consultation request within 48 hours.
        You have two options:
      </Text>

      <Button onPress={onProceed}>
        Proceed at ${originalPrice.toFixed(2)}
        <Text>Continue without consultation</Text>
      </Button>

      <Button onPress={onCancel}>
        Cancel and Get Full Refund
        <Text>Receive ${originalPrice.toFixed(2)} refund</Text>
      </Button>
    </View>
  );
}
```

## Business Rules

### Customer Protections

1. **Full Refund Guarantee**: Cancellation after timeout always results in 100% refund
2. **No Work Restriction**: Provider cannot start work without customer confirmation after timeout
3. **Proceed Lock**: After customer chooses to proceed, provider can begin immediately
4. **One-Time Decision**: Customer decision is final and cannot be changed

### Provider Constraints

1. **Cannot Override**: Provider cannot block or override customer's decision
2. **No Partial Refund**: If customer cancels, provider receives $0 payout
3. **Response Required**: Must respond to consultations within 48 hours to avoid timeout
4. **Honor Proceed**: If customer proceeds, provider must honor original quoted price

### System Guarantees

1. **Idempotent**: Functions can be called multiple times safely
2. **Atomic**: Decision is processed in single transaction
3. **Audit Trail**: All actions logged to production_timeline_events
4. **Clean Refunds**: No duplicate refunds or payments

## Timeline Events

The system creates these timeline events:

```
consultation_timed_out
  → Provider didn't respond within 48 hours

customer_proceeded_after_timeout
  → Customer chose to proceed at original price

customer_cancelled_after_timeout
  → Customer cancelled and received full refund
```

## Database Schema

### consultation_timeouts Table Additions

```sql
customer_decision         -- 'pending', 'proceed', 'cancel'
customer_decided_at       -- When decision was made
timeout_resolution        -- Final outcome
```

### custom_service_consultations Table Additions

```sql
customer_can_decide       -- boolean flag
```

## Testing Checklist

- [ ] System detects consultation timeout after 48 hours
- [ ] Customer receives timeout notification
- [ ] Customer can view both proceed and cancel options
- [ ] Proceed option works: order continues normally
- [ ] Cancel option works: full refund processed
- [ ] Provider notified when customer proceeds
- [ ] Provider receives no payout when customer cancels
- [ ] Timeline events created correctly
- [ ] Cannot proceed after cancelling
- [ ] Cannot cancel after proceeding
- [ ] Idempotent: repeated calls don't cause issues

## Error Handling

Common errors and solutions:

```typescript
// Error: "No timed out consultation found"
// Solution: Consultation hasn't timed out yet or decision already made

// Error: "Timeout decision already made"
// Solution: Customer already chose to proceed or cancel

// Error: "Cannot cancel - work has already started"
// Solution: Provider marked order as received before customer decided
// This shouldn't happen if system is working correctly

// Error: "Order not found or access denied"
// Solution: Wrong order ID or wrong customer ID
```

## Integration Points

### Notifications

When timeout occurs, send notification:

```typescript
await sendNotification({
  userId: customerId,
  type: 'consultation_timeout',
  title: 'Provider Did Not Respond',
  body: 'You can proceed with your order or cancel for a full refund',
  data: { productionOrderId }
});
```

### Analytics

Track timeout outcomes:

```typescript
analytics.track('consultation_timeout_decision', {
  productionOrderId,
  decision: 'proceed' | 'cancel',
  originalPrice,
  refundAmount: decision === 'cancel' ? originalPrice : 0
});
```

## Security Notes

- RLS policies ensure only the customer can make timeout decisions
- Functions are SECURITY DEFINER to prevent permission issues
- All database operations use transactions for consistency
- Customer ID verification prevents unauthorized actions

## Migration Applied

The consultation timeout customer control feature was added via migration:
`update_consultation_timeout_customer_control.sql`

All existing consultations are unaffected. Only new timeouts after this migration will have customer control enabled.
