# TECHNICAL FLOWS AND IMPLEMENTATIONS
## Detailed User Flows and System Architecture

**Generated:** January 22, 2026
**Companion to:** APP_COMPREHENSIVE_DOCUMENTATION.md

---

## USER FLOW DIAGRAMS

### 1. CUSTOMER BOOKING FLOW (STANDARD SERVICE)

```
┌─────────────────────────────────────────────────────────────┐
│ START: Customer on Home Screen                              │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Browse/Search Services                                       │
│ - View List/Grid/Map                                        │
│ - Apply filters (price, distance, rating)                  │
│ - Click on service card                                     │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Service Detail Screen (/listing/[id])                       │
│ - View photos, description, pricing                         │
│ - Check provider profile & ratings                          │
│ - See reviews from other customers                          │
│ - Click "Book Now"                                          │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Booking Form (/book-service/[listingId])                   │
│ - Select date & time                                        │
│ - Enter location/address                                    │
│ - Add special instructions                                  │
│ - Review price breakdown                                    │
│ - Select payment method                                     │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Payment Processing                                           │
│ - Edge Function: create-payment-intent                      │
│ - Amount held in escrow                                     │
│ - Booking record created (status: Requested)               │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Provider Notification                                        │
│ - Push notification sent                                    │
│ - Email notification sent                                   │
│ - Provider sees booking request                             │
└────────────────┬────────────────────────────────────────────┘
                 ▼
         ┌───────┴───────┐
         ▼               ▼
┌─────────────┐  ┌─────────────────────────┐
│ Provider    │  │ Provider Accepts        │
│ Rejects     │  │ (status: Accepted)      │
└─────┬───────┘  └─────────┬───────────────┘
      ▼                    ▼
┌─────────────┐  ┌─────────────────────────┐
│ Auto Refund │  │ Booking Confirmed       │
│ Triggered   │  │ - Calendar event added  │
│             │  │ - Reminders scheduled   │
└─────────────┘  └─────────┬───────────────┘
                           ▼
                 ┌─────────────────────────┐
                 │ Service Day             │
                 │ - 24h reminder sent     │
                 │ - 1h reminder sent      │
                 └─────────┬───────────────┘
                           ▼
                 ┌─────────────────────────┐
                 │ Service Completed       │
                 │ - Provider marks done   │
                 │ - Customer confirms     │
                 └─────────┬───────────────┘
                           ▼
                 ┌─────────────────────────┐
                 │ Payment Released        │
                 │ - Escrow → Provider     │
                 │ - Platform fee deducted │
                 │ - Payout scheduled      │
                 └─────────┬───────────────┘
                           ▼
                 ┌─────────────────────────┐
                 │ Review Prompt           │
                 │ - Customer reviews      │
                 │ - Provider reviews      │
                 │ END                     │
                 └─────────────────────────┘
```

---

### 2. CUSTOM SERVICE ORDER FLOW (WITH PROOFING)

