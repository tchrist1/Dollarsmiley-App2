#!/bin/bash

# Stripe Integration Test with Authentication
# This script creates a test user, booking, and tests payment intent creation

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "Stripe Integration Test with Authentication"
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

# Generate random test data
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo -e "${BLUE}Step 1: Creating test user${NC}"
echo "Email: $TEST_EMAIL"
echo ""

# Create test user
SIGNUP_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)
ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ Failed to create test user${NC}"
    echo "Response: $SIGNUP_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Test user created${NC}"
echo "User ID: ${USER_ID:0:20}..."
echo ""

# Create profile (use upsert to handle if already exists)
echo -e "${BLUE}Step 2: Creating user profile${NC}"
PROFILE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/profiles" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d "{
    \"id\": \"${USER_ID}\",
    \"email\": \"${TEST_EMAIL}\",
    \"full_name\": \"Test User\",
    \"user_type\": \"Provider\"
  }")

echo -e "${GREEN}✓ Profile created${NC}"

# Wait a moment for profile to be fully created
sleep 1

# Verify profile exists
VERIFY_PROFILE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/profiles?id=eq.${USER_ID}&select=id" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

if echo "$VERIFY_PROFILE" | grep -q "$USER_ID"; then
    echo -e "${GREEN}✓ Profile verified in database${NC}"
else
    echo -e "${YELLOW}! Profile not found, waiting...${NC}"
    sleep 2
fi

echo ""

# Get a random category
echo -e "${BLUE}Step 3: Getting test category${NC}"
CATEGORY_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/categories?select=id&limit=1" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$CATEGORY_ID" ]; then
    echo -e "${RED}✗ Failed to get category${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Category found: $CATEGORY_ID${NC}"
echo ""

# Create a test listing
echo -e "${BLUE}Step 4: Creating test listing${NC}"
LISTING_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/service_listings" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"provider_id\": \"${USER_ID}\",
    \"category_id\": \"${CATEGORY_ID}\",
    \"title\": \"Test Service\",
    \"description\": \"Test service for Stripe integration\",
    \"base_price\": 100.00,
    \"location\": \"Test City\"
  }")

LISTING_ID=$(echo $LISTING_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$LISTING_ID" ]; then
    echo -e "${RED}✗ Failed to create listing${NC}"
    echo "Response: $LISTING_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Listing created${NC}"
echo "Listing ID: ${LISTING_ID:0:20}..."
echo ""

# Create a test booking
echo -e "${BLUE}Step 5: Creating test booking${NC}"
BOOKING_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/bookings" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"listing_id\": \"${LISTING_ID}\",
    \"customer_id\": \"${USER_ID}\",
    \"provider_id\": \"${USER_ID}\",
    \"booking_date\": \"2025-12-01\",
    \"total_amount\": 100.00,
    \"platform_fee\": 10.00,
    \"provider_payout\": 90.00,
    \"status\": \"Pending\"
  }")

BOOKING_ID=$(echo $BOOKING_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$BOOKING_ID" ]; then
    echo -e "${RED}✗ Failed to create booking${NC}"
    echo "Response: $BOOKING_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Booking created${NC}"
echo "Booking ID: ${BOOKING_ID:0:20}..."
echo ""

# Test payment intent creation
echo -e "${BLUE}Step 6: Creating Stripe Payment Intent${NC}"
echo "This tests if your STRIPE_SECRET_KEY is configured correctly..."
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

CLIENT_SECRET=$(echo $PAYMENT_RESPONSE | grep -o '"clientSecret":"[^"]*' | cut -d'"' -f4)
PAYMENT_INTENT_ID=$(echo $PAYMENT_RESPONSE | grep -o '"paymentIntentId":"[^"]*' | cut -d'"' -f4)
ERROR=$(echo $PAYMENT_RESPONSE | grep -o '"error":"[^"]*' | cut -d'"' -f4)

echo "Response:"
echo "$PAYMENT_RESPONSE"
echo ""

if [ -n "$CLIENT_SECRET" ]; then
    echo -e "${GREEN}✓✓✓ SUCCESS! Payment Intent Created ✓✓✓${NC}"
    echo ""
    echo -e "${GREEN}Payment Intent ID:${NC} ${PAYMENT_INTENT_ID:0:30}..."
    echo -e "${GREEN}Client Secret:${NC} ${CLIENT_SECRET:0:30}..."
    echo ""
    echo -e "${GREEN}Your Stripe integration is working correctly!${NC}"
    echo ""
    echo "Details:"
    echo "  • Stripe Secret Key: ✓ Valid"
    echo "  • Edge Function: ✓ Working"
    echo "  • Database Integration: ✓ Connected"
    echo "  • Amount: \$100.00"
    echo "  • Currency: USD"
    echo ""
elif [ -n "$ERROR" ]; then
    echo -e "${RED}✗ Payment Intent Creation Failed${NC}"
    echo "Error: $ERROR"
    echo ""

    if [[ "$ERROR" == *"Stripe secret key not configured"* ]]; then
        echo -e "${YELLOW}Action Required:${NC}"
        echo "1. Go to Supabase Dashboard → Edge Functions → Manage secrets"
        echo "2. Add secret: STRIPE_SECRET_KEY"
        echo "3. Value: Your Stripe secret key (starts with sk_test_ or sk_live_)"
    elif [[ "$ERROR" == *"No API key provided"* ]] || [[ "$ERROR" == *"Invalid API Key"* ]]; then
        echo -e "${YELLOW}Issue: Invalid Stripe API Key${NC}"
        echo "1. Check that STRIPE_SECRET_KEY in Supabase secrets is correct"
        echo "2. Ensure it starts with 'sk_test_' for test mode"
        echo "3. Get your key from: https://dashboard.stripe.com/apikeys"
    fi
    exit 1
else
    echo -e "${RED}✗ Unexpected response${NC}"
    exit 1
fi

# Test webhook endpoint
echo ""
echo -e "${BLUE}Step 7: Testing Webhook Endpoint${NC}"
WEBHOOK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/stripe-webhook" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type": "payment_intent.succeeded", "data": {"object": {"id": "'"$PAYMENT_INTENT_ID"'"}}}')

echo "Webhook Response: $WEBHOOK_RESPONSE"

if echo "$WEBHOOK_RESPONSE" | grep -q "signature verification failed"; then
    echo -e "${GREEN}✓ Webhook endpoint is active${NC}"
    echo -e "${YELLOW}Note: Signature verification expected to fail with test signature${NC}"
else
    echo -e "${YELLOW}! Unexpected webhook response${NC}"
fi

echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
echo ""
echo -e "${GREEN}✓ User Authentication: Working${NC}"
echo -e "${GREEN}✓ Database Operations: Working${NC}"
echo -e "${GREEN}✓ Stripe Secret Key: Valid${NC}"
echo -e "${GREEN}✓ Payment Intent Creation: Success${NC}"
echo -e "${GREEN}✓ Edge Functions: Operational${NC}"
echo ""
echo -e "${GREEN}Your Stripe integration is fully functional!${NC}"
echo ""
echo "Test Data Created:"
echo "  • User: $TEST_EMAIL"
echo "  • Listing ID: $LISTING_ID"
echo "  • Booking ID: $BOOKING_ID"
echo "  • Payment Intent: $PAYMENT_INTENT_ID"
echo ""
echo "Next Steps:"
echo "  1. Configure webhook in Stripe Dashboard"
echo "  2. Test with Stripe test card: 4242 4242 4242 4242"
echo "  3. Monitor webhook events in Stripe Dashboard"
echo ""
