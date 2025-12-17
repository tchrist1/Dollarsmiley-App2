/**
 * Load Testing with k6
 *
 * To run: k6 run k6-load-test.js
 *
 * This tests critical marketplace operations under load:
 * - Cart operations
 * - Checkout flow
 * - Shipping rate calculations
 * - Search queries
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.API_URL || 'https://your-supabase-url.supabase.co';
const API_KEY = __ENV.SUPABASE_ANON_KEY || 'your-anon-key';

// Load testing stages
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],  // 95% of requests under 2s
    'http_req_failed': ['rate<0.05'],     // Less than 5% failure rate
    'errors': ['rate<0.1'],               // Less than 10% error rate
  },
};

const headers = {
  'Content-Type': 'application/json',
  'apikey': API_KEY,
  'Authorization': `Bearer ${API_KEY}`,
};

export default function () {
  // Test 1: Search Listings
  const searchResponse = http.post(
    `${BASE_URL}/rest/v1/rpc/search_listings`,
    JSON.stringify({
      search_query: 'photography',
      filters: {
        listing_type: 'CustomService',
        has_vas: true,
      },
    }),
    { headers }
  );

  check(searchResponse, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => r.json().length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Get Listing Details
  const listingId = 'test-listing-id';
  const detailsResponse = http.get(
    `${BASE_URL}/rest/v1/service_listings?id=eq.${listingId}&select=*,value_added_services(*),fulfillment_options(*)`,
    { headers }
  );

  check(detailsResponse, {
    'details status is 200': (r) => r.status === 200,
    'details has VAS': (r) => r.json()[0]?.value_added_services?.length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Add to Cart
  const cartResponse = http.post(
    `${BASE_URL}/rest/v1/cart_items`,
    JSON.stringify({
      listing_id: listingId,
      quantity: 1,
      selected_options: {
        vas: ['vas1', 'vas2'],
        fulfillment: 'Shipping',
      },
    }),
    { headers }
  );

  check(cartResponse, {
    'cart status is 201': (r) => r.status === 201,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Calculate Shipping Rates
  const shippingResponse = http.post(
    `${BASE_URL}/functions/v1/calculate-shipping-rates`,
    JSON.stringify({
      from_location: { lat: 37.7749, lng: -122.4194 },
      to_location: { lat: 34.0522, lng: -118.2437 },
      package_details: {
        weight_kg: 2,
        dimensions_cm: { length: 20, width: 15, height: 10 },
      },
    }),
    { headers }
  );

  check(shippingResponse, {
    'shipping calculation status is 200': (r) => r.status === 200,
    'shipping rates returned': (r) => r.json()?.rates?.length > 0,
  }) || errorRate.add(1);

  sleep(2);

  // Test 5: Get Cart Summary
  const cartSummaryResponse = http.get(
    `${BASE_URL}/rest/v1/cart_items?select=*,listings:service_listings(*)`,
    { headers }
  );

  check(cartSummaryResponse, {
    'cart summary status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

// Stress test scenario
export function stressTest() {
  const responses = http.batch([
    ['GET', `${BASE_URL}/rest/v1/service_listings?limit=50`, null, { headers }],
    ['GET', `${BASE_URL}/rest/v1/categories`, null, { headers }],
    ['POST', `${BASE_URL}/rest/v1/rpc/search_listings`, JSON.stringify({ search_query: 'test' }), { headers }],
  ]);

  responses.forEach((response) => {
    check(response, {
      'batch request successful': (r) => r.status === 200,
    }) || errorRate.add(1);
  });
}

// Performance test for shipping calculations
export function shippingLoadTest() {
  const locations = [
    { from: { lat: 37.7749, lng: -122.4194 }, to: { lat: 34.0522, lng: -118.2437 } },
    { from: { lat: 40.7128, lng: -74.0060 }, to: { lat: 41.8781, lng: -87.6298 } },
    { from: { lat: 33.4484, lng: -112.0740 }, to: { lat: 29.7604, lng: -95.3698 } },
  ];

  const location = locations[Math.floor(Math.random() * locations.length)];

  const response = http.post(
    `${BASE_URL}/functions/v1/calculate-shipping-rates`,
    JSON.stringify({
      from_location: location.from,
      to_location: location.to,
      package_details: {
        weight_kg: Math.random() * 10 + 1,
        dimensions_cm: {
          length: Math.random() * 50 + 10,
          width: Math.random() * 40 + 10,
          height: Math.random() * 30 + 5,
        },
      },
    }),
    { headers }
  );

  check(response, {
    'shipping calc under 1s': (r) => r.timings.duration < 1000,
    'returns multiple rates': (r) => r.json()?.rates?.length >= 3,
  }) || errorRate.add(1);
}
