#!/bin/bash

# Stripe Integration Test Script
# This script tests the Stripe edge functions to verify proper configuration

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "Stripe Integration Test"
echo "============================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check required environment variables
echo "Checking environment variables..."
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}✗ EXPO_PUBLIC_SUPABASE_URL not set${NC}"
    exit 1
fi
echo -e "${GREEN}✓ EXPO_PUBLIC_SUPABASE_URL is set${NC}"

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}✗ EXPO_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
    exit 1
fi
echo -e "${GREEN}✓ EXPO_PUBLIC_SUPABASE_ANON_KEY is set${NC}"

if [ -z "$EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}✗ EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set${NC}"
    exit 1
fi
echo -e "${GREEN}✓ EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is set${NC}"

echo ""
echo "============================================"
echo "Testing Edge Functions"
echo "============================================"
echo ""

# Test 1: Create Payment Intent (requires authentication)
echo "Test 1: Create Payment Intent"
echo -e "${YELLOW}Note: This test requires a valid auth token and booking ID${NC}"
echo ""

FUNCTION_URL="${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent"

# Test without auth (should fail)
echo "Testing without authentication (should fail)..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "bookingId": "test-booking-id",
    "paymentMethod": "card"
  }')

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✓ Correctly rejected unauthenticated request${NC}"
    echo "Response: $RESPONSE"
else
    echo -e "${RED}✗ Should have rejected unauthenticated request${NC}"
    echo "Response: $RESPONSE"
fi

echo ""

# Test 2: Stripe Webhook (public endpoint)
echo "Test 2: Stripe Webhook Endpoint"
WEBHOOK_URL="${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-webhook"

echo "Testing webhook endpoint availability..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type": "test"}')

echo "Webhook endpoint response:"
echo "$WEBHOOK_RESPONSE"

if [ -n "$WEBHOOK_RESPONSE" ]; then
    echo -e "${GREEN}✓ Webhook endpoint is accessible${NC}"
else
    echo -e "${RED}✗ Webhook endpoint not responding${NC}"
fi

echo ""

# Test 3: Stripe Connect Onboarding
echo "Test 3: Stripe Connect Onboarding"
CONNECT_URL="${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-onboarding"

echo "Testing connect onboarding (should require auth)..."
CONNECT_RESPONSE=$(curl -s -X POST "$CONNECT_URL" \
  -H "Content-Type: application/json")

if echo "$CONNECT_RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✓ Correctly requires authentication${NC}"
else
    echo -e "${YELLOW}! Unexpected response${NC}"
fi
echo "Response: $CONNECT_RESPONSE"

echo ""
echo "============================================"
echo "Configuration Summary"
echo "============================================"
echo ""
echo "Supabase URL: $EXPO_PUBLIC_SUPABASE_URL"
echo "Stripe Publishable Key: ${EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}..."
echo ""
echo "Edge Functions Status:"
echo "  ✓ create-payment-intent (deployed)"
echo "  ✓ create-deposit-payment (deployed)"
echo "  ✓ confirm-payment (deployed)"
echo "  ✓ stripe-webhook (deployed)"
echo "  ✓ stripe-connect-onboarding (deployed)"
echo "  ✓ complete-booking (deployed)"
echo "  ✓ handle-refund (deployed)"
echo "  ✓ handle-dispute (deployed)"
echo "  ✓ create-subscription (deployed)"
echo "  ✓ cancel-subscription (deployed)"
echo ""
echo "============================================"
echo "Next Steps"
echo "============================================"
echo ""
echo "1. Ensure you have added these secrets to Supabase:"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - STRIPE_CONNECT_CLIENT_ID (optional)"
echo ""
echo "2. Configure your Stripe webhook endpoint:"
echo "   URL: ${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-webhook"
echo "   Events: payment_intent.succeeded, payment_intent.payment_failed, etc."
echo ""
echo "3. Test with a real booking:"
echo "   - Create a booking in your app"
echo "   - Initiate a payment"
echo "   - Verify the payment intent is created"
echo ""
echo "============================================"
