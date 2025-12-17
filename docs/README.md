# Dollarsmiley API Documentation

Complete API documentation for the Dollarsmiley marketplace platform.

## Quick Start

### View Documentation

**Option 1: Interactive Swagger UI**
```bash
# Open the interactive documentation
open docs/api-docs.html
```

**Option 2: View OpenAPI Spec**
```bash
# View the raw OpenAPI specification
cat docs/openapi.yaml
```

**Option 3: Online Tools**
- Upload `openapi.yaml` to [Swagger Editor](https://editor.swagger.io/)
- Use [Redoc](https://redocly.github.io/redoc/) for alternative view
- Import into [Postman](https://www.postman.com/) for API testing

### Authentication

All authenticated endpoints require a Bearer token:

```bash
curl -X GET "https://your-project.supabase.co/functions/v1/users/me" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Get your token from Supabase Auth:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## API Categories

### 1. Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh token
- `POST /auth/reset-password` - Reset password

### 2. Users & Profiles
- `GET /users/me` - Get current user
- `PATCH /users/me` - Update profile
- `GET /users/:userId` - Get user by ID
- `GET /users/:userId/stats` - Get user statistics

### 3. Listings & Services
- `GET /listings` - List all listings
- `POST /listings` - Create listing
- `GET /listings/:id` - Get listing details
- `PATCH /listings/:id` - Update listing
- `DELETE /listings/:id` - Delete listing
- `POST /listings/search` - Search listings

### 4. Jobs & Quotes
- `GET /jobs` - List jobs
- `POST /jobs` - Create job
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/quotes` - Submit quote
- `POST /quotes/:id/accept` - Accept quote
- `POST /quotes/:id/reject` - Reject quote

### 5. Bookings
- `GET /bookings` - List bookings
- `POST /bookings` - Create booking
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/status` - Update status
- `POST /bookings/:id/reschedule` - Request reschedule
- `POST /bookings/:id/cancel` - Cancel booking

### 6. Payments
- `POST /payments/create-intent` - Create payment intent
- `POST /payments/confirm` - Confirm payment
- `GET /payments/methods` - List payment methods
- `POST /payments/methods` - Add payment method
- `POST /payments/:id/refund` - Request refund
- `GET /payments/transactions` - Get transactions
- `POST /payments/payout` - Request payout

### 7. Reviews & Ratings
- `GET /reviews` - List reviews
- `POST /reviews` - Create review
- `POST /reviews/:id/respond` - Respond to review
- `POST /reviews/:id/vote` - Vote helpful

### 8. Messaging
- `GET /messages/conversations` - List conversations
- `GET /messages/conversations/:id` - Get conversation
- `POST /messages` - Send message
- `POST /messages/:id/read` - Mark as read

### 9. Notifications
- `GET /notifications` - List notifications
- `POST /notifications/:id/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `PATCH /notifications/preferences` - Update preferences

### 10. Social Features
- `GET /social/feed` - Get feed
- `POST /social/posts` - Create post
- `POST /social/posts/:id/like` - Like post
- `POST /social/posts/:id/comments` - Comment
- `POST /social/users/:id/follow` - Follow user
- `GET /social/users/:id/followers` - Get followers

### 11. Calendar
- `GET /calendar/events` - Get events
- `GET /calendar/availability/:id` - Get availability
- `POST /calendar/availability` - Update availability
- `POST /calendar/sync` - Sync calendar

### 12. Admin
- `GET /admin/stats` - Get dashboard stats
- `GET /admin/users` - List users
- `POST /admin/moderate` - Moderate content
- `POST /admin/verification/:id` - Manage verification

## Rate Limiting

All endpoints are rate limited based on user tier:

| Tier | Limit | Window |
|------|-------|--------|
| Anonymous | 100 | 1 hour |
| Authenticated | 1000 | 1 hour |
| Premium | 5000 | 1 hour |
| Admin | 10000 | 1 hour |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 956
X-RateLimit-Reset: 1699372800
```

When rate limit is exceeded:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 1 hour."
  }
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 204 | No Content - Success, no body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Error - Server error |

## Error Codes

```
AUTH_001: Invalid credentials
AUTH_002: Token expired
AUTH_003: Unauthorized access

USER_001: User not found
USER_002: Email already exists
USER_003: Invalid user data

BOOKING_001: Booking not found
BOOKING_002: Time slot unavailable
BOOKING_003: Cannot cancel booking

PAYMENT_001: Payment failed
PAYMENT_002: Insufficient funds
PAYMENT_003: Invalid payment method

VALIDATION_001: Invalid request data
VALIDATION_002: Missing required fields
VALIDATION_003: Invalid format

RATE_LIMIT_EXCEEDED: Rate limit exceeded
BLOCKED: Access blocked

SERVER_001: Internal server error
SERVER_002: Service unavailable
SERVER_003: Database error
```

## Pagination

All list endpoints support pagination:

```
GET /listings?page=1&per_page=20
```

**Parameters:**
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

## Filtering

Filter results using query parameters:

```
GET /listings?category=photography&min_price=100&max_price=500
GET /bookings?status=confirmed&role=provider
GET /reviews?rating=5&provider_id=uuid
```

## Sorting

Sort results using the `sort` parameter:

```
GET /listings?sort=created_at_desc
GET /listings?sort=price_asc,rating_desc
```

**Sort Options:**
- `created_at_asc` / `created_at_desc`
- `updated_at_asc` / `updated_at_desc`
- `price_asc` / `price_desc`
- `rating_asc` / `rating_desc`
- `name_asc` / `name_desc`

## Example Requests

### Register User
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe",
    "user_type": "provider"
  }'
```

### Create Listing
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/listings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Professional Photography",
    "description": "High-quality portrait sessions",
    "category_id": "uuid",
    "price": 250.00,
    "duration_hours": 2
  }'
```

### Search Listings
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/listings/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "photographer",
    "filters": {
      "category": "photography",
      "location": {
        "lat": 37.7749,
        "lng": -122.4194,
        "radius": 25
      },
      "price_range": {
        "min": 100,
        "max": 500
      }
    },
    "sort": "rating_desc",
    "page": 1,
    "per_page": 20
  }'
```

### Create Booking
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "uuid",
    "start_time": "2024-11-10T14:00:00Z",
    "end_time": "2024-11-10T16:00:00Z",
    "notes": "Special requirements..."
  }'
```

### Submit Review
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/reviews" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "uuid",
    "rating": 5,
    "comment": "Excellent service!",
    "photos": ["url1", "url2"]
  }'
```

## Client Libraries

### TypeScript/JavaScript
```typescript
import { supabase } from './supabase';

// Get token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Make request
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/listings',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
```

### Python
```python
import requests

# Get token (from your auth flow)
token = "YOUR_TOKEN"

# Make request
response = requests.get(
    "https://your-project.supabase.co/functions/v1/listings",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
)

data = response.json()
```

### cURL
```bash
# Set token
TOKEN="YOUR_TOKEN"

# Make request
curl -X GET "https://your-project.supabase.co/functions/v1/listings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

## Webhooks

Subscribe to events via webhooks:

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/webhooks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": [
      "booking.created",
      "booking.confirmed",
      "payment.completed"
    ],
    "secret": "your_webhook_secret"
  }'
```

### Webhook Payload
```json
{
  "event": "booking.created",
  "data": {
    "id": "uuid",
    "listing": {...},
    "customer": {...},
    "start_time": "2024-11-10T14:00:00Z"
  },
  "timestamp": "2024-11-07T10:00:00Z"
}
```

### Verify Webhook Signature
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}
```

## Testing

### Test Environment

Use the development server for testing:
```
https://your-project.supabase.co/functions/v1
```

### Test Credentials

Create test accounts in Supabase Dashboard:
- Test customer: `customer@test.com`
- Test provider: `provider@test.com`
- Test admin: `admin@test.com`

### Postman Collection

Import the OpenAPI spec into Postman:
1. Open Postman
2. Click "Import"
3. Select `docs/openapi.yaml`
4. Configure environment variables

### API Testing Tools

- **Swagger UI**: Interactive documentation (included)
- **Postman**: API testing and collection
- **Insomnia**: REST client
- **HTTPie**: Command-line HTTP client
- **Thunder Client**: VS Code extension

## Support

- **Documentation**: [View Interactive Docs](docs/api-docs.html)
- **Email**: support@dollarsmiley.com
- **GitHub Issues**: Report bugs and request features
- **Status Page**: Check API status and uptime

## Changelog

### Version 1.0.0 (2024-11-07)
- Initial API release
- Core marketplace endpoints
- OAuth 2.0 authentication
- Rate limiting
- Webhooks support
- OpenAPI 3.0 documentation

## License

MIT License - See LICENSE file for details