```
┌─────────────────────────────────────────────────────────────┐
│ START: Customer finds Custom Service Listing                │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Custom Service Detail                                        │
│ - See base price                                            │
│ - View custom options (dropdowns, checkboxes)              │
│ - Check fulfillment options (pickup/ship)                  │
│ - Click "Request Custom Service"                           │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Customization Form (/book-service/[listingId]?type=custom) │
│ - Select custom options                                     │
│ - Add value-added services                                  │
│ - Upload reference images                                   │
│ - Describe requirements                                     │
│ - Request consultation (optional)                           │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Authorization Hold                                           │
│ - Edge Function: create-custom-service-authorization        │
│ - Base price * 150% authorized (not charged)               │
│ - Production order created (status: inquiry)               │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Provider Reviews Requirements                                │
│ - Views customer specifications                             │
│ - Checks material costs                                     │
│ - Calculates production time                                │
│ - Status: procurement_started                               │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Price Proposal                                               │
│ - Provider proposes final price                             │
│ - Includes breakdown (materials, labor, shipping)          │
│ - Status: price_proposed                                    │
└────────────────┬────────────────────────────────────────────┘
                 ▼
         ┌───────┴───────┐
         ▼               ▼
┌─────────────┐  ┌──────────────────────────┐
│ Customer    │  │ Customer Approves        │
│ Rejects     │  │ (status: price_approved) │
└─────┬───────┘  └──────────┬───────────────┘
      ▼                     ▼
┌─────────────┐  ┌──────────────────────────┐
│ Cancel &    │  │ Capture Payment          │
│ Refund Auth │  │ - Charge approved amount │
│             │  │ - Create escrow hold     │
└─────────────┘  └──────────┬───────────────┘
                            ▼
                 ┌──────────────────────────┐
                 │ Consultation (Optional)  │
                 │ - Video call scheduled   │
                 │ - Refine requirements    │
                 │ - Status: consultation   │
                 └──────────┬───────────────┘
                            ▼
                 ┌──────────────────────────┐
                 │ Provider Creates Proof   │
                 │ - Upload mockup images   │
                 │ - Add design notes       │
                 │ - Status: proofing       │
                 └──────────┬───────────────┘
                            ▼
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌─────────────────┐              ┌─────────────────────┐
│ Customer        │              │ Customer Approves   │
│ Requests        │              │ (status: approved)  │
│ Changes         │              └──────────┬──────────┘
└────────┬────────┘                         ▼
         │                       ┌──────────────────────┐
         │                       │ Production Starts    │
         │                       │ - Status: in_production│
         │                       └──────────┬──────────┘
         │                                  ▼
         │                       ┌──────────────────────┐
         └──────────────────────►│ New Proof Version   │
                  (Repeat)       │ - Iteration until OK │
                                 └──────────┬──────────┘
                                            ▼
                                 ┌──────────────────────┐
                                 │ Quality Check       │
                                 │ - Final inspection  │
                                 │ - Status: quality_check│
                                 └──────────┬──────────┘
                                            ▼
                                 ┌──────────────────────┐
                                 │ Fulfillment         │
                                 │ - Ship or pickup    │
                                 │ - Tracking sent     │
                                 └──────────┬──────────┘
                                            ▼
                                 ┌──────────────────────┐
                                 │ Delivery Confirmed  │
                                 │ - OTP verification  │
                                 │ - Status: completed │
                                 └──────────┬──────────┘
                                            ▼
                                 ┌──────────────────────┐
                                 │ Release Escrow      │
                                 │ - Provider paid     │
                                 │ - Review prompts    │
                                 │ END                 │
                                 └──────────────────────┘
```

---

### 3. JOB POSTING AND QUOTE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ START: Customer wants to post a job                         │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Job Posting Form (/post-job)                                │
│ - Enter title & description                                 │
│ - Select category                                           │
│ - Choose pricing (Fixed or Quote-based)                    │
│ - Set budget range (if quote-based)                        │
│ - Enter location & execution date                          │
│ - Upload reference photos                                   │
│ - Submit job                                                │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Job Created                                                  │
│ - Status: Open                                              │
│ - Visible on job board (/jobs)                             │
│ - Auto-expires in 7 days                                   │
│ - Providers notified by category match                     │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Providers Browse Job Board                                   │
│ - Filter by category, location, budget                     │
│ - View job details (/jobs/[id])                            │
│ - Click "Submit Quote"                                     │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Quote Submission (/jobs/[id]/send-quote)                   │
│ - Provider enters proposed price                            │
│ - Breakdown (materials, labor, timeline)                   │
│ - Message to customer                                       │
│ - Attachments (portfolio, references)                      │
│ - Submit quote                                              │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Quote Notification                                           │
│ - Customer notified                                         │
│ - Email with quote summary                                  │
│ - View quotes (/my-jobs/[id]/quotes)                       │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Quote Comparison                                             │
│ - Customer sees all quotes                                  │
│ - Compare prices, timelines, providers                     │
│ - View provider profiles & ratings                          │
│ - Select preferred quote                                    │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Accept Quote                                                 │
│ - Job status → Booked                                       │
│ - Booking created with quote details                       │
│ - Payment processing initiated                              │
│ - Other quotes auto-rejected                               │
└────────────────┬────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Follow Standard Booking Flow                                │
│ (See Customer Booking Flow above)                          │
│ END                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## CRITICAL TECHNICAL IMPLEMENTATIONS

### 1. ESCROW SYSTEM

**File:** `lib/escrow.ts`

**How It Works:**
```typescript
// Payment flow
Customer pays → Stripe Payment Intent → Escrow Hold Created
                                       ↓
                              (Funds held, not released)
                                       ↓
                         Service Completed & Confirmed
                                       ↓
                              Release Escrow Trigger
                                       ↓
                         Calculate Platform Fee (15%)
                                       ↓
                      Transfer to Provider Stripe Account
                                       ↓
                              Payout Scheduled
```

