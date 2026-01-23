# DOLLARSMILEY - QUICK REFERENCE GUIDE

**Purpose:** Fast lookup for developers joining the project
**Last Updated:** January 22, 2026

---

## 🚀 GETTING STARTED

### Project Structure
```
dollarsmiley/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (auth)/            # Login, register, onboarding
│   ├── (tabs)/            # Main app tabs
│   ├── admin/             # Admin features
│   ├── booking/           # Booking management
│   ├── jobs/              # Job marketplace
│   ├── listing/           # Listing details
│   ├── orders/            # Order management
│   ├── provider/          # Provider features
│   ├── wallet/            # Financial management
│   └── ...
├── components/            # Reusable UI components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Business logic & utilities
├── supabase/              # Database & edge functions
│   ├── migrations/        # Database migrations
│   └── functions/         # Serverless edge functions
└── types/                 # TypeScript definitions
```

---

## 📱 APP OVERVIEW

### What It Is
**Dollarsmiley** is a two-sided marketplace for event/party services:
- **Customers:** Book services, post jobs, order custom products
- **Providers:** Offer services, bid on jobs, fulfill custom orders

### User Types
- **Customer** - Books services and posts jobs
- **Provider** - Offers services and accepts jobs
- **Hybrid** - Both customer and provider capabilities
- **Admin** - Platform management

---

## 🎯 CORE FEATURES (75% Complete)

### ✅ FULLY IMPLEMENTED

1. **Home Screen / Marketplace**
   - Unified feed (Services + Jobs)
   - Three views: List, Grid, Map
   - Advanced filtering
   - Search (text, voice, image)
   - Infinite scroll with snapshots
   - **Performance:** < 50ms initial load

2. **Authentication**
   - Email/password
   - Google/Apple OAuth
   - Profile management
   - Realtime updates

3. **Booking System**
   - Standard service bookings
   - Custom service orders
   - Escrow payments
   - Review system
   - Timeline tracking

4. **Provider Features**
   - Listing creation/management
   - Availability calendar
   - Production order management
   - Proofing workflow
   - Inventory management
   - Shipping integration
   - Payout system

5. **Social/Community**
   - Posts (updates, showcases, questions, tips)
   - Likes, comments, shares
   - Follow system
   - Feed algorithm

6. **Admin Tools**
   - User management
   - Content moderation
   - Verification review
   - Analytics dashboard
   - Feature toggles

### 🟡 PARTIALLY IMPLEMENTED

7. **Messaging** (Backend ✅, UI 40%)
   - Database schema complete
   - Realtime infrastructure ready
   - **Missing:** Chat UI, message list, typing indicators

8. **Wallet/Balance** (Backend ✅, UI 70%)
   - Transaction tracking works
   - Payout scheduling works
   - **Missing:** Balance display, visual transaction history

9. **Quotes** (Backend ✅, UI 80%)
   - Quote submission works
   - **Missing:** Side-by-side comparison UI

10. **Analytics Dashboards** (Backend ✅, UI 60%)
    - Data collection complete
    - **Missing:** Visualization charts

### 🔴 NOT IMPLEMENTED

11. **Developer Portal** (5% complete)
12. **Multi-Language** (0% complete)
13. **Advanced A/B Testing UI** (10% complete)

---

## 🗂️ KEY FILES & WHAT THEY DO

### Screens (Most Important)

| File | Purpose |
|------|---------|
| `app/(tabs)/index.tsx` | **Home screen** - Main marketplace feed |
| `app/listing/[id].tsx` | **Listing details** - Service/product view |
| `app/booking/[id].tsx` | **Booking details** - Order management |
| `app/jobs/[id].tsx` | **Job details** - Job post view |
| `app/provider/dashboard.tsx` | **Provider hub** - Earnings & analytics |
| `app/admin/dashboard.tsx` | **Admin control** - Platform management |

### Business Logic (Critical)

