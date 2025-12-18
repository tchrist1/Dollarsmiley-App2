# Stripe Edge Functions - Deployment Complete ✅

All 6 Stripe Edge Functions for Custom Service payment flow have been successfully deployed to Supabase.

---

## Deployed Functions

### 1. **create-custom-service-authorization** ✅
**Endpoint:** `{SUPABASE_URL}/functions/v1/create-custom-service-authorization`

**Purpose:** Creates a Stripe PaymentIntent with manual capture to place an authorization hold on the customer's card.

**Request:**
```json
{
  "productionOrderId": "uuid",
  "customerId": "uuid",
  "providerId": "uuid",
  "amount": 5000,  // Amount in cents
  "description": "Custom T-Shirt Order",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentIntentId": "pi_...",
  "clientSecret": "pi_..._secret_..."
}
```

**Features:**
- Places 7-day authorization hold
- Validates provider has Stripe Connect account
- Creates wallet transaction record
- Returns client secret for payment confirmation

---

### 2. **capture-custom-service-payment** ✅
**Endpoint:** `{SUPABASE_URL}/functions/v1/capture-custom-service-payment`

**Purpose:** Captures the authorized payment when provider marks order as "received".

**Request:**
```json
{
  "productionOrderId": "uuid",
  "paymentIntentId": "pi_...",
  "amountToCapture": 5000  // Amount in cents (can be less than authorized)
}
```

**Response:**
```json
{
  "success": true,
  "capturedAmount": 50.00,
  "paymentIntentId": "pi_..."
}
```

**Features:**
- Validates order status is `price_approved`
- Only provider can capture payment
- Creates payout schedule (14-day hold for CustomService)
- Deducts 15% platform fee
- Records transactions for both customer and provider
- Can capture less than authorized amount

---

### 3. **increment-custom-service-authorization** ✅
**Endpoint:** `{SUPABASE_URL}/functions/v1/increment-custom-service-authorization`

**Purpose:** Increases the authorization amount when provider proposes a higher price and customer approves.

**Request:**
```json
{
  "paymentIntentId": "pi_...",
  "incrementAmount": 1000,  // Additional amount in cents
  "reason": "Additional customization requested"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authorization incremented successfully"
}
```

**Or if incremental auth fails:**
```json
{
  "success": false,
  "requiresNewAuthorization": true,
  "error": "Cannot increment authorization. New authorization required."
}
```

**Features:**
- Only customer can approve price increases
- Attempts Stripe incremental authorization
- Handles cases where incremental auth is not available
- Returns flag for reauthorization requirement

---

### 4. **cancel-custom-service-authorization** ✅
**Endpoint:** `{SUPABASE_URL}/functions/v1/cancel-custom-service-authorization`

**Purpose:** Cancels the PaymentIntent and releases the authorization hold before capture.

**Request:**
```json
{
  "paymentIntentId": "pi_...",
  "reason": "Customer cancelled order"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authorization cancelled and hold released",
  "paymentIntentId": "pi_..."
}
```

**Features:**
- Can be called by customer or provider
- Prevents cancellation if payment already captured
- Updates wallet transaction status to "Cancelled"
- Creates timeline event for audit trail
- Immediately releases hold on customer's card

---

### 5. **refund-custom-service** ✅
**Endpoint:** `{SUPABASE_URL}/functions/v1/refund-custom-service`

**Purpose:** Processes refund after payment has been captured.

**Request:**
```json
{
  "paymentIntentId": "pi_...",
  "amount": 5000,  // Amount in cents (optional, defaults to full amount)
  "reason": "Quality issue - customer not satisfied"
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "re_...",
  "refundedAmount": 50.00
}
```

**Features:**
- Validates refund policy (non_refundable orders cannot be refunded)
- Can process full or partial refunds
- Updates wallet transactions for both customer and provider
- Cancels scheduled payout
- Creates timeline event for audit trail
- Admin can override refund restrictions

---

### 6. **check-payment-intent-status** ✅
**Endpoint:** `{SUPABASE_URL}/functions/v1/check-payment-intent-status`