**Database Schema:**
- `escrow_holds` table
- Fields: `booking_id`, `amount`, `status` (held/released/refunded)
- Triggers on booking status changes
- Automatic refund on cancellation

**Edge Functions:**
- `release-escrow` - Called when booking completed
- `process-refund` - Handles refund scenarios

---

### 2. SNAPSHOT CACHING SYSTEM (TIER-3)

**File:** `lib/home-feed-snapshot.ts`

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│ TWO-LAYER CACHE SYSTEM                                      │
└─────────────────────────────────────────────────────────────┘

Layer 1: Server-Side Materialized View
┌──────────────────────────────────────┐
│ Database: `home_feed_snapshots`      │
│ - Pre-computed feed per user         │
│ - Updated every 5 minutes (cron)     │
│ - Minimal fields for speed           │
│ - RPC: get_home_feed_snapshot()      │
└──────────────┬───────────────────────┘
               ▼
Layer 2: Client-Side AsyncStorage
┌──────────────────────────────────────┐
│ AsyncStorage: home_feed_snapshot:user│
│ - Fetched from server                │
│ - Stored locally with timestamp      │
│ - TTL: 5 minutes                     │
│ - Version tracking for invalidation  │
└──────────────┬───────────────────────┘
               ▼
Display Flow:
1. App opens → Check AsyncStorage
2. If found & valid → Display instantly (< 50ms)
3. Background: Fetch fresh data
4. Update UI when fresh data arrives
5. Save new snapshot to AsyncStorage

Result: INSTANT perceived load, fresh data in background
```

---

### 3. CURSOR-BASED PAGINATION

**File:** `hooks/useListingsCursor.ts`

**Why Cursor Over Offset?**
```
❌ Offset Pagination Problems:
- Duplicates when new items inserted
- Skipped items when items deleted
- Performance degrades with large offsets
- Not real-time friendly

✅ Cursor Pagination Benefits:
- Stable results (no duplicates/skips)
- Consistent performance at any page
- Real-time safe
- Industry standard (Twitter, Facebook)
```

**Implementation:**
```typescript
// Cursor = combination of created_at + id
const cursor = {
  created_at: '2026-01-20T12:00:00Z',
  id: 'uuid-here'
};

// Query uses WHERE clause for stable pagination
SELECT * FROM listings
WHERE (created_at, id) < (cursor.created_at, cursor.id)
ORDER BY created_at DESC, id DESC
LIMIT 20;

// Each page returns next cursor
return {
  listings: [...],
  nextCursor: { created_at, id }
};
```

**Tier-4 Optimization:**
- Skip sorting on pagination appends
- Cursor guarantees correct order
- 15ms saved per page load

---

### 4. REALTIME FEATURES

**Implementation:** Supabase Realtime (WebSockets)

**Active Subscriptions:**

1. **Profile Updates** (`contexts/AuthContext.tsx`)
```typescript
supabase
  .channel(`profile:${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`
  }, (payload) => {
    setProfile(payload.new);
  })
  .subscribe();
```

2. **Message Updates** (Planned in `app/chat/[id].tsx`)
```typescript
supabase
  .channel(`messages:${bookingId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `booking_id=eq.${bookingId}`
  }, (payload) => {
    addMessage(payload.new);
  })
  .subscribe();
```

3. **Booking Status** (Planned)
```typescript
supabase
  .channel(`booking:${bookingId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'bookings',
    filter: `id=eq.${bookingId}`
  }, (payload) => {
    updateBookingStatus(payload.new);
  })
  .subscribe();
```

---

### 5. ROW LEVEL SECURITY (RLS)

**Critical for Security:** All tables have RLS enabled

**Example: `bookings` table**
```sql
-- Customers can view their own bookings
CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Providers can view bookings for their services
CREATE POLICY "Providers can view bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Customers can create bookings
CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Providers can update booking status
CREATE POLICY "Providers can update status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());
```

**Security Benefits:**
- Database-level authorization
- Cannot bypass with client code
- Protects against SQL injection
- Automatic with Supabase client

---

### 6. PAYMENT INTENT FLOW

**Stripe Integration:** `lib/stripe-payments.ts`

**Standard Booking Payment:**
```
1. Create Payment Intent
   ↓
   Edge Function: create-payment-intent
   ↓
   {
     amount: $100,
     currency: 'usd',
     booking_id: 'xxx',
     metadata: { ... }
   }
   ↓
   Returns: { client_secret, payment_intent_id }

2. Confirm Payment (Client)
   ↓
   Stripe React Native SDK
   ↓
   presentPaymentSheet({ clientSecret })
   ↓
   User completes payment