| File | Purpose |
|------|---------|
| `lib/stripe-payments.ts` | Payment processing |
| `lib/escrow.ts` | Fund holding & release |
| `lib/custom-service-payments.ts` | Authorization holds for custom orders |
| `lib/home-feed-snapshot.ts` | Fast feed loading (< 50ms) |
| `hooks/useListingsCursor.ts` | Pagination & data fetching |
| `lib/supabase.ts` | Database client configuration |

### Components (Commonly Used)

| File | Purpose |
|------|---------|
| `components/FilterModal.tsx` | Advanced search filters |
| `components/CommunityFeed.tsx` | Social posts feed |
| `components/MapViewFAB.tsx` | Map controls |
| `contexts/AuthContext.tsx` | Global auth state |

---

## 🔧 TECH STACK

### Frontend
- **Framework:** React Native (Expo SDK 54)
- **Navigation:** Expo Router (file-based)
- **UI:** Custom components + Lucide icons
- **Maps:** @rnmapbox/maps (native Mapbox)
- **Payments:** Stripe React Native

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime (WebSockets)
- **Functions:** Supabase Edge Functions (Deno)
- **Payments:** Stripe

---

## 💾 DATABASE ESSENTIALS

### Core Tables
- `profiles` - User accounts
- `service_listings` - Services offered
- `jobs` - Job postings
- `bookings` - Service bookings
- `production_orders` - Custom service orders
- `escrow_holds` - Payment escrow
- `reviews` - Ratings & reviews
- `messages` - Direct messages
- `posts` - Social content

### Key Relationships
```
profiles
  ↓
  ├─→ service_listings (provider)
  ├─→ jobs (customer)
  ├─→ bookings (customer/provider)
  └─→ reviews (reviewer/reviewee)

bookings
  ├─→ production_orders (1:1 for custom)
  ├─→ escrow_holds (1:1)
  └─→ messages (1:many)
```

---

## 🔐 SECURITY: ROW LEVEL SECURITY (RLS)

**CRITICAL:** All tables have RLS enabled

Example: Users can only see their own bookings
```sql
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    provider_id = auth.uid()
  );
```

**Never bypass RLS.** Database automatically enforces access control.

---

## 💰 PAYMENT FLOWS

### Standard Booking
```
1. Customer books service
2. Payment held in escrow (Stripe Payment Intent)
3. Service completed
4. Provider marks done → Customer confirms
5. Escrow released → Provider receives payout (72h)
```

### Custom Service (with Authorization)
```
1. Customer submits requirements
2. Authorization hold placed (150% of base price)
3. Provider proposes final price
4. Customer approves
5. Payment captured and held in escrow
6. Proofing workflow → Production → Delivery
7. Escrow released on delivery confirmation
```

**Edge Functions:**
- `create-payment-intent` - Standard payments
- `create-custom-service-authorization` - Authorization holds
- `release-escrow` - Fund release
- `process-refund` - Refunds

---

## 🚄 PERFORMANCE OPTIMIZATIONS

### Tier-3: Snapshot System
- **Goal:** Instant home screen load
- **Implementation:** Two-layer cache (server + client)
- **Result:** < 50ms display time

### Tier-4: Logic Optimizations
1. **Debounce Split**
   - Initial load: 0ms (with snapshot)
   - User actions: 300ms
   - **Gain:** 86% faster fresh data

2. **Conditional Sorting**
   - Sort on initial fetch only
   - Skip sort on pagination
   - **Gain:** 15ms per page

3. **Lazy Map Computation**
   - Only compute markers when map view active
   - **Gain:** 20-50ms per render

---

## 🧪 TESTING

### Run Tests
```bash
npm test              # All unit tests
npm run test:watch    # Watch mode
npm run test:e2e      # E2E tests
```

### Test Locations
```
__tests__/
├── components/       # Component tests
├── hooks/           # Hook tests
├── integration/     # Integration tests
└── e2e/             # End-to-end tests
```