**Purpose:** Checks the current status of a PaymentIntent and determines if reauthorization is needed.

**Request:**
```json
{
  "paymentIntentId": "pi_..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "requires_capture",
  "isValid": true,
  "isExpired": false,
  "isCaptured": false,
  "isCanceled": false,
  "expiresAt": 1703980800,
  "authorizedAmount": 50.00,
  "capturedAmount": 0,
  "currency": "usd",
  "created": 1703376000,
  "metadata": {
    "production_order_id": "uuid",
    "customer_id": "uuid",
    "provider_id": "uuid"
  },
  "needsReauthorization": false
}
```

**Features:**
- Retrieves current PaymentIntent status from Stripe
- Calculates expiry date (7 days from creation)
- Determines if reauthorization is needed
- Can be called by customer or provider
- Returns comprehensive status information

---

## Authorization & Security

All functions require authentication via JWT token:

```typescript
headers: {
  'Authorization': `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
}
```

**Access Control:**
- **create-custom-service-authorization**: Only customer who owns the order
- **capture-custom-service-payment**: Only provider assigned to the order
- **increment-custom-service-authorization**: Only customer (for approval)
- **cancel-custom-service-authorization**: Customer or provider
- **refund-custom-service**: Customer, provider, or admin
- **check-payment-intent-status**: Customer or provider

---

## CORS Configuration

All functions include proper CORS headers:
```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
}
```

---

## Environment Variables (Auto-Configured)

These are automatically available in all functions:
- `STRIPE_SECRET_KEY` - Stripe API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

---

## Payment Flow Integration

### **Complete Custom Service Payment Journey**

```
1. Customer Adds to Cart
   ↓

2. Customer Proceeds to Checkout
   ↓ Call: create-custom-service-authorization

3. Authorization Hold Placed ($50)
   Status: procurement_started
   ↓

4. Provider Reviews & Proposes Price ($55)
   Status: price_proposed
   ↓

5. Customer Approves Price Increase
   ↓ Call: increment-custom-service-authorization (+$5)

6. Authorization Increased to $55
   Status: price_approved
   ↓

7. Provider Marks Order Received
   ↓ Call: capture-custom-service-payment

8. Payment Captured ($55)
   Status: order_received
   ↓

9. Production Begins
   Status: in_production
   ↓

10. Order Completed
    Status: completed
    ↓

11. Payout Scheduled (14 days after capture)
    Provider receives: $46.75 (85% of $55)
    Platform fee: $8.25 (15%)
```

### **Alternative Flow: Cancellation Before Capture**

```
3. Authorization Hold Placed ($50)
   Status: procurement_started
   ↓

4. Customer Decides to Cancel
   ↓ Call: cancel-custom-service-authorization

5. Hold Released, No Charge
   Status: cancelled
```

### **Alternative Flow: Refund After Capture**

```
8. Payment Captured ($55)
   Status: order_received
   ↓

9. Quality Issue Discovered
   ↓ Call: refund-custom-service (partial: $30)

10. Partial Refund Processed
    Customer receives: $30
    Provider keeps: $25 (after platform fee)
    Scheduled payout adjusted
```

---

## Error Handling

All functions return consistent error format:

```json
{
  "error": "Human-readable error message"
}
```

**Common Error Scenarios:**

1. **Authorization Expired**
   - Error: "Authorization expired. Please reauthorize payment."
   - Solution: Create new authorization with `create-custom-service-authorization`

2. **Incremental Auth Failed**
   - Response: `{ "requiresNewAuthorization": true }`
   - Solution: Cancel old PI and create new one for full amount

3. **Refund Policy Violation**
   - Error: "Order is non-refundable based on current status"
   - Solution: Check refund policy, only admin can override

4. **Payment Already Captured**
   - Error: "Cannot cancel: Payment already captured"
   - Solution: Use refund function instead

5. **Unauthorized Access**
   - Error: "Unauthorized: Only provider can capture payment"
   - Solution: Verify user role and order ownership

---

## Testing

### **Test Authorization Hold**
```bash
curl -X POST \
  '{SUPABASE_URL}/functions/v1/create-custom-service-authorization' \
  -H 'Authorization: Bearer {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "productionOrderId": "test-order-id",
    "customerId": "test-customer-id",
    "providerId": "test-provider-id",
    "amount": 5000,
    "description": "Test Custom Service"
  }'