3. Webhook Handling
   ↓
   Stripe → Edge Function: stripe-webhook
   ↓
   Event: payment_intent.succeeded
   ↓
   Update booking payment_status → 'Held'
   Create escrow_hold record
   Send confirmation email
```

**Custom Service Authorization:**
```
1. Create Authorization Hold
   ↓
   Edge Function: create-custom-service-authorization
   ↓
   {
     amount: $150 (base_price * 1.5),
     listing_id: 'xxx',
     customer_id: 'yyy'
   }
   ↓
   Returns: { payment_intent_id, authorization_expires_at }

2. Price Proposal Approved
   ↓
   Edge Function: capture-custom-service-payment
   ↓
   {
     payment_intent_id: 'xxx',
     capture_amount: $120 (actual price)
   }
   ↓
   Capture payment, create escrow

3. If Price Increased
   ↓
   Edge Function: increment-custom-service-authorization
   ↓
   {
     payment_intent_id: 'xxx',
     additional_amount: $30
   }
   ↓
   Request additional auth from customer
```

---

### 7. FILTER SYSTEM ARCHITECTURE

**Files:**
- `components/FilterModal.tsx` (Original)
- `components/FilterModalAnimated.tsx` (90% faster)
- `hooks/useFilterReducer.ts` (State management)

**Performance Evolution:**

**V1 (Original):**
```
- Full re-render on every filter change
- All filter sections always mounted
- No memoization
- Result: 500-800ms to open/close
```

**V2 (Optimized):**
```
- Lazy section rendering
- Memoized filter components
- Reduced state updates
- Result: 50-80ms to open/close (90% improvement)
```

**Filter State Shape:**
```typescript
interface FilterOptions {
  listingType: 'all' | 'Service' | 'Job' | 'CustomService';
  priceMin: number;
  priceMax: number;
  distanceMiles: number;
  ratingThreshold: number;
  categoryId: string | null;
  subcategoryId: string | null;
  sortBy: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'distance' | 'rating';
}
```

**Active Filters Display:**
- `components/ActiveFiltersBar.tsx`
- Shows applied filters as removable chips
- Quick reset button
- Persistent across sessions

---

### 8. MAP VIEW IMPLEMENTATION

**Native Mapbox Integration:** `@rnmapbox/maps`

**Components:**
- `components/NativeInteractiveMapView.tsx` (Main map)
- `components/MapViewFAB.tsx` (Floating controls)
- `components/MapMarkerPin.tsx` (Custom markers)

**Marker Clustering:**
```typescript
// Automatic clustering for performance
<MapView>
  <ShapeSource
    id="listings"
    cluster={true}
    clusterRadius={50}
    clusterMaxZoom={14}
  >
    {/* Individual markers */}
  </ShapeSource>
</MapView>
```

**Two Map Modes:**

**Listings Mode:**
- Show service/job locations
- Pin color by type (service=green, job=blue, custom=orange)
- Tap → Show listing card
- Updates on filter changes

**Providers Mode:**
- Show provider business locations
- Badge by user type
- Show rating
- Tap → Navigate to provider profile

**Tier-4 Optimization:**
- Map markers only computed when map view active
- Saves 20-50ms per render in list/grid views

---

## DATABASE SCHEMA HIGHLIGHTS

### Key Tables with Relationships

```
profiles (users)
   ↓
   ├─→ service_listings (1:many)
   ├─→ jobs (1:many)
   ├─→ bookings (customer/provider)
   ├─→ reviews (reviewer/reviewee)
   ├─→ posts (social content)
   └─→ wallets (1:1)

service_listings
   ├─→ custom_service_options (1:many)
   ├─→ value_added_services (1:many)
   └─→ fulfillment_options (1:many)

bookings
   ├─→ production_orders (1:1, if custom)
   ├─→ shipments (1:1, if shipping)
   ├─→ messages (1:many)
   ├─→ escrow_holds (1:1)
   ├─→ reviews (1:many)
   └─→ payout_schedules (1:1)

production_orders
   └─→ proofs (1:many, versioned)

jobs
   └─→ job_quotes (1:many)
```

### Critical Indexes (BATCH_1 & BATCH_2)

**Performance Indexes:**
```sql
-- Foreign key indexes (BATCH_1)
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);