---

## 🛠️ COMMON TASKS

### Add a New Screen
1. Create file in `app/` directory
   - Use `[param]` for dynamic routes
   - Example: `app/booking/[id].tsx`

2. Export default component
```typescript
export default function MyScreen() {
  return <View>...</View>;
}
```

3. Navigate to it
```typescript
router.push('/booking/123');
```

### Add a New Database Table
1. Create migration file
```bash
supabase migration new my_new_table
```

2. Write SQL
```sql
CREATE TABLE my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own records"
  ON my_table FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

3. Apply migration
```bash
supabase db push
```

### Add an Edge Function
1. Create function directory
```bash
mkdir supabase/functions/my-function
```

2. Create `index.ts`
```typescript
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    // Your logic here
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

3. Deploy
```bash
supabase functions deploy my-function
```

---

## 🐛 DEBUGGING TIPS

### Database Queries Not Working?
1. Check RLS policies first
2. Verify user is authenticated
3. Use Supabase Studio to test queries
4. Check database logs

### Realtime Not Updating?
1. Verify channel subscription is active
2. Check RLS policies on table
3. Ensure realtime is enabled on table
4. Use Supabase Studio to monitor events

### Payment Failures?
1. Check Stripe webhook configuration
2. Verify Stripe keys in `.env`
3. Check edge function logs
4. Test with Stripe test cards

### Map Not Loading?
1. Verify Mapbox token in `.env`
2. Check location permissions
3. Ensure coordinates are valid numbers
4. Check console for Mapbox errors

---

## 📚 IMPORTANT CONVENTIONS

### File Naming
- Screens: `my-screen.tsx` (kebab-case)
- Components: `MyComponent.tsx` (PascalCase)
- Utilities: `my-util.ts` (kebab-case)
- Types: `database.ts`, `api.ts` (lowercase)

### Code Style
- Use TypeScript for all new code
- Prefer functional components
- Use hooks over class components
- Follow existing patterns in similar files
- Add comments for complex logic

### Database
- Always use RLS (never disable)
- Use UUIDs for primary keys
- Include `created_at` and `updated_at` timestamps
- Use foreign keys for relationships
- Add indexes for frequently queried fields

---

## 🆘 GETTING HELP

### Documentation
1. `APP_COMPREHENSIVE_DOCUMENTATION.md` - Complete feature list
2. `TECHNICAL_FLOWS_AND_IMPLEMENTATIONS.md` - Technical deep dive
3. This file - Quick reference

### Common Issues
- **Build errors:** Clear cache with `npm run clean`
- **Auth issues:** Check `.env` file has Supabase keys
- **Database errors:** Verify RLS policies
- **Payment errors:** Check Stripe configuration

### Where to Look
- Home screen logic: `app/(tabs)/index.tsx` + `hooks/useListingsCursor.ts`
- Payment logic: `lib/stripe-payments.ts` + Edge Functions
- Database queries: Use Supabase Studio
- Navigation: Expo Router docs (file-based routing)

---

## 🎯 PRIORITY TODOS (For New Features)

### High Priority
1. ✅ Complete chat UI (`app/chat/[id].tsx`)
2. ✅ Finish wallet balance display
3. ✅ Add quote comparison UI
4. ✅ Build time extension workflow UI

### Medium Priority
5. ✅ Complete support ticket system
6. ✅ Add analytics dashboards
7. ✅ Build subscription checkout flow

### Nice to Have
8. ✅ Developer portal
9. ✅ Multi-language support
10. ✅ Advanced A/B testing UI

---

## 🔗 USEFUL LINKS

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Expo Docs:** https://docs.expo.dev
- **React Native Docs:** https://reactnative.dev
- **Mapbox Docs:** https://docs.mapbox.com

---

**Remember:** When in doubt, check the existing code for similar patterns!
