# API Integration Guide

Complete guide for third-party integrations with the DollarSmiley marketplace API.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [API Endpoints](#api-endpoints)
5. [Webhooks](#webhooks)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)

---

## Getting Started

### API Overview

**Base URLs:**
```
Production: https://your-project.supabase.co/functions/v1
Development: http://localhost:54321/functions/v1
```

**API Version:** 1.0.0

**Supported Formats:**
- Request: JSON
- Response: JSON
- Authentication: Bearer tokens (JWT)

### Prerequisites

1. **DollarSmiley Account**
   - Register at dollarsmiley.com
   - Complete profile
   - Verify email

2. **API Credentials**
   - Navigate to: Developer Portal
   - Create API key
   - Save secret key securely

3. **Development Environment**
   - HTTP client (Postman, curl, etc.)
   - Programming language of choice
   - JSON parsing library

---

## Authentication

### Getting API Keys

**Navigate to:** Settings → Developer Portal

**Create API Key:**
```
Name: "My Integration"
Description: "E-commerce integration"
Permissions:
☑ Read listings
☑ Create bookings
☐ Manage users
☐ Access analytics

Rate Limit: Standard (1000 req/hour)

Generated:
API Key: sk_live_abc123...
Secret: [Click to reveal]
```

**Store Securely:**
- Never commit to version control
- Use environment variables
- Rotate keys regularly
- Monitor usage

### Authentication Methods

**1. Bearer Token (Recommended):**
```bash
curl https://your-project.supabase.co/functions/v1/listings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**2. API Key:**
```bash
curl https://your-project.supabase.co/functions/v1/listings \
  -H "X-API-Key: YOUR_API_KEY"
```

### Getting Access Token

**Using Supabase Auth:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

const accessToken = data.session.access_token
// Use this token in Authorization header
```

**Token Expiry:**
- Access tokens expire after 1 hour
- Refresh tokens valid for 30 days
- Automatically refresh before expiry

---

## Rate Limiting

### Rate Limit Tiers

**Anonymous (No Auth):**
- 100 requests/hour
- Public endpoints only
- No write access

**Authenticated (Free):**
- 1,000 requests/hour
- All endpoints
- Standard priority

**Professional ($19.99/month):**
- 5,000 requests/hour
- Priority processing
- Webhook notifications

**Business ($49.99/month):**
- 10,000 requests/hour
- Highest priority
- Dedicated support
- Custom webhooks

**Enterprise (Custom):**
- Unlimited requests
- SLA guarantees
- Dedicated infrastructure
- Custom integrations

### Rate Limit Headers

**Every response includes:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1699564800
```

**Handling Rate Limits:**
```typescript
const response = await fetch(apiUrl, options);

const limit = response.headers.get('X-RateLimit-Limit');
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining === '0') {
  const waitTime = parseInt(reset) * 1000 - Date.now();
  console.log(`Rate limited. Wait ${waitTime}ms`);
  await sleep(waitTime);
}
```

---

## API Endpoints

### Listings

**Get All Listings:**
```http
GET /listings
Authorization: Bearer {token}

Query Parameters:
- category_id: Filter by category
- min_price: Minimum price
- max_price: Maximum price
- location: City, State
- radius: Miles from location
- page: Page number (default: 1)
- limit: Results per page (default: 20)

Response 200:
{
  "data": [
    {
      "id": "listing-uuid",
      "title": "Professional House Cleaning",
      "description": "...",
      "base_price": 100,
      "category_id": "category-uuid",
      "provider_id": "provider-uuid",
      "is_active": true,
      "created_at": "2024-11-09T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "has_more": true
  }
}
```

**Get Single Listing:**
```http
GET /listings/{id}
Authorization: Bearer {token}

Response 200:
{
  "id": "listing-uuid",
  "title": "Professional House Cleaning",
  "description": "Complete house cleaning service...",
  "base_price": 100,
  "pricing_type": "fixed",
  "duration": "2 hours",
  "category": {
    "id": "category-uuid",
    "name": "Home Services"
  },
  "provider": {
    "id": "provider-uuid",
    "name": "John's Cleaning",
    "rating": 4.8,
    "reviews_count": 234
  },
  "photos": ["url1", "url2"],
  "availability": { ... },
  "value_added_services": [ ... ]
}
```

**Create Listing:**
```http
POST /listings
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "title": "Professional House Cleaning",
  "description": "Complete cleaning service...",
  "base_price": 100,
  "category_id": "category-uuid",
  "pricing_type": "fixed",
  "duration": 120,
  "location": "San Francisco, CA",
  "photos": ["url1", "url2"],
  "custom_options": [
    {
      "name": "Number of Bedrooms",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 10
    }
  ]
}

Response 201:
{
  "id": "new-listing-uuid",
  "status": "active",
  "created_at": "2024-11-09T10:00:00Z"
}
```

### Bookings

**Create Booking:**
```http
POST /bookings
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "listing_id": "listing-uuid",
  "booking_date": "2024-12-15",
  "booking_time": "14:00",
  "special_requests": "Please use side entrance",
  "value_added_services": ["vas-uuid-1", "vas-uuid-2"]
}