-- Filter/sort indexes (BATCH_2)
CREATE INDEX idx_listings_location ON service_listings USING gist(location);
CREATE INDEX idx_listings_price ON service_listings(base_price);
CREATE INDEX idx_listings_rating ON service_listings(average_rating DESC);
CREATE INDEX idx_listings_created ON service_listings(created_at DESC);
```

---

## EDGE FUNCTION PATTERNS

### Standard Edge Function Template

```typescript
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Parse request body
    const { param1, param2 } = await req.json();

    // Validate inputs
    if (!param1) {
      return new Response(
        JSON.stringify({ error: 'Missing param1' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Business logic
    const result = await processLogic(param1, param2);

    // Return success
    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    // Error handling
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### CORS Headers (CRITICAL)

```typescript
// File: supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

// MUST include in ALL responses
// MUST handle OPTIONS method for preflight
```

---

## NOTIFICATION SYSTEM

### Push Notifications Flow

```
Event Occurs (booking created, message sent, etc.)
   ↓
Database Trigger → notifications table insert
   ↓
Edge Function: process-push-notifications (cron job)
   ↓
Query unprocessed notifications
   ↓
For each notification:
   ├─→ Get user's push token from profiles
   ├─→ Format notification payload
   ├─→ Send via Expo Push Notifications API
   └─→ Mark as processed

User Device:
   ├─→ Receives push notification
   ├─→ User taps notification
   └─→ Deep link to relevant screen
```

### Deep Linking

```typescript
// Notification payload includes `data` object
{
  title: "New Booking Request",
  body: "John Doe wants to book your DJ service",
  data: {
    type: "booking_request",
    booking_id: "uuid-here"
  }
}

// App handles notification tap
Notifications.addNotificationResponseReceivedListener((response) => {
  const { type, booking_id } = response.notification.request.content.data;

  if (type === 'booking_request') {
    router.push(`/booking/${booking_id}`);
  }
});
```

---

## STATE MANAGEMENT PATTERNS

### Context-Based State

**Auth Context** (`contexts/AuthContext.tsx`):
```typescript
- Global user session
- Profile data with realtime updates
- Sign in/out methods
- Profile refresh
- Used throughout app
```

**Home State Context** (Planned):
```typescript
- Search query
- Active filters
- View mode (list/grid/map)
- Map mode (listings/providers)
- Used only in Home screen
```

### Hook-Based State

**Custom Hooks:**
- `useAuth()` - Access auth context
- `useListingsCursor()` - Paginated listings
- `useCarousels()` - Featured content
- `useTrendingSearches()` - Search suggestions
- `useMapData()` - Map markers and regions
- `useHomeFilters()` - Filter state management

**Pattern:**
```typescript
// Encapsulate complex logic in hooks
// Return minimal, stable API
// Handle loading/error states internally

const { data, loading, error, refetch } = useMyHook(params);
```

---

## PERFORMANCE MONITORING

### Metrics Tracked

1. **Page Load Times**
   - Initial render
   - Time to interactive
   - First contentful paint

2. **Database Query Performance**
   - Query duration
   - Row counts
   - Index usage

3. **User Actions**
   - Search query time
   - Filter application time
   - Booking creation time

4. **Error Tracking**
   - JavaScript errors
   - Network failures
   - Payment failures

**Implementation Files:**
- `lib/monitoring.ts`
- `lib/performance-metrics.ts`
- `lib/analytics.ts`

---

## TESTING STRATEGY

### Current Test Coverage

**Unit Tests:**
- ✅ Component tests (Button, Input, etc.)
- ✅ Hook tests (useHomeFilters, useDebounce)
- ✅ Utility function tests

**Integration Tests:**
- ✅ Authentication flow
- ✅ Booking creation
- ✅ Payment processing
- 🟡 Custom service workflow (partial)

**E2E Tests:**
- 🟡 User registration (basic)
- 🟡 Booking flow (basic)
- 🔴 Full custom service flow (not implemented)

### Test Files:
```
__tests__/
├── components/       (Component unit tests)
├── hooks/           (Hook tests)
├── lib/             (Library function tests)
├── integration/     (Integration tests)
└── e2e/             (End-to-end tests)
```

---

## CONCLUSION

This document provides deep technical context for:
- ✅ Critical user flows
- ✅ System architecture patterns
- ✅ Database relationships
- ✅ Payment and escrow systems
- ✅ Realtime features
- ✅ Performance optimizations

Use alongside `APP_COMPREHENSIVE_DOCUMENTATION.md` for complete understanding of the Dollarsmiley platform.

---

**Document Version:** 1.0
**Last Updated:** January 22, 2026