```

### **Test Payment Capture**
```bash
curl -X POST \
  '{SUPABASE_URL}/functions/v1/capture-custom-service-payment' \
  -H 'Authorization: Bearer {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "productionOrderId": "test-order-id",
    "paymentIntentId": "pi_test_...",
    "amountToCapture": 5000
  }'
```

### **Test Status Check**
```bash
curl -X POST \
  '{SUPABASE_URL}/functions/v1/check-payment-intent-status' \
  -H 'Authorization: Bearer {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "paymentIntentId": "pi_test_..."
  }'
```

---

## Database Integration

### **Tables Updated by Functions**

**wallet_transactions:**
- Authorization hold creation
- Payment capture
- Refund processing
- Provider earnings tracking

**payout_schedules:**
- Created on payment capture
- 14-day hold period for CustomService
- Cancelled on refund

**production_timeline_events:**
- Authorization cancelled
- Payment captured
- Refund processed
- All major payment events

---

## Platform Fees & Payouts

**Fee Structure:**
- Platform Fee: 15% of transaction amount
- Provider Receives: 85% of transaction amount

**Payout Schedule:**
- Jobs: 7 days after completion
- Services: 14 days after completion
- Custom Services: 14 days after completion

**Example:**
```
Customer pays: $50.00
Platform fee: $7.50 (15%)
Provider gets: $42.50 (85%)
Payout date: 14 days after capture
```

---

## Monitoring & Logs

### **Function Logs**
View logs in Supabase Dashboard:
- Navigate to Edge Functions
- Select function
- View Logs tab

### **Key Metrics to Monitor**
- Authorization success rate
- Capture success rate
- Incremental auth success rate
- Refund frequency
- Average authorization duration
- Expiry rate (authorizations that expire uncaptured)

### **Alerts to Set Up**
- High refund rate (>10%)
- Authorization expiry rate (>5%)
- Capture failures
- Incremental auth failures

---

## Next Steps

1. **UI Integration**
   - Implement payment confirmation modal
   - Add price approval interface
   - Show authorization status
   - Display refund policy

2. **Notifications**
   - Email on authorization hold
   - SMS on price proposal
   - Push notification on capture
   - Alert on authorization expiry

3. **Admin Dashboard**
   - View all active authorizations
   - Monitor expired authorizations
   - Process manual refunds
   - Override refund policies

4. **Analytics**
   - Track payment flow metrics
   - Monitor conversion rates
   - Analyze refund reasons
   - Provider performance metrics

---

## Support & Troubleshooting

### **Common Issues**

**Q: Authorization expired, what happens?**
A: Call `check-payment-intent-status` to verify. If expired, create new authorization with `create-custom-service-authorization`.

**Q: Incremental auth failed, now what?**
A: Function returns `requiresNewAuthorization: true`. Cancel existing PI and create new one for full new amount.

**Q: Can I refund partially?**
A: Yes! Pass `amount` parameter to `refund-custom-service` with amount in cents.

**Q: What if provider doesn't have Stripe Connect?**
A: Authorization creation will fail. Provider must complete Stripe Connect onboarding first.

**Q: How long until authorization expires?**
A: 7 days from creation. Check `expiresAt` field in status response.

---

## 🎉 Deployment Complete!

All 6 Stripe Edge Functions are now live and ready for integration with your custom service payment flow.

**Functions Deployed:**
✅ create-custom-service-authorization
✅ capture-custom-service-payment
✅ increment-custom-service-authorization
✅ cancel-custom-service-authorization
✅ refund-custom-service
✅ check-payment-intent-status

**Next:** Integrate these functions into your frontend using the examples and documentation provided above.