Response 201:
{
  "id": "booking-uuid",
  "status": "Pending",
  "total_price": 140,
  "created_at": "2024-11-09T10:00:00Z"
}
```

**Get Booking:**
```http
GET /bookings/{id}
Authorization: Bearer {token}

Response 200:
{
  "id": "booking-uuid",
  "status": "Confirmed",
  "listing": { ... },
  "customer": { ... },
  "provider": { ... },
  "booking_date": "2024-12-15",
  "booking_time": "14:00:00",
  "total_price": 140,
  "payment_status": "Paid"
}
```

**Cancel Booking:**
```http
POST /bookings/{id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "reason": "Schedule conflict",
  "refund_requested": true
}

Response 200:
{
  "status": "Cancelled",
  "refund_amount": 140,
  "refund_eta": "3-5 business days"
}
```

### Shipping

**Calculate Shipping Rates:**
```http
POST /calculate-real-shipping-rates
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "ship_from": {
    "name": "John's Store",
    "address_line1": "123 Main St",
    "city_locality": "Austin",
    "state_province": "TX",
    "postal_code": "78701",
    "country_code": "US"
  },
  "ship_to": {
    "name": "Jane Customer",
    "address_line1": "456 Oak Ave",
    "city_locality": "San Francisco",
    "state_province": "CA",
    "postal_code": "94102",
    "country_code": "US"
  },
  "packages": [
    {
      "weight": {
        "value": 2.5,
        "unit": "pound"
      },
      "dimensions": {
        "length": 12,
        "width": 8,
        "height": 4,
        "unit": "inch"
      }
    }
  ]
}

Response 200:
{
  "rates": [
    {
      "carrier_code": "usps",
      "service_type": "Priority Mail",
      "shipping_amount": {
        "amount": 12.75,
        "currency": "USD"
      },
      "delivery_days": 3,
      "estimated_delivery_date": "2024-11-12"
    }
  ]
}
```

**Create Shipping Label:**
```http
POST /create-shipping-label
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "shipment_id": "shipment-uuid",
  "rate_id": "rate-uuid",
  "label_format": "pdf",
  "label_layout": "4x6"
}

Response 201:
{
  "label_id": "label-uuid",
  "tracking_number": "9361289999999999999999",
  "label_url": "https://...",
  "carrier_code": "usps"
}
```

### Payments

**Create Payment Intent:**
```http
POST /create-payment-intent
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "amount": 14000,
  "currency": "usd",
  "booking_id": "booking-uuid",
  "payment_method_id": "pm_xxx"
}

Response 201:
{
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "status": "requires_confirmation"
}
```

### Reviews

**Create Review:**
```http
POST /reviews
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "booking_id": "booking-uuid",
  "rating": 5,
  "comment": "Excellent service! Very professional.",
  "categories": {
    "quality": 5,
    "communication": 5,
    "value": 5,
    "timeliness": 5
  }
}

Response 201:
{
  "id": "review-uuid",
  "created_at": "2024-11-09T10:00:00Z"
}
```

---

## Webhooks

### Setting Up Webhooks

**Navigate to:** Developer Portal → Webhooks

**Create Webhook:**
```
Endpoint URL: https://your-app.com/webhooks/dollarsmiley
Secret: [Auto-generated]

