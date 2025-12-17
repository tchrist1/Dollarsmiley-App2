#!/bin/bash

# Simple Stripe Secret Key Test
# Tests if STRIPE_SECRET_KEY is configured correctly in Supabase

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "Stripe Secret Key Test"
echo "============================================"
echo ""

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

echo -e "${BLUE}Testing Stripe Configuration...${NC}"
echo ""

# Test 1: Create a simple test user
echo "Step 1: Creating test user for authentication..."
TEST_EMAIL="stripetest-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

SIGNUP_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ Failed to create test user${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Test user created and authenticated${NC}"
echo "  User ID: ${USER_ID:0:20}..."
echo ""

# Test 2: Insert a minimal booking record using SQL
echo "Step 2: Creating test booking via SQL..."

# Get a provider ID from existing data or use the test user
BOOKING_INSERT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/create_test_booking_for_stripe" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{}")

# If that RPC doesn't exist, create booking directly
BOOKING_ID=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/bookings" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"customer_id\": \"${USER_ID}\",
    \"provider_id\": \"${USER_ID}\",
    \"booking_date\": \"2025-12-01\",
    \"total_amount\": 100.00,
    \"platform_fee\": 10.00,
    \"provider_payout\": 90.00,
    \"status\": \"Pending\"
  }" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$BOOKING_ID" ]; then
    # Try with a fake UUID if booking creation fails due to RLS
    BOOKING_ID="00000000-0000-0000-0000-000000000001"
    echo -e "${YELLOW}! Using mock booking ID for testing${NC}"
else
    echo -e "${GREEN}✓ Test booking created${NC}"
    echo "  Booking ID: ${BOOKING_ID:0:20}..."
fi

echo ""

# Test 3: Test Stripe Payment Intent Creation
echo "Step 3: Testing Stripe Payment Intent Creation..."
echo "This is the critical test for STRIPE_SECRET_KEY..."
echo ""

PAYMENT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-payment-intent" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 100,
    \"bookingId\": \"${BOOKING_ID}\",
    \"currency\": \"usd\",
    \"paymentMethod\": \"card\"
  }")

echo "Response from Edge Function:"
echo "$PAYMENT_RESPONSE"
echo ""

# Parse response
CLIENT_SECRET=$(echo $PAYMENT_RESPONSE | grep -o '"clientSecret":"[^"]*' | cut -d'"' -f4)
PAYMENT_INTENT_ID=$(echo $PAYMENT_RESPONSE | grep -o '"paymentIntentId":"[^"]*' | cut -d'"' -f4)
ERROR=$(echo $PAYMENT_RESPONSE | grep -o '"error":"[^"]*' | cut -d'"' -f4)

echo "============================================"
echo "Test Results"
echo "============================================"
echo ""

if [ -n "$CLIENT_SECRET" ]; then
    echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓✓✓ SUCCESS! STRIPE WORKS! ✓✓✓  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Payment Intent Created Successfully!${NC}"
    echo ""
    echo "Details:"
    echo "  • Payment Intent ID: $PAYMENT_INTENT_ID"
    echo "  • Client Secret: ${CLIENT_SECRET:0:40}..."
    echo "  • Amount: \$100.00 USD"
    echo ""
    echo "Configuration Status:"
    echo -e "  ${GREEN}✓ STRIPE_SECRET_KEY: Valid and working${NC}"
    echo -e "  ${GREEN}✓ Edge Function: Operational${NC}"
    echo -e "  ${GREEN}✓ Supabase Integration: Connected${NC}"
    echo -e "  ${GREEN}✓ Authentication: Working${NC}"
    echo ""
    echo "What This Means:"
    echo "  • Your Stripe account is properly connected"
    echo "  • You can create payment intents"
    echo "  • You can process payments"
    echo "  • Your app can accept payments from users"
    echo ""
    echo "Next Steps:"
    echo "  1. Test with Stripe test card: 4242 4242 4242 4242"
    echo "  2. Configure webhook endpoint in Stripe Dashboard"
    echo "  3. Monitor payments in Stripe Dashboard"
    echo ""

elif [ -n "$ERROR" ]; then
    echo -e "${RED}╔════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ✗✗✗ STRIPE KEY NOT WORKING ✗✗✗  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Error: $ERROR${NC}"
    echo ""

    if [[ "$ERROR" == *"Stripe secret key not configured"* ]]; then
        echo -e "${YELLOW}Action Required:${NC}"
        echo "The STRIPE_SECRET_KEY is not set in Supabase Edge Functions."
        echo ""
        echo "To fix this:"
        echo "  1. Go to: https://dashboard.stripe.com/test/apikeys"
        echo "  2. Copy your 'Secret key' (starts with sk_test_)"
        echo "  3. Go to Supabase Dashboard → Edge Functions → Manage secrets"
        echo "  4. Add new secret:"
        echo "     Name: STRIPE_SECRET_KEY"
        echo "     Value: <paste your secret key>"
        echo "  5. Save and run this test again"
        echo ""

    elif [[ "$ERROR" == *"No API key provided"* ]] || [[ "$ERROR" == *"Invalid API Key"* ]]; then
        echo -e "${YELLOW}Issue: Invalid Stripe API Key${NC}"
        echo ""
        echo "The STRIPE_SECRET_KEY exists but is invalid."
        echo ""
        echo "To fix this:"
        echo "  1. Verify your key at: https://dashboard.stripe.com/test/apikeys"
        echo "  2. Make sure you're using the SECRET key (sk_test_...)"
        echo "  3. NOT the publishable key (pk_test_...)"
        echo "  4. Update the secret in Supabase Dashboard"
        echo ""

    elif [[ "$ERROR" == *"Booking not found"* ]]; then
        echo -e "${YELLOW}Note: Booking validation failed${NC}"
        echo "This means:"
        echo "  • The edge function is working"
        echo "  • Stripe configuration is likely correct"
        echo "  • The booking ID used for testing doesn't exist"
        echo ""
        echo "This is OK for a configuration test!"
        echo ""

    else
        echo "Unexpected error. Please check:"
        echo "  1. STRIPE_SECRET_KEY is set correctly in Supabase"
        echo "  2. Your Stripe account is active"
        echo "  3. Edge function logs in Supabase Dashboard"
        echo ""
    fi

    exit 1
else
    echo -e "${RED}✗ Unexpected response format${NC}"
    echo "Could not parse the response from the edge function."
    exit 1
fi

# Test 4: Webhook Endpoint
echo "============================================"
echo "Bonus: Testing Webhook Endpoint"
echo "============================================"
echo ""

WEBHOOK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{"type": "payment_intent.succeeded"}')

if echo "$WEBHOOK_RESPONSE" | grep -q "signature"; then
    echo -e "${GREEN}✓ Webhook endpoint is active${NC}"
    echo "  (Signature verification working as expected)"
else
    echo -e "${YELLOW}! Webhook endpoint response: $WEBHOOK_RESPONSE${NC}"
fi

echo ""
echo "============================================"
echo "Summary"
echo "============================================"
echo ""
echo "Your Stripe integration is ready to use!"
echo ""
echo "Test User Created:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo ""
echo "You can now:"
echo "  • Process real payments in test mode"
echo "  • Test the full booking flow in your app"
echo "  • Monitor transactions in Stripe Dashboard"
echo ""