Events:
☑ booking.created
☑ booking.confirmed
☑ booking.completed
☑ booking.cancelled
☑ payment.succeeded
☑ payment.failed
☑ shipment.shipped
☑ shipment.delivered
```

### Webhook Payload

**Example: booking.confirmed**
```json
{
  "event": "booking.confirmed",
  "timestamp": "2024-11-09T10:00:00Z",
  "data": {
    "id": "booking-uuid",
    "status": "Confirmed",
    "listing_id": "listing-uuid",
    "customer_id": "customer-uuid",
    "provider_id": "provider-uuid",
    "booking_date": "2024-12-15",
    "total_price": 140
  }
}
```

### Verifying Webhooks

**Signature Verification:**
```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// In your webhook handler
const signature = req.headers['x-webhook-signature'];
const isValid = verifyWebhook(
  JSON.stringify(req.body),
  signature,
  process.env.WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Booking not found",
    "details": {
      "booking_id": "invalid-uuid"
    }
  }
}
```

### Common Error Codes

**Authentication Errors:**
- `UNAUTHORIZED`: Invalid or missing token
- `FORBIDDEN`: Insufficient permissions
- `TOKEN_EXPIRED`: Access token expired

**Validation Errors:**
- `VALIDATION_ERROR`: Invalid request data
- `MISSING_REQUIRED_FIELD`: Required field missing
- `INVALID_FORMAT`: Data format invalid

**Resource Errors:**
- `NOT_FOUND`: Resource doesn't exist
- `ALREADY_EXISTS`: Duplicate resource
- `CONFLICT`: Resource state conflict

**Business Logic Errors:**
- `BOOKING_UNAVAILABLE`: Time slot taken
- `INSUFFICIENT_FUNDS`: Payment failed
- `SERVICE_UNAVAILABLE`: Provider unavailable

**Rate Limit Errors:**
- `RATE_LIMIT_EXCEEDED`: Too many requests

### Retry Strategy

```typescript
async function apiCallWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || '60';
        await sleep(parseInt(retryAfter) * 1000);
        continue;
      }

      if (response.status >= 500) {
        // Server error - retry with backoff
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }

      // Client error - don't retry
      throw new Error(`API error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## Best Practices

### Security

**1. Protect API Keys:**
```typescript
// ✅ Good
const apiKey = process.env.DOLLARSMILEY_API_KEY;

// ❌ Bad
const apiKey = 'sk_live_abc123...';
```

**2. Use HTTPS:**
```typescript
// ✅ Good
const baseUrl = 'https://your-project.supabase.co';

// ❌ Bad
const baseUrl = 'http://your-project.supabase.co';
```

**3. Validate Webhooks:**
```typescript
// Always verify webhook signatures
if (!verifySignature(payload, signature)) {
  throw new Error('Invalid webhook');
}
```

### Performance

**1. Cache Responses:**
```typescript
const cache = new Map();

async function getListings() {
  const cacheKey = 'listings';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.data;
  }

  const data = await fetchListings();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

**2. Batch Requests:**
```typescript
// ✅ Good - Single request with filters
const listings = await getListings({ category_id, limit: 100 });

// ❌ Bad - Multiple requests
const categories = await getCategories();
for (const category of categories) {
  await getListings({ category_id: category.id });
}
```

**3. Use Pagination:**
```typescript
async function getAllListings() {
  let page = 1;
  let hasMore = true;
  const allListings = [];

  while (hasMore) {
    const response = await getListings({ page, limit: 100 });
    allListings.push(...response.data);
    hasMore = response.pagination.has_more;
    page++;
  }

  return allListings;
}
```

### Error Handling

**1. Handle All Errors:**
```typescript
try {
  const booking = await createBooking(data);
  console.log('Booking created:', booking.id);
} catch (error) {
  if (error.code === 'BOOKING_UNAVAILABLE') {
    console.log('Time slot taken, try another');
  } else if (error.code === 'VALIDATION_ERROR') {
    console.log('Invalid data:', error.details);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

**2. Log Errors:**
```typescript
async function apiCall(endpoint: string, options: RequestInit) {
  try {
    return await fetch(endpoint, options);
  } catch (error) {
    console.error('API Error:', {
      endpoint,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
```

---

## Code Examples

### Node.js/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Get listings
async function getListings() {
  const { data, error } = await supabase
    .from('service_listings')
    .select('*, provider:profiles(*), category:categories(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

// Create booking
async function createBooking(listingId: string, bookingData: any) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: listingId,
      customer_id: supabase.auth.user()?.id,
      ...bookingData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Python

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_ANON_KEY']
)

# Get listings
def get_listings():
    response = supabase.table('service_listings')\
        .select('*, provider:profiles(*), category:categories(*)')\
        .eq('is_active', True)\
        .order('created_at', desc=True)\
        .limit(20)\
        .execute()

    return response.data

# Create booking
def create_booking(listing_id, booking_data):
    user = supabase.auth.get_user()

    response = supabase.table('bookings')\
        .insert({
            'listing_id': listing_id,
            'customer_id': user.id,
            **booking_data
        })\
        .execute()

    return response.data[0]
```

### cURL

```bash
# Get listings
curl -X GET \
  'https://your-project.supabase.co/rest/v1/service_listings?select=*,provider:profiles(*),category:categories(*)&is_active=eq.true' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_JWT'

# Create booking
curl -X POST \
  'https://your-project.supabase.co/rest/v1/bookings' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_JWT' \
  -H 'Content-Type: application/json' \
  -d '{
    "listing_id": "listing-uuid",
    "booking_date": "2024-12-15",
    "booking_time": "14:00"
  }'
```

---

## Support & Resources

**Documentation:**
- Full API Reference: https://dollarsmiley.com/docs/api
- OpenAPI Spec: https://dollarsmiley.com/docs/openapi.yaml
- Interactive Docs: https://dollarsmiley.com/docs/api-docs.html

**Support:**
- Email: api@dollarsmiley.com
- Developer Forum: https://forum.dollarsmiley.com
- Discord: https://discord.gg/dollarsmiley

**Status:**
- API Status: https://status.dollarsmiley.com
- Incident History
- Planned Maintenance

---

**Happy building! We're excited to see what you create with our API.**

**Last Updated:** 2024-11-09
**Version:** 1.0.0
