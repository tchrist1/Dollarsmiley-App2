# DOLLARSMILEY APP - COMPREHENSIVE AS-IS DOCUMENTATION
**Version:** 1.0.0
**Document Date:** January 6, 2026
**Purpose:** Authoritative baseline specification for current implementation

---

## TABLE OF CONTENTS
1. [App Architecture Overview](#1-app-architecture-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Core Flows (Step-by-Step)](#3-core-flows-step-by-step)
4. [AI-Assisted Features](#4-ai-assisted-features-current-behavior-only)
5. [Media & Asset Handling](#5-media--asset-handling)
6. [UI Component Behavior](#6-ui-component-behavior)
7. [Map & Location Features](#7-map--location-features)
8. [Validation, Errors & Edge Cases](#8-validation-errors--edge-cases)
9. [Data Model Summary](#9-data-model-summary-observed)
10. [Known Limitations & Inconsistencies](#10-known-limitations--inconsistencies)

---

## 1. APP ARCHITECTURE OVERVIEW

### Platform Targets
- **Primary:** iOS, Android (React Native via Expo)
- **Secondary:** Web (Metro bundler, single output)
- **Architecture:** Expo SDK 54 with New Architecture enabled
- **App Identifier:** com.dollarsmiley.app

### Core Frameworks and Libraries

**Framework Stack:**
- React 19.1.0 + React Native 0.81.5
- TypeScript 5.9.2
- Expo Router 6.0.8 (file-based routing)

**Key Dependencies:**
- **Database:** @supabase/supabase-js ^2.58.0
- **Payments:** @stripe/stripe-react-native 0.50.3
- **Maps:** @rnmapbox/maps ^10.2.7, mapbox-gl ^2.15.0
- **Icons:** lucide-react-native ^0.544.0
- **Navigation:** expo-router ~6.0.8
- **Video Calls:** react-native-agora ^4.5.3
- **Charts:** react-native-chart-kit ^6.12.0

**Native Modules:**
- expo-camera, expo-location, expo-calendar
- expo-contacts, expo-notifications, expo-media-library
- expo-image-picker, expo-image-manipulator
- expo-file-system, expo-secure-store
- expo-haptics, expo-speech (voice features)

### High-Level App Structure

**Directory Organization:**
```
app/                    # 37+ routes (Expo Router convention)
  ├── (auth)/          # Authentication flows (login, register, onboarding)
  ├── (tabs)/          # Main tab navigation (6 visible tabs)
  ├── admin/           # Admin dashboard and management
  ├── booking/         # Booking details and management
  ├── book-service/    # Service booking creation flow
  ├── provider/        # Provider-specific screens
  └── [feature]/       # Feature-specific routes
components/            # 179 UI components
lib/                   # 104 business logic files
contexts/              # React contexts (AuthContext)
hooks/                 # Custom hooks (useAiAssist, useBehaviorTracking, etc.)
supabase/
  ├── migrations/      # 111 database migrations
  └── functions/       # 43 edge functions
types/                 # TypeScript type definitions
constants/             # Theme, debug flags
```

**Main Tab Navigation (6 visible tabs):**
1. **Home** - Browse listings/jobs, search, filters
2. **Categories** - Category browser with subcategories
3. **Community** - Social feed, posts, comments, likes
4. **Notifications** - Push notifications, booking alerts
5. **Dashboard** - User activity, bookings, orders
6. **Profile** - User profile, settings, wallet

**Hidden/Modal Tabs:**
- for-you (personalized feed)
- create (creation hub)
- post-job (job posting flow)
- create-listing (service listing flow)
- messages (chat interface)

### State Management Approach

**Primary Pattern: React Context + Hooks**
- AuthContext: Session, user, profile, loading state
- Realtime profile updates via Supabase subscriptions
- Per-component useState for form state
- No Redux or MobX

**Global State:**
- Authentication: `contexts/AuthContext.tsx`
  - Provides: session, user, profile, loading, signOut, refreshProfile
  - Listens to Supabase auth state changes
  - Automatically registers push tokens

**Local State:**
- Component-level useState for form inputs
- useEffect for data fetching
- Loading/error states per component

**Realtime Features:**
- Profile updates (profiles table)
- Message notifications
- Booking status changes

### Data Sources and Persistence Layers

**Primary Database: Supabase (PostgreSQL)**
- 111 migrations applied
- Row Level Security (RLS) enabled on all tables
- Realtime subscriptions enabled

**Storage Buckets:**
- `avatars` - User profile pictures (5MB limit, public read)
- `listing-photos` - Service/job photos (5MB per file, public read)
- `review-media` - Review photos/videos (100MB limit)
- `media` - Community post media

**Edge Functions (43 total):**
- AI-related: generate-photo, generate-title-description, suggest-listing-category
- Payments: Stripe webhooks, payment processing
- Notifications: Push notification processing
- Automation: Scheduled tasks, reminders

**Local Storage:**
- AsyncStorage for cached data
- SecureStore for sensitive tokens
- FileSystem for temporary file caching (100MB limit)

**External APIs:**
- OpenAI (GPT-4o-mini, DALL-E 3)
- Stripe (payments, Connect, Identity)
- Mapbox (geocoding, maps, search)
- Agora (video calls - optional)

---

## 2. USER ROLES & PERMISSIONS

### User Type Definitions
```typescript
type UserType = 'Customer' | 'Provider' | 'Hybrid' | 'Admin';
```

### Role: Customer

**Profile Characteristics:**
- user_type: 'Customer'
- Can post jobs, browse services, book services
- Has wallet for payments

**Accessible Features:**
- Post jobs (quote-based or fixed-price)
- Browse and search service listings
- View provider profiles and reviews
- Book services and make payments
- Message providers
- Leave reviews after completed bookings
- Track bookings and orders
- View receipts and transaction history
- Request refunds
- Save favorite listings
- Follow providers in community

**Restricted Actions:**
- Cannot create service listings
- Cannot access provider dashboard
- Cannot receive payouts (no provider wallet access)
- Cannot see provider analytics

**Conditional Access:**
- Must verify phone for certain actions (booking confirmations)
- Must have payment method for bookings
- Can upgrade to Hybrid to access provider features

### Role: Provider

**Profile Characteristics:**
- user_type: 'Provider'
- Must connect Stripe for payouts
- Can offer services, respond to jobs
- Verification badges (ID, business, phone)

**Accessible Features:**
- Create service listings (Standard and Custom)
- Manage inventory (if enabled)
- Set availability calendars
- Respond to job posts with quotes
- Accept/reject bookings
- Update booking status
- Message customers
- Request payouts
- View earnings and analytics
- Manage blocked dates
- Configure fulfillment options (pickup, delivery, shipping)
- Submit proof for custom orders
- View income reports and tax forms (1099-NEC)

**Restricted Actions:**
- Cannot post jobs (must be Customer or Hybrid)
- Cannot book services from other providers
- Cannot access customer-specific dashboard features

**Conditional Access:**
- Stripe Connect onboarding required for payouts
- ID verification required for certain features
- Phone verification required for booking management
- Background check may be required for certain categories

### Role: Hybrid

**Profile Characteristics:**
- user_type: 'Hybrid'
- Full access to both Customer and Provider features
- Single wallet handles both payments and payouts

**Accessible Features:**
- **All Customer Features** (listed above)
- **All Provider Features** (listed above)
- Unified dashboard showing both customer and provider activities
- Can switch context between customer and provider views
- Can book from other providers while offering own services

**No Additional Restrictions:**
- Full platform access as both buyer and seller

### Role: Admin

**Profile Characteristics:**
- user_type: 'Admin'
- Special admin_mode toggle in profile
- Access to admin routes (/admin/*)
- Elevated permissions across all tables

**Accessible Features:**
- View all users, listings, jobs, bookings
- Moderation queue management
- Content flagging and removal
- User suspension and banning
- Demo listing management
- System-wide analytics
- Email template editing
- Feature flag management
- Payout approval
- Refund management
- Dispute resolution
- Verification status management
- Subscription plan editing
- OAuth provider configuration

**Admin Mode Toggle:**
- Stored in profile.admin_mode boolean
- UI shows admin banner when enabled
- AccountTypeSwitcher component for toggling
- Persists across sessions

**RLS Policies:**
- Admin policies bypass standard user restrictions
- Can read/update all records
- Special functions: get_all_users, admin_update_user, etc.

### Permission Matrix

| Feature | Customer | Provider | Hybrid | Admin |
|---------|----------|----------|--------|-------|
| Post Jobs | ✓ | ✗ | ✓ | ✓ |
| Create Listings | ✗ | ✓ | ✓ | ✓ |
| Book Services | ✓ | ✗ | ✓ | ✓ |
| Receive Bookings | ✗ | ✓ | ✓ | N/A |
| Provider Dashboard | ✗ | ✓ | ✓ | ✓ |
| Wallet Payouts | ✗ | ✓ | ✓ | N/A |
| Leave Reviews | ✓ | ✗ | ✓ | ✓ |
| Moderation Tools | ✗ | ✗ | ✗ | ✓ |
| Admin Dashboard | ✗ | ✗ | ✗ | ✓ |
| Community Posts | ✓ | ✓ | ✓ | ✓ |
| Messaging | ✓ | ✓ | ✓ | ✓ |

### Verification Requirements

**ID Verification:**
- Required for: Providers offering high-value services
- Method: Stripe Identity or manual document upload
- Status stored in: profile.id_verified boolean

**Phone Verification:**
- Required for: Booking confirmations, payout requests
- Method: SMS code verification
- Status stored in: profile.phone_verified boolean

**Business Verification:**
- Required for: Commercial service providers
- Method: Business documentation upload
- Status stored in: profile.business_verified boolean

**Background Check:**
- Optional: Category-dependent (childcare, home services)
- Method: Third-party background check integration
- Status stored in: background_checks table

---

## 3. CORE FLOWS (STEP-BY-STEP)

### 3.1 User Onboarding and Authentication

#### Registration Flow
**Entry Point:** `/app/(auth)/register.tsx`

**Step 1: Initial Registration**
- Fields: Full Name, Email, Password, Confirm Password
- Validation:
  - All fields required
  - Passwords must match
  - Password minimum 6 characters
  - Email format validated by Supabase
- Submit triggers: `supabase.auth.signUp()`
- User metadata: `{ full_name }` stored in auth.users

**Step 2: Automatic Profile Creation**
- Database trigger `create_profile_on_signup()` fires
- Creates profile record with:
  - id: auth.uid()
  - email: from auth.users
  - full_name: from metadata
  - user_type: 'Customer' (default)
  - subscription_plan: 'Free' (default)
  - ai_assist_enabled: true (default)
  - service_radius: 25 (miles, default)

**Step 3: Onboarding Flow**
- Redirects to: `/(auth)/onboarding`
- **Observed Behavior:** File exists but implementation varies
- User selects account type: Customer, Provider, or Both
- Updates profile.user_type accordingly
- Collects location (optional)
- Collects phone number (optional)

**Step 4: Main App Entry**
- Navigation: `router.replace('/(tabs)')`
- Lands on Home tab (index.tsx)
- AuthContext provides session/profile globally

#### Login Flow
**Entry Point:** `/app/(auth)/login.tsx`

**Method 1: Email/Password**
- Fields: Email, Password
- Submit: `supabase.auth.signInWithPassword()`
- On success: `router.replace('/(tabs)')`
- On error: Alert with error message

**Method 2: OAuth (Google/Apple)**
- Checks oauth_providers table for enabled status
- Google: `signInWithGoogle()` from lib/oauth.ts
- Apple: `signInWithApple()` from lib/oauth.ts
- Opens browser for OAuth flow
- On success: Profile auto-created, redirects to /(tabs)
- On error: Alert with error message

**Session Management:**
- Stored in: AsyncStorage (Supabase client)
- Auto-refresh: Handled by Supabase SDK
- Persists across app restarts

**Sign Out:**
- Method: `supabase.auth.signOut()`
- Clears: Session, profile state
- Redirects to: /(auth)/login

### 3.2 Profile Creation and Editing

#### View Profile
**Route:** `/app/(tabs)/profile.tsx`

**Displayed Information:**
- Avatar (with fallback to initials)
- Full name
- User type badge (Customer/Provider/Hybrid)
- Verification badges (ID, Phone, Business)
- Rating and review count
- Bio
- Location
- Subscription plan

**Actions Available:**
- Edit Profile
- Settings
- View Wallet
- View Bookings/Orders
- View Reviews
- Sign Out

#### Edit Profile Flow
**Route:** `/app/settings/edit-profile.tsx`

**Editable Fields:**
- Avatar (camera/gallery upload)
- Full Name
- Bio (multiline text)
- Phone Number
- Location (text input)
- Service Radius (slider, 1-100 miles)

**Avatar Upload Process:**
1. Choose photo source (Camera/Gallery)
2. Request permissions
3. Pick image (no cropping, quality: 0.8)
4. Upload to 'avatars' bucket: `{userId}/avatar-{timestamp}.{ext}`
5. Get public URL with cache busting
6. Update profile.avatar_url
7. Delete old avatar from storage

**Save Flow:**
- Validation: Full name required, phone format checked
- Update: `supabase.from('profiles').update().eq('id', userId)`
- On success: Alert "Profile updated successfully", back navigation
- On error: Alert with error message

### 3.3 Create Service Listing Flow
**Route:** `/app/(tabs)/create-listing.tsx`
**Accessible to:** Provider, Hybrid

**Complete Step-by-Step Process:**

**Step 1: Listing Type Selection**
- Toggle: Standard Service vs Custom Service
- Standard: Fixed service with optional variations
- Custom: Customer-customizable with options and add-ons
- State: `listingType` ('Service' | 'CustomService')

**Step 2: AI Assist Toggle**
- Master toggle for AI features
- Loads from: profile.ai_assist_enabled
- When enabled AND title >= 3 chars: Shows AI buttons
- Helper: "Type a few words in the title to get AI help"

**Step 3: Title and Description**
- **Title** (Required):
  - Text input, single line
  - AI Assist button opens AITitleDescriptionAssist modal
  - Placeholder: "e.g., Professional House Cleaning"
- **Description** (Required):
  - TextArea, 4 lines initial, expandable
  - Max 120 words with live counter
  - AI Assist applies to both title and description
  - Placeholder guidance on what to include

**Step 4: Category Selection**
- **AI Category Suggestion**:
  - Analyzes title + description
  - Returns category, subcategory, confidence score
  - Shows alternate suggestions
  - User can accept or manually select
- **Manual Picker** (Fallback):
  - CategoryPicker component
  - Loads from categories table
  - When category selected, loads subcategories
  - Subcategory displayed as read-only text

**Step 5: Pricing**
- **Pricing Type**:
  - Toggle: "Hourly Rate" or "Fixed Price"
  - State: `priceType` ('hourly' | 'fixed')
- **If Hourly**:
  - Hourly Rate (required): Numeric input with $ prefix
  - Typical Duration (optional): Hours, numeric input
- **If Fixed**:
  - Fixed Price (required): Numeric input with $ prefix
  - Estimated Duration (optional): Hours, numeric input

**Step 6: Photos**
- **PhotoPicker Component**:
  - Max 5 photos
  - First photo = featured image
  - Drag to reorder
  - X button to remove
  - AI Photo Assist button opens modal
- **AI Photo Generation**:
  - Modal: AIPhotoAssistModal
  - Context: title, description, category, listing type
  - Generate 1-5 photos
  - Select which to keep
  - Upload to 'listing-photos' bucket

**Step 7: Availability**
- **AvailabilityCalendar**:
  - Days of week selection
  - At least one day required
  - Stored as JSON: `['Monday', 'Wednesday', 'Friday']`

**Step 8: Tags**
- Comma-separated keywords
- Example: "deep cleaning, eco-friendly, same-day"
- Optional, helps with search

**Step 9: Fulfillment Configuration** (Optional)
- **"Requires Fulfillment" Toggle**:
  - When enabled:
    - **Fulfillment Window** (required): Business days, min 1
    - **Fulfillment Methods** (required, multi-select):
      - Pick-up by Customer
      - Drop-off by Provider
      - Pick-up & Drop-off by Customer
      - Pick-up & Drop-off by Provider
      - Shipping
    - **If Shipping Selected**:
      - Item Weight (oz): Required, numeric
      - Package Dimensions: Length, Width, Height (inches), all required if any filled

**Step 10: Inventory Management** (Optional)
- **"Enable Inventory" Toggle**:
  - When enabled:
    - **Inventory Type**:
      - Quantity: Track available units
      - Rental: Time-based with pickup/drop-off
    - **Stock Quantity** (required): Numeric, min 1
    - **Low Stock Alert** (optional): Numeric threshold
    - **If Rental Mode**:
      - Pricing Model: Flat Rate, Per Day, Per Hour
      - Turnaround Hours: Buffer between rentals

**Step 11: Service Agreements** (Optional)
- **Service Agreement Toggle**:
  - Customer must accept at checkout
- **Damage Deposit Toggle**:
  - When enabled: Deposit Amount (required, > 0)
  - Auto-refund after 48 hours
- **Proof Approval** (Custom Service only):
  - Customer must approve proof before production

**Step 12: SMS Opt-in**
- Checkbox: "I agree to receive SMS alerts..."
- Not enforced as required

**Step 13: Validation and Save**
- **Validation Rules**:
  - Title: non-empty
  - Description: non-empty
  - Category: selected
  - Price: number > 0
  - Availability: at least one day
  - If fulfillment enabled: window >= 1, methods >= 1
  - If shipping: weight and dimensions required
  - If inventory: quantity >= 1
  - If damage deposit: amount > 0
- **Save Process**:
  1. Generate UUID for listing
  2. Upload photos (if any) to listing-photos bucket
  3. Insert into service_listings table:
     - All form data
     - status: 'Active'
     - photos: JSON array of URLs
  4. If fulfillment: Insert into fulfillment_options table
  5. If Custom Service: Redirect to edit-options page
  6. If Standard Service: Success alert, back navigation

**Custom Service Next Step:**
- **Route:** `/listing/{listingId}/edit-options`
- Must define at least one option or add-on

### 3.4 Edit Service Listing
**Observation:** No direct edit flow exists for standard listing details
**Available:** Edit Custom Service Options only

### 3.5 Create Custom Service Options
**Route:** `/app/listing/[id]/edit-options.tsx`
**Triggered:** After creating Custom Service listing

**Step 1: Add Options**
- **Add Option** button creates option card
- Each option has:
  - **Option Name** (required): e.g., "Size", "Color"
  - **Option Type**: Single Choice or Multiple Choice
  - **Choices**: List of choices with price modifiers
    - Each choice: Name (required), Price Modifier ($, optional, default 0)
    - Delete button per choice
    - Add Choice button
    - Min 1 choice required

**Step 2: Add Value-Added Services**
- **Add Service** button creates add-on card
- Each add-on has:
  - **Service Name** (required): e.g., "Express Delivery"
  - **Description** (optional): Details
  - **Price** (required): Additional cost

**Step 3: Save All**
- **Validation**: At least one option OR one add-on required
- **Save Process**:
  1. Delete all existing options for listing
  2. Insert new options into service_options table
  3. Insert new add-ons into value_added_services table
  4. Success alert
  5. Back navigation

**Edit Flow:**
- Loads existing options/add-ons
- Can modify and re-save
- Overwrites all previous data

### 3.6 Post Job Flow
**Route:** `/app/(tabs)/post-job.tsx`
**Accessible to:** Customer, Hybrid

**Step 1: AI Assist Toggle**
- Same as listing creation
- Threshold: title >= 3 characters

**Step 2: Job Title and Description**
- **Title** (Required): What needs to be done
  - AI assist available
  - Placeholder: "e.g., Need plumber to fix leaky faucet"
- **Description** (Required): Detailed requirements
  - Max 120 words
  - AI assist available

**Step 3: Category**
- **AI Category Suggestion** (same as listing)
- **Manual Picker** (fallback)

**Step 4: Pricing Type**
- **Job Pricing Mode**:
  - "Get offers" (Quote-based): Providers send quotes, customer chooses
  - "Set a fixed price": Customer sets price, providers instantly accept
- State: `jobType` ('quote_based' | 'fixed_price')

**Step 5: Budget/Price Entry**
- **If Quote-Based**:
  - Min Budget (optional): Numeric
  - Max Budget (optional): Numeric
  - Validation: If both set, min <= max
  - Estimated Duration (optional): Hours
- **If Fixed-Price**:
  - Fixed Price (required): Numeric > 0
  - Estimated Duration (optional): Hours

**Step 6: Job Location**
- **Address Fields** (All Required):
  - Street Address
  - City
  - State
  - Zip Code
  - Country: Defaults to 'US'
- Location auto-populated as: "City, State"

**Step 7: Execution Date**
- **Date Picker** (Required):
  - Minimum: Today
  - Stored as ISO date string

**Step 8: Time Selection**
- **Mode Toggle**:
  - **Preferred Time**: Morning, Afternoon, Evening, Flexible
  - **Specific Time Slot**: Exact start time (overnight supported)
- Stored as: preferred_time OR start_time

**Step 9: Job Photos** (Optional)
- Same PhotoPicker as listing (max 5)
- AI Photo Assist available
- Context: job details, location

**Step 10: SMS Opt-in**
- Same as listing creation

**Step 11: Submit**
- **Validation**:
  - Title, description, category: required
  - Address fields: all required
  - Date: required
  - If fixed-price: price > 0
  - If quote-based with budgets: min <= max
- **Save Process**:
  1. Insert into jobs table:
     - All form data
     - status: 'Open'
     - expires_at: 30 days from now
     - photos: JSON array
  2. Success alert (varies by pricing type):
     - Quote-based: "Providers can now send you quotes"
     - Fixed-price: "Providers can now accept at your set price"
  3. Back navigation

**No Edit Flow:** Jobs cannot be edited after posting

### 3.7 Browse Listings (Grid View)
**Route:** `/app/(tabs)/index.tsx`

**Page Load:**
1. Fetch user location from profile
2. Fetch featured listings
3. Fetch trending listings
4. Fetch personalized recommendations (if logged in)
5. Fetch main listings (paginated, 20 per page)

**View Modes:**
- Toggle: List, Grid, Map
- Default: Grid
- State persists during session

**Grid Display:**
- 2-column responsive grid
- Each card shows:
  - Featured image (first photo or placeholder)
  - Title (truncated)
  - Price (formatted currency)
  - Rating (stars + count)
  - Provider name
  - Location (if available)
  - Listing type badge (Service/CustomService/Job)

**Search Bar:**
- Text input with debounce (300ms)
- Searches: title, description, tags
- Updates results automatically

**Filters:**
- **Filter Modal** (SlidersHorizontal icon):
  - Categories (multi-select)
  - Price range (min/max)
  - Distance radius (slider, miles)
  - Rating (minimum, slider)
  - Availability (today, this week, this month)
  - Sort by: relevance, price (low/high), rating, popular, recent, distance
  - Verified providers only (toggle)
  - Instant booking (toggle)
  - Listing type: All, Jobs, Services, Custom Services
- **Active Filters Bar**:
  - Shows count of active filters
  - Chips for each filter
  - X to remove individual filter
  - "Clear All" button

**Carousels (Interspersed in Feed):**
1. After first 10 listings: Trending carousel
2. After next 10 listings: Popular carousel
3. After next 10 listings: Recommended carousel (if logged in)

**Infinite Scroll:**
- Loads next 20 on reaching bottom
- Shows "Loading more..." spinner
- Stops when hasMore = false

**Item Tap:**
- Service listings: Navigate to `/listing/{id}`
- Jobs: Navigate to `/jobs/{id}`

### 3.8 Browse Listings (Map View)
**Route:** Same `/app/(tabs)/index.tsx`, view mode = 'map'

**Map Implementation:**
- **Web:** InteractiveMapView (simulated map with positioning)
- **Native:** NativeInteractiveMapView (Mapbox GL)

**Map Mode Toggle:**
- **Listings Mode**: Show service listings as pins
- **Providers Mode**: Cluster listings by provider location

**Marker Display:**

**Listings Mode:**
- Each listing = pin with icon based on type:
  - Service: MapPin icon (green bubble)
  - CustomService: Sparkles icon (purple bubble)
  - Job: Briefcase icon (orange bubble)
- Price tag below pin (if available)
- Selected state: Larger, color-filled bubble

**Providers Mode:**
- Each provider = User icon pin
- Badge if verified
- Rating tag below pin
- Selected state: Color-filled, larger

**Clustering:**
- When zoom level > 0.02 latitudeDelta: Show individual pins
- When zoomed out: Cluster nearby markers (60px radius)
- Cluster bubble shows count
- Tap cluster to zoom in

**Marker Interaction:**
- **Tap Marker**: Selects it, shows info card at bottom
- **Info Card** (Listing):
  - Title, price, distance from center
  - Tap card: Navigate to listing detail
- **Info Card** (Provider):
  - Name, rating, review count
  - Categories (up to 3)
  - Response time, completion rate
  - Distance
  - "Tap to view full profile" hint
  - Tap: Navigate to `/reviews/{providerId}`

**Map Controls:**
- **Zoom In** (+): Decrease lat/lng delta by 0.5x
- **Zoom Out** (-): Increase lat/lng delta by 2x
- **Recenter** (Maximize2): Fit all markers in view
- **Switch to List** (List icon): Change view mode

**Stats Bar:**
- Shows: "{visible} items ({total} total)"
- Shows: Center coordinates

**Empty State:**
- Message: "No Locations Available"
- Subtitle: "Listings don't have location data yet. Try list or grid view."

### 3.9 Booking and Checkout Flow
**Route:** `/app/book-service/[listingId].tsx`
**Entry:** "Book Now" button on listing detail page
**Parameters:** listingId, type (standard/custom), providerId, price

**Booking Steps: 3 total (datetime, payment, confirmation)**

#### Step 1: Date and Time Selection

**Date Selection:**
- **BookingCalendar** component
- Visual calendar picker
- Available dates based on provider availability
- Blocks past dates
- State: `selectedDate` (Date object)

**Time Selection:**
- **Time Slots**: 10 preset options
  - 9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM
  - 1:00 PM, 2:00 PM, 3:00 PM, 4:00 PM, 5:00 PM, 6:00 PM
- Grid layout, single selection
- State: `selectedTime` (string, e.g., "9:00 AM")

**Service Location:**
- **Text Input** (Required)
- Pre-fills from listing.location
- User can modify
- State: `location` (string)

**Additional Notes:**
- **TextArea** (Optional)
- 4 lines, expandable
- Special instructions
- State: `notes` (string)

**Inventory Check (If Applicable):**
- **For Inventory-Enabled Listings**:
  - Checks availability for date/time
  - **Quantity Mode**: Checks 1 unit available
  - **Rental Mode**: Checks date range conflict
  - Creates "soft lock" (15-min hold)
  - Shows "Checking Availability..." spinner
  - **Error State**: Red alert if unavailable, blocks proceed
  - **Success**: Green checkmark, stores lockId

**Continue to Payment Button:**
- Validates: date, time, location filled
- If inventory: Must pass availability check
- Proceeds to Step 2

#### Step 2: Payment

**Booking Summary Card:**
- Service name
- Provider name
- Selected date (formatted: "Mon, Jan 6, 2026")
- Selected time
- Service location
- Total price (formatted currency)

**Deposit vs Full Payment:**
- **DepositPaymentOption Component**:
  - Checks if provider allows deposits
  - If available: Shows toggle between "Full Payment" and "Pay Deposit Now"
  - Deposit typically 20-50% of total
  - Balance due shown for deposit option
- State: `paymentType` ('full' | 'deposit')

**Payment Method Selection:**
- **Two Options**:
  1. **Stripe** (Credit/Debit Card):
     - Icon: Credit card
     - Text: "Credit or Debit Card"
     - Subtext: "Secured with 256-bit encryption"
     - Includes Apple Pay & Google Pay
  2. **Wallet Balance**:
     - Icon: Wallet
     - Text: "Wallet Balance"
     - Shows current balance
     - Disabled if insufficient funds
- State: `paymentMethod` ('stripe' | 'wallet' | null)

**Payment Security Info:**
- Info box with Shield icon
- "Payment Protection: Funds held in escrow until service completion"

**Create Booking Flow:**
1. Generate booking ID
2. Insert into bookings table:
   - customer_id, provider_id, listing_id
   - scheduled_date, scheduled_time, location, notes
   - price, deposit_amount, balance_due
   - platform_fee: 10% of price
   - provider_payout: 90% of price
   - status: 'PendingApproval'
   - payment_status: 'Pending'
   - provider_response_deadline: now + 24 hours
3. If inventory: Convert soft lock to hard lock, link to booking

**Payment Processing:**

**If Stripe:**
1. Call edge function: `create-payment-intent`
2. Receive clientSecret
3. Open StripePaymentSheet component
4. User confirms payment
5. On success: Call `confirm-payment` endpoint
6. Updates booking.payment_status = 'Held'
7. Funds held in escrow
8. Proceed to confirmation

**If Wallet:**
1. Check wallet balance >= amount
2. Insert wallet transaction:
   - type: 'Debit'
   - amount: payment amount
   - status: 'Completed'
3. Update booking.payment_status = 'Completed'
4. Decrement wallet balance
5. Proceed to confirmation

**Error Handling:**
- Payment decline: Alert "Payment failed: {reason}"
- Insufficient wallet: Alert "Insufficient wallet balance"
- Network error: Alert "Payment processing failed. Try again."

#### Step 3: Confirmation

**Success Screen:**
- Green checkmark icon
- "Booking Confirmed!" heading
- **Details Displayed**:
  - Transaction ID
  - Booking ID
  - Service name
  - Provider name
  - Scheduled date & time
- **Message**:
  - "Your payment is held securely in escrow and will be released to the provider after service completion."
  - "The provider has 24 hours to accept your booking."
- **Actions**:
  - "View Receipt" button
  - "Contact Provider" button
  - "View Booking" button (navigates to /booking/{bookingId})
  - "Close" button (returns home)

**Post-Confirmation:**
- Notification sent to provider (push + in-app)
- Email receipt sent to customer (if enabled)
- Booking appears in customer's dashboard
- Countdown timer starts for provider response (24h)

### 3.10 Provider Fulfillment Flow
**Route:** `/app/booking/[id].tsx` (Provider view)

**Initial State: Booking Status = 'PendingApproval'**

**Provider Actions:**

**Accept Booking:**
1. Tap "Accept Booking" button
2. Confirmation alert: "Confirm this booking?"
3. Update booking.status = 'Accepted'
4. Update booking.accepted_at = now()
5. Notification sent to customer
6. Button changes to "Mark In Progress"

**Reject Booking:**
1. Tap "Reject" button
2. Alert: Enter rejection reason
3. Update booking.status = 'Cancelled'
4. Automatic refund initiated
5. Notification sent to customer with reason
6. Booking archived

**Mark In Progress:**
1. Available after status = 'Accepted'
2. Tap "Mark In Progress"
3. Update booking.status = 'InProgress'
4. Started timestamp recorded
5. Shows "Complete Service" button

**For Custom Services with Proofing:**

**Submit Proof:**
- Route: `/app/provider/production/{orderId}/submit-proof`
- Upload proof images (photos of work in progress)
- Text description
- Submits to production_orders table
- Status = 'ProofSubmitted'
- Notification to customer for approval

**Wait for Customer Approval:**
- Customer views proof at `/booking/{id}`
- Customer can approve or request changes
- If approved: Status = 'ProofApproved', production continues
- If changes requested: Back to proof submission

**Complete Service:**
1. Tap "Complete Service" button
2. Confirmation: "Mark this service as complete?"
3. Update booking.status = 'Completed'
4. Update booking.completed_at = now()
5. **Escrow Release**:
   - If payment_status = 'Held': Call edge function `release-escrow`
   - Funds transferred to provider's wallet
   - Transaction created with type: 'Credit'
6. Notification to customer to leave review
7. Shows completed badge

**For Orders with Shipping:**

**Update Shipment Status:**
- View: `/app/provider/shipment/{id}`
- Statuses: Pending → InTransit → OutForDelivery → Delivered
- Can add tracking number
- Upload proof of delivery (photo)
- Customer receives notifications at each stage

**Delivery Confirmation:**
- If delivery_confirmation_required:
  - Generate OTP (6-digit)
  - Customer must provide OTP to confirm receipt
  - Provider enters OTP to complete
- Auto-completes 48h after delivery if no disputes

### 3.11 Customer Confirmation Flow
**Route:** `/app/booking/[id].tsx` (Customer view)

**Booking Stages from Customer Perspective:**

**Stage 1: Waiting for Provider Response**
- Status: 'PendingApproval'
- Countdown timer: "Provider has X hours to respond"
- Can message provider
- Can cancel booking (full refund)

**Stage 2: Booking Accepted**
- Status: 'Accepted'
- Shows confirmed date/time
- "Add to Calendar" button
- Can reschedule (opens RescheduleBookingModal)
- Can cancel (refund minus cancellation fee)

**Stage 3: Service In Progress**
- Status: 'InProgress'
- Shows provider contact info
- Live chat/call options
- For custom services: Proof approval card appears
- Can file dispute if needed

**Stage 4: Proof Review (Custom Services Only)**
- **ProofApprovalCard** component
- Shows proof images submitted by provider
- Description text
- **Actions**:
  - "Approve" button: Allows production to continue
  - "Request Changes" button: Opens feedback modal
  - Feedback sent back to provider

**Stage 5: Service Completed**
- Status: 'Completed'
- If shipping: Shows tracking info
- If delivery: Can confirm delivery (OTP or photo)
- **Review Prompt**:
  - Banner: "How was your experience?"
  - "Leave Review" button
  - Navigates to `/review/{bookingId}`

**Review Submission:**
- Route: `/app/review/[bookingId].tsx`
- **Fields**:
  - Rating (1-5 stars, required)
  - Review text (optional)
  - Photos/videos (up to 10, via ReviewMediaUpload)
  - Tip amount (optional)
- **Categories**: Communication, Quality, Value, Timeliness
- Submit creates review record
- Updates provider's rating_average and rating_count
- Notification sent to provider

---

## 4. AI-ASSISTED FEATURES (CURRENT BEHAVIOR ONLY)

### 4.1 AI Assist Master Toggle

**Implementation:** `hooks/useAiAssist.ts`

**Observed Behavior:**
- Controlled by single boolean: `profile.ai_assist_enabled`
- Default: `true` (AI enabled for all new users)
- Persisted in Supabase profiles table
- Hook provides:
  ```typescript
  {
    aiAssistEnabled: boolean,
    toggleAiAssist: () => Promise<void>,
    loading: boolean
  }
  ```
- Toggle immediately updates database and local state
- On error: Reverts to previous state, logs error
- Unauthenticated users: `aiAssistEnabled = false`

**Minimum Threshold:**
- Function: `meetsAiThreshold(text, minLength = 10)`
- AI features only enabled when text >= 10 characters
- Applied to title field in job/listing forms

**Database:**
- Migration: `20251226171438_add_ai_assist_enabled_to_profiles.sql`
- Column: `ai_assist_enabled BOOLEAN DEFAULT true`

### 4.2 AI Photo Assist

**Component:** `components/AIPhotoAssistModal.tsx`
**Edge Function:** `supabase/functions/generate-photo/index.ts`
**AI Model:** OpenAI DALL-E 3 (via gpt-image-1)

**Current Behavior:**

**Modal Interface:**
- Opens from PhotoPicker via "AI Image Assist" button
- Two tabs: "Generate" and "Upload"

**Generate Tab:**
- **Description Input**: TextArea for prompt
- **Auto-Fill**: Context-aware default prompts:
  - Cleaning: "Spotless, professionally cleaned space with natural lighting"
  - Repair: "Professional repair work, clear before/after view"
  - Fitness: "Dynamic fitness training in professional gym setting"
  - Product/Custom: "Professional product photo showcasing"
- **Photo Count**: Buttons 1, 2, 3, 4, 5
- **Size Selector**: 1024x1024, 1536x1024, 1024x1536
- **Generate Button**: "Generate X Photos"

**Generation Process:**
1. Button shows loading: "Generating your photos..."
2. Calls edge function with:
   ```typescript
   {
     prompt: string,
     sourceContext: {
       title, description, category, subcategory,
       listingType, fulfillmentType, jobType
     },
     size: string,
     count: number
   }
   ```
3. Edge function:
   - Checks ai_assist_enabled in profile (403 if disabled)
   - Enhances prompt with GPT-4o-mini
   - Generates images with DALL-E 3
   - Returns array of {imageUrl, revisedPrompt}
4. Modal displays carousel of generated images
5. Shows revised prompt interpretation

**Image Selection:**
- Carousel navigation (prev/next buttons)
- Thumbnail grid at bottom
- Multi-select with checkmarks
- "Select" button adds checked images to listing
- Cannot exceed max photo limit (5 default)
- "Delete" button removes from generated set

**Upload Tab:**
- "Take Photo" button: Opens camera (iOS/Android)
- "Choose from Library": Opens photo picker
- Permission handling with user alerts
- Supports multi-select (up to remaining slots)
- Shows thumbnails of uploaded photos

**Error States:**
- Permission denied: Alert with instructions
- Generation failed: "Try Again" button
- API error: "AI Photo Assist is temporarily unavailable"
- Content filter: "Content blocked by safety filters"

**Disabled State:**
- When ai_assist_enabled = false
- When title < 10 characters
- When max photos reached

### 4.3 AI Title & Description Improvement

**Component:** `components/AITitleDescriptionAssist.tsx`
**Edge Function:** `supabase/functions/generate-title-description/index.ts`
**AI Model:** OpenAI GPT-4o-mini

**Current Behavior:**

**Modal Interface:**
- Opens via "Improve with AI" button on title/description fields
- Shows current title and description as input context

**Generation Controls:**
- **Tone Toggle**:
  - Options: Professional (default), Friendly
  - Changes tone of generated content
- **Length Toggle**:
  - Options: Concise (default), More Detailed
  - Affects word count and elaboration
- **Auto-Regenerate**: Changes trigger new generation (800ms debounce)

**Generation Process:**
1. Modal opens: Auto-generates if title not empty
2. Loading state: "Generating improved content..." + spinner
3. Edge function call:
   ```typescript
   {
     prompt: `Detailed prompt with rules for ${contextType}`,
     maxTokens: 500
   }
   ```
4. Prompt includes:
   - Context type (Job or Service)
   - Tone preference
   - Length preference
   - Strict rules: No emojis, no pricing, no guarantees
   - Word limits: Job title ≤ 8 words, Service title ≤ 10 words
   - Description ≤ 120 words
5. Returns JSON: `{title, description}`

**Display:**
- **Generated Title**: Shows in text box
- **Word Counter**: "X / 8 words" or "X / 10 words"
  - Red text if exceeded
- **Generated Description**: Shows in text box
- **Word Counter**: "X / 120 words"
  - Red text if exceeded
- **Regenerate Button**: "🔄 Try Again"
  - Creates new variation

**Accept/Reject:**
- **Accept**: Copies title and description back to form
- **Cancel**: Closes modal without changes
- **Validation**: Accept disabled if word counts exceeded

**Error States:**
- API failure: "Try Again" button
- Message: "AI assistance is temporarily unavailable. Please write your content manually."

**Disabled State:**
- When `disabled={true}` prop
- When title < 10 characters

### 4.4 AI Category Suggestion

**Component:** `components/AICategorySuggestion.tsx`
**Library:** `lib/ai-category-suggestion.ts`
**Edge Function:** `supabase/functions/suggest-listing-category/index.ts`
**AI Model:** OpenAI GPT-4o-mini

**Current Behavior:**

**Trigger:**
- Auto-analyzes when title AND description both have content
- Debounced (500ms) to avoid excessive calls
- Can be manually triggered via "Get AI Suggestion" button

**Analysis Process:**
1. Loading state: "Analyzing your description..." + spinner
2. Calls edge function:
   ```typescript
   {
     title: string,
     description: string
   }
   ```
3. Edge function:
   - Checks ai_assist_enabled (403 if disabled)
   - 30-minute cache for identical queries
   - Structured output from GPT-4o-mini
   - Returns suggestion with confidence score
4. Inserts tracking record in ai_category_suggestion_tracking

**Response Structure:**
```typescript
{
  suggested_category_id: string,
  suggested_category_name: string,
  suggested_subcategory_id: string,
  suggested_subcategory_name: string,
  confidence_score: number, // 0-1
  reasoning: string,        // Max 10 words
  alternate_suggestions: Array<{
    category_id: string,
    subcategory_id: string,
    score: number
  }>
}
```

**Display:**

**Primary Suggestion Card:**
- Category → Subcategory (breadcrumb style)
- Confidence badge:
  - High (≥70%): Green
  - Medium (40-69%): Yellow
  - Low (<40%): Red
- Reasoning text
- "Accept" button

**Alternate Suggestions:**
- Shows 1-2 additional options
- Each as compact card
- Shows similarity score
- Clickable to select alternative

**Accept Flow:**
1. User taps "Accept" on any suggestion
2. Sets form state: category, subcategory
3. Updates tracking record: `accepted=true`
4. Records actual selected category for ML feedback
5. Suggestion cards fade out, shows "Selected: Category → Subcategory"

**Manual Override:**
- User can still use manual CategoryPicker
- If manual selection made: Tracking updated with actual_category_id
- accepted=false remains if AI suggestion not used

**Error States:**
- API failure: "Try Again" button
- Message: "AI suggestions are temporarily unavailable. Please select a category manually from the dropdown below."

**Disabled State:**
- When disabled={true}
- When title or description < minimum threshold

### 4.5 Feature Availability Matrix

| Feature | Listing Creation | Job Posting | Edit Listing | Edit Job |
|---------|------------------|-------------|--------------|----------|
| Title/Description AI | ✓ | ✓ | ✗ | ✗ |
| Category Suggestion | ✓ | ✓ | ✗ | ✗ |
| Photo Generation | ✓ | ✓ | ✗ | ✗ |
| Master Toggle Control | ✓ | ✓ | N/A | N/A |
| Threshold Check (10 chars) | ✓ | ✓ | N/A | N/A |

### 4.6 AI Service Configuration

**AI Provider:** OpenAI
**Migration Date:** December 15, 2024 (from Google Gemini)

**Models in Use:**
- Text Generation: gpt-4o-mini
- Image Generation: gpt-image-1 (DALL-E 3)
- Content Moderation: gpt-4o-mini

**OpenAI Service:** `supabase/functions/_shared/openai-service.ts`

**Methods:**
- `generateText(prompt, config)` - Free-form text
- `generateStructuredOutput<T>(prompt, config)` - JSON responses
- `moderateContent(content, type)` - Safety checks

**Configuration:**
- temperature: 0.7 (default)
- maxTokens: Varies by feature (500-1500)
- topP: 1.0

**Error Handling:**
- Invalid API key: 503 Service Unavailable
- Quota exceeded: 429 Too Many Requests
- Content filtered: 400 with specific message
- Network errors: Retry with exponential backoff

**Cost Structure:**
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- Images: ~$0.04 per image (DALL-E 3, 1024x1024)

### 4.7 Performance & Caching

**Response Times:**
- Photo generation: 10-30 seconds per image
- Title/description: 3-5 seconds
- Category suggestion: 2-3 seconds (with cache), 5-8 seconds (without)

**Caching:**
- Category suggestions: 30-minute TTL
- Cache key: hash of title + description
- Headers: X-Cache: HIT/MISS

**Tracking:**
- All operations logged in ai_agent_actions table
- Fields: agent_id, action_type, input, output, confidence_score, execution_time_ms, status
- Category suggestions tracked in ai_category_suggestion_tracking
- Acceptance rates tracked for ML feedback

---

## 5. MEDIA & ASSET HANDLING

### 5.1 Photo Upload Components

**Primary Components:**
1. **PhotoPicker** - Service listings, jobs (max 5)
2. **MediaUpload** - Community posts (images + videos, max 5)
3. **ReviewMediaUpload** - Reviews (images + videos, max 10)
4. **Avatar Upload** - Profile pictures (1 image)

**PhotoPicker Behavior:**
- Path: `components/PhotoPicker.tsx`
- Max photos: 5 (configurable via prop)
- Features:
  - Drag-and-drop reordering with gesture support
  - Featured photo badge on first image
  - Horizontal scrollable gallery
  - Custom scroll indicators
  - Remove button per photo
  - AI Photo Assist integration
- Display: 120x120px thumbnails
- Scroll indicator with draggable thumb

**MediaUpload Behavior:**
- Path: `components/MediaUpload.tsx`
- Supports images AND videos
- Max files: 5 (configurable)
- Video validation:
  - Max size: 100MB
  - Max duration: 60 seconds
- Image quality: 0.8
- Used in: Community posts

**ReviewMediaUpload Behavior:**
- Path: `components/ReviewMediaUpload.tsx`
- Max media: 10 per review
- Validation:
  - Photos: Max 10MB each
  - Videos: Max 100MB each, 60 sec duration
- Displays file size and duration
- Thumbnail generation for videos

### 5.2 Photo Limits by Type

| Content Type | Max Photos | Max Videos | Max Total | Component |
|--------------|------------|------------|-----------|-----------|
| Service Listing | 5 | 0 | 5 | PhotoPicker |
| Job Posting | 5 | 0 | 5 | PhotoPicker |
| Community Post | 5 | 5 | 5 | MediaUpload |
| Review | 10 | 10 | 10 | ReviewMediaUpload |
| Profile Avatar | 1 | 0 | 1 | Direct upload |

### 5.3 Camera vs Gallery

**Permission Flow:**

**Camera:**
```typescript
const { status } = await ImagePicker.requestCameraPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission Required', 'Camera permission is required...');
  return;
}
```

**Gallery:**
```typescript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission Required', 'Photo library permission required...');
  return;
}
```

**Platform-Specific UI:**
- **iOS**: ActionSheetIOS with cancel button
- **Android**: Alert.alert with button options

**Camera Capture:**
- allowsEditing: false (no cropping)
- quality: 0.8
- mediaTypes: ['images']
- Single capture only

**Gallery Selection:**
- allowsEditing: false
- quality: 0.8
- allowsMultipleSelection: true
- selectionLimit: Remaining slots (e.g., if 2/5 used, limit = 3)

### 5.4 Image Editing/Cropping

**Current Implementation:** Minimal/None

**Selection Stage:**
- No inline editing enabled
- allowsEditing: false on all image pickers
- Users select as-is from device

**Post-Selection:**
- PhotoPicker allows drag-to-reorder
- Remove via X button
- No crop, resize, or filters

**Available but Unused:**
- Image Optimization helper: `lib/image-optimization.ts`
  - compressImage(uri, {maxWidth, maxHeight, quality})
  - Not applied in main upload flows
- ImageManipulator from expo-image-manipulator
  - Installed but not used in upload path

### 5.5 Storage Bucket Configuration

#### Listing Photos Bucket
**Migration:** `20260106035044_create_listing_photos_storage_bucket.sql`

**Configuration:**
- Bucket ID: 'listing-photos'
- Public: true (public read access)
- Max file size: 5MB per file
- Allowed MIME types:
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - image/gif

**Security Policies:**
- INSERT: Authenticated users only
- UPDATE: Authenticated users only (own files)
- DELETE: Authenticated users only (own files)
- SELECT: Public (anyone can read)

**Path Structure:** `{listingId}/photo-{index}-{timestamp}.{ext}`

#### Avatars Bucket
**Migration:** `20260106033621_create_avatars_storage_bucket.sql`

**Configuration:**
- Bucket ID: 'avatars'
- Public: true
- Max file size: 5MB
- Allowed MIME types: (same as listing-photos)

**Security Policies:**
- INSERT: Authenticated, folder = auth.uid()
- UPDATE: Authenticated, own folder only
- DELETE: Authenticated, own folder only
- SELECT: Public

**Path Structure:** `{userId}/avatar-{timestamp}.{ext}`

#### Review Media Bucket
**Configuration:** Runtime creation in `lib/review-media.ts`

**Configuration:**
- Bucket ID: 'review-media'
- Public: true
- Max file size: 100MB
- Allowed MIME types:
  - All image types
  - video/mp4, video/quicktime, video/x-msvideo

**Path Structure:** `{userId}/{reviewId}/{timestamp}-{random}.{ext}`

### 5.6 Photo Display in Create Flows

**Service Listing Create:**
```typescript
// State
const [photos, setPhotos] = useState<string[]>([]);

// Render
<PhotoPicker
  label="Service Photos"
  photos={photos}
  onPhotosChange={setPhotos}
  maxPhotos={5}
  aiAssistEnabled={aiAssistEnabled}
  onAiImageAssist={() => setShowAiPhotoModal(true)}
  helperText="First photo will be the main display image."
/>

// On submit
if (photos.length > 0) {
  const uploadResult = await uploadMultipleListingPhotos(listingId, photos);
  // URLs stored as JSON array in database
}
```

**Job Post Create:**
- Same PhotoPicker component
- Same max 5 limit
- AI assist available
- Helper text: "Job Photos (Optional)"

**Community Post Create:**
```typescript
const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

<MediaUpload
  maxFiles={5}
  allowImages={true}
  allowVideos={true}
  onMediaSelected={setMediaFiles}
/>

// Upload to 'media' bucket
const filePath = `posts/${profile.id}/${fileName}`;
```

### 5.7 Photo Display in Edit Flows

**Listing Edit:**
- No dedicated edit screen exists
- Photos can only be modified by recreating listing
- Custom service options edit exists but no photo management

**Review Edit:**
- Not supported - reviews immutable after submission

### 5.8 Photo Display in Grid View

**Home Feed Grid:**
```typescript
// Data structure
{
  id: listing.id,
  featured_image_url: featuredImage,  // First photo or placeholder
  photos: photosArray,
  // ... other fields
}

// Featured image selection
const featuredImage = listing.featured_image_url ||
  (photos.length > 0 ? photos[0] : 'https://images.pexels.com/photos/...');
```

**Card Display:**
- 2-column responsive grid
- Featured image shown (120x120px thumbnail)
- First photo = featured
- Fallback to Pexels placeholder if no photos

**ResponsiveGrid Component:**
- Generic grid layout
- Handles 2-column responsive
- Passes featured image to cards

### 5.9 Photo Display in Map View

**Map Marker Thumbnails:**
- Uses featured_image_url for provider cards
- Listing cards show featured image in popup
- NativeMapView displays listing cards with image

**Marker Info Card:**
- Shows featured image (if available)
- Truncated title and price
- Distance from center

### 5.10 Photo Display in Listing Details

**Listing Detail Screen:**
```typescript
// Photo extraction from database
let photos: string[] = [];
if (listing.photos) {
  if (Array.isArray(listing.photos)) {
    photos = listing.photos;
  } else if (typeof listing.photos === 'string') {
    photos = JSON.parse(listing.photos);
  }
}

// Display carousel
<PostMediaCarousel photos={photos} />
// First photo (index 0) shown as featured
```

**Carousel Features:**
- Horizontal swipe navigation
- Pagination dots
- Full-width display
- Zoom on tap (likely)

### 5.11 Avatar Upload Flow

**Implementation:** `lib/avatar-upload.ts`

**Complete Flow:**
1. Request permissions (camera or library)
2. Pick image (camera or gallery)
3. Upload to 'avatars' bucket: `{userId}/avatar-{timestamp}.{ext}`
4. Get public URL with cache busting: `?t={timestamp}`
5. Update profile.avatar_url
6. Delete old avatar from storage (if exists)

**Used in:** `/app/settings/edit-profile.tsx`

**Display:**
- Profile screen: CircularAvatar component
- Fallback: User initials on colored background
- Size: Varies by context (24px - 96px)

### 5.12 File Upload Utilities

**Helper:** `lib/file-upload-utils.ts`

**Key Functions:**

**fileUriToByteArray(uri):**
- Handles data URIs (base64)
- Handles HTTP/HTTPS URLs (fetch + blob)
- Handles local file URIs (FileSystem.readAsStringAsync)
- Returns Uint8Array for Supabase storage

**getFileExtension(uri):**
- Extracts extension from URI
- Handles data URIs
- Defaults to 'jpg' if unknown

**getContentType(extension):**
- Maps extensions to MIME types
- Supports: jpg, png, gif, webp, pdf, mp3, wav, mp4, mov
- Defaults to 'application/octet-stream'

### 5.13 Listing Photo Upload

**Implementation:** `lib/listing-photo-upload.ts`

**uploadListingPhoto(listingId, imageUri, index):**
1. Convert URI to byte array
2. Generate filename: `{listingId}/photo-{index}-{timestamp}.{ext}`
3. Upload to 'listing-photos' bucket
4. Return public URL

**uploadMultipleListingPhotos(listingId, imageUris):**
- Loops through array
- Uploads each sequentially
- Returns: `{success: boolean, urls: string[], errors: string[]}`

**deleteListingPhoto(photoUrl):**
- Extracts path from URL
- Deletes from 'listing-photos' bucket

### 5.14 Review Media Management

**Implementation:** `lib/review-media.ts`

**uploadReviewMedia(reviewId, fileUri, mediaType, metadata):**
1. Authenticate user
2. Get file info from FileSystem
3. Generate unique filename
4. Convert to byte array
5. Upload to 'review-media' bucket: `{userId}/{reviewId}/{filename}`
6. Return public URL and path

**addReviewMedia(reviewId, mediaType, filePath, fileUrl, metadata):**
- Calls RPC function: add_review_media
- Inserts record in review_media table
- Returns media ID

**validateMediaConstraints(type, fileSize, duration):**
- Photos: Max 10MB
- Videos: Max 100MB, 60 seconds
- Returns: `{valid: boolean, error?: string}`

**batchUploadReviewMedia(reviewId, mediaItems, onProgress):**
- Uploads multiple items sequentially
- Calls progress callback: `(current, total)`
- Returns: `{successful: number, failed: number, errors: string[]}`

### 5.15 Image Optimization (Available but Not Used)

**Implementation:** `lib/image-optimization.ts`

**Features:**
- Local file system caching (100MB limit, LRU eviction)
- Lazy loading hook: useLazyImage
- Progressive loading: useProgressiveImage
- Compression: compressImage(uri, {maxWidth, maxHeight, quality})
- Responsive URLs: getResponsiveImageUrl(url, deviceWidth)
- Thumbnail generation: getThumbnailUrl(url, size)
- Batch preloader: ImagePreloader class

**Observed Usage:** Not actively used in main upload/display paths

### 5.16 Camera-Specific Component

**Component:** `components/IDCameraCapture.tsx`

**Purpose:** ID verification document capture

**Features:**
- Full-screen camera using expo-camera/CameraView
- Overlay frames:
  - ID documents: Rectangle frame (0.63 aspect ratio)
  - Selfie: Circular dashed frame
- Flash toggle for back camera
- Camera flip for selfies
- Photo preview with retake/confirm workflow

**Capture Types:**
- 'front' - Front of ID
- 'back' - Back of ID
- 'selfie' - Face capture

**Flow:**
1. Request camera permission
2. Show camera with overlay
3. Capture with takePictureAsync()
4. Show preview with quality tips
5. Retake or confirm
6. Return URI to parent

### 5.17 Media Summary Table

| Feature | Component | Camera | Gallery | Max Items | Max Size | Video Support |
|---------|-----------|--------|---------|-----------|----------|---------------|
| Service Listing | PhotoPicker | ✓ | ✓ | 5 | 5MB | ✗ |
| Job Posting | PhotoPicker | ✓ | ✓ | 5 | 5MB | ✗ |
| Community Post | MediaUpload | ✓ | ✓ | 5 | 100MB | ✓ |
| Review | ReviewMediaUpload | ✓ | ✓ | 10 | 10MB/100MB | ✓ |
| Avatar | Direct | ✓ | ✓ | 1 | 5MB | ✗ |
| ID Verification | IDCameraCapture | ✓ | ✗ | 1 | N/A | ✗ |

---

## 6. UI COMPONENT BEHAVIOR

### 6.1 Scroll Behavior

**FlatList (List Views):**
- Used in: Home feed, bookings list, notifications
- Infinite scroll: Loads next page on reaching bottom (onEndReached)
- Loading indicator: Shows at bottom during fetch
- Pull-to-refresh: Enabled by default (onRefresh prop)
- Scroll indicators: Default iOS/Android style

**ScrollView (Detail Views):**
- Used in: Listing details, booking details, profile screens
- Vertical scroll only
- Keyboard handling: KeyboardAway View wrapper
- Scroll-to-top: Automatic on tab reselection
- Bounce: Enabled (iOS default)

**Horizontal Scroll (Carousels):**
- Used in: Photo carousels, time slot pickers, category browsers
- Snap to interval: Enabled for carousels
- Pagination dots: Manual implementation with ScrollView.onScroll
- Gesture handler: react-native-gesture-handler for smooth dragging

**Custom Scroll Indicators:**
- PhotoPicker: Custom draggable thumb
- Pagination: Dot indicators (active/inactive states)
- Progress: Percentage-based (e.g., "Showing 20 of 150")

### 6.2 Modals and Sheets

**Modal Implementation:** React Native Modal

**Types:**

**Full-Screen Modal:**
- Used in: AI Photo Assist, Review submission
- animationType: 'slide'
- presentationStyle: 'fullScreen'
- Close: Back button in header

**Bottom Sheet:**
- Used in: Filters, payment method selection
- Custom implementation with Animated API
- Backdrop: Semi-transparent overlay, tap to close
- Handle: Draggable bar at top

**Alert Modal:**
- React Native Alert.alert
- Platform-specific rendering (iOS vs Android)
- Button configurations: 1-3 buttons
- Destructive actions: Red text (iOS)

**Confirmation Dialogs:**
- Custom component with Modal
- Two-button layout: Cancel (outline) + Confirm (filled)
- Blocking: Requires explicit user action

### 6.3 Error States

**Field-Level Errors:**
```typescript
// State structure
const [errors, setErrors] = useState<{[key: string]: string}>({});

// Display
{errors.email && (
  <Text style={styles.errorText}>{errors.email}</Text>
)}
```

**Common Error Messages:**
- "This field is required"
- "Invalid email format"
- "Passwords do not match"
- "Price must be greater than 0"
- "Please select at least one option"

**Alert-Based Errors:**
```typescript
Alert.alert('Error Title', 'Error message detail');
```

**Examples:**
- "Failed to load listing details"
- "Payment processing failed. Please try again."
- "Network error. Check your connection."

**Inline Error Components:**
- Red text below input field
- Red border on input field
- Error icon (AlertCircle) next to message

**Toast/Snackbar:**
- Not implemented
- All errors via Alert or inline text

### 6.4 Empty States

**No Results:**
```typescript
{listings.length === 0 && !loading && (
  <View style={styles.emptyState}>
    <Icon size={64} color={colors.textLight} />
    <Text style={styles.emptyTitle}>No Listings Found</Text>
    <Text style={styles.emptyText}>
      Try adjusting your filters or search terms
    </Text>
  </View>
)}
```

**Common Empty States:**
- No listings: SearchX icon, "No listings found"
- No bookings: Calendar icon, "No bookings yet"
- No notifications: Bell icon, "No notifications"
- No messages: MessageSquare icon, "No conversations yet"
- No reviews: Star icon, "No reviews yet"

**Empty State Actions:**
- Primary CTA button (e.g., "Browse Services")
- Secondary hint text
- Centered layout with icon + text

### 6.5 Loading States

**Full-Screen Loading:**
```typescript
{loading && (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
)}
```

**Inline Loading:**
- ActivityIndicator in button during submit
- Button text changes: "Submit" → "Submitting..."
- Button disabled during loading

**Skeleton Screens:**
- Not implemented
- All loading uses ActivityIndicator

**Shimmer Effects:**
- Not implemented

**Pull-to-Refresh:**
- ActivityIndicator at top during refresh
- Native iOS/Android style

**Pagination Loading:**
- "Loading more..." text at bottom of list
- ActivityIndicator below last item

### 6.6 Keyboard Behavior

**KeyboardAvoidingView:**
- Used on: Login, Register, form screens
- behavior: Platform.select({ios: 'padding', android: 'height'})
- Wraps ScrollView

**Keyboard Dismissal:**
- Tap outside input: Not automatic (requires Keyboard.dismiss())
- Return key: Submits form or moves to next field
- Scroll: Keyboard stays visible

**Input Focus:**
- Auto-focus: First field on screen load (auth screens)
- Next field: Return key moves focus (where implemented)
- Done button: Dismisses keyboard

**Observed Issues:**
- Keyboard may cover inputs on some screens
- No universal keyboard avoidance strategy

### 6.7 Responsive Layout

**Breakpoints:**
- Not explicitly defined in code
- Relies on Dimensions.get('window')
- Grid: 2-column on all screen sizes

**Platform Differences:**
- iOS: Native look and feel (action sheets, alerts)
- Android: Material design patterns
- Web: Metro bundler, single output

**Safe Area Handling:**
- useSafeAreaInsets() from react-native-safe-area-context
- Applied to: Tab bar, headers, modals
- Padding: Top = status bar, Bottom = home indicator

**Orientation:**
- Locked to portrait (app.json: "orientation": "portrait")
- No landscape support

### 6.8 Gestures

**Implemented Gestures:**
- Tap: TouchableOpacity with activeOpacity={0.7}
- Long press: onLongPress prop (context menus)
- Swipe: Horizontal scroll in carousels
- Drag: Photo reordering with react-native-gesture-handler
- Pull-to-refresh: FlatList default

**Not Implemented:**
- Pinch to zoom
- Double tap
- Swipe to delete
- Drag to dismiss modals

### 6.9 Animations

**Used:**
- react-native-reanimated for smooth animations
- Animated API for modals and transitions
- LayoutAnimation for subtle UI changes

**Common Animations:**
- Fade in/out: Opacity changes
- Slide in/out: TranslateY for modals
- Scale: Button press feedback
- Rotation: Loading spinners

**Transitions:**
- Screen transitions: Default stack navigator animations
- Tab transitions: Fade (Expo Router default)
- Modal presentation: Slide from bottom

**Performance:**
- useNativeDriver: true (where possible)
- Worklets: For smooth 60fps animations

---

## 7. MAP & LOCATION FEATURES

### 7.1 Map Implementation

**Two Implementations:**

**Web:** `components/InteractiveMapView.tsx`
- Simulated map (not real Mapbox on web)
- Positions markers mathematically based on lat/lng
- Grid background with crosshair
- Manual zoom (latitudeDelta/longitudeDelta adjustment)

**Native:** `components/NativeInteractiveMapView.tsx`
- Real Mapbox GL maps (@rnmapbox/maps)
- Access token from env: MAPBOX_CONFIG.accessToken
- Actual map rendering with streets, satellite, dark, light styles

**Platform Routing:**
```typescript
// components/InteractiveMapViewPlatform.tsx
if (Platform.OS === 'web') {
  return <InteractiveMapView {...props} />;
} else {
  return <NativeInteractiveMapView {...props} />;
}
```

### 7.2 How Listings/Jobs Appear on Map

**Map Mode Toggle:**
- **Listings Mode**: Show individual service/job pins
- **Providers Mode**: Cluster listings by provider location

**Listings Mode:**
```typescript
const listingMarkers = listings
  .filter(listing => listing.latitude && listing.longitude)
  .map(listing => ({
    id: listing.id,
    latitude: listing.latitude,
    longitude: listing.longitude,
    title: listing.title,
    price: listing.base_price || listing.budget_min || 0,
    type: 'listing',
    listingType: determineType(listing), // 'Service' | 'CustomService' | 'Job'
  }));
```

**Providers Mode:**
```typescript
// Groups listings by provider
const providersMap = new Map();
listings.forEach(listing => {
  const profile = listing.provider || listing.customer;
  if (!providersMap.has(profile.id)) {
    providersMap.set(profile.id, {
      id: profile.id,
      latitude: profile.latitude,
      longitude: profile.longitude,
      title: profile.full_name,
      type: 'provider',
      rating: profile.rating_average,
      isVerified: profile.is_verified,
      categories: [...unique categories from listings],
    });
  }
});
```

**Missing Coordinates:**
- Filtered out before rendering
- Console log: "Listing missing coordinates: {id} {title}"
- Not displayed on map

### 7.3 Marker Behavior

**Marker Types:**

**Service Listing:**
- Icon: MapPin (green bubble)
- Background: White
- Border: Green (3px)
- Price tag below: Base price

**Custom Service:**
- Icon: Sparkles (purple bubble)
- Background: White
- Border: Purple (3px)
- Price tag below: Base price

**Job:**
- Icon: Briefcase (orange bubble)
- Background: White
- Border: Orange (3px)
- Price tag below: Fixed price or budget_min

**Provider:**
- Icon: User (green bubble)
- Background: White
- Border: Green (3px)
- Badge: BadgeCheck if verified
- Rating tag below: Star + rating

**Selection State:**
- Scale: 1.15x larger
- Background: Filled with marker color
- Icon color: White
- Border: White
- Shadow: More prominent

### 7.4 Marker Interactivity

**Touch Targets:**
- hitSlop: {top: 20, bottom: 30, left: 20, right: 20}
- TouchableOpacity with activeOpacity={0.7}
- pointerEvents="box-none" on wrapper
- zIndex: 100, elevation: 100

**Tap Behavior:**
1. Marker tapped
2. setSelectedMarker(marker)
3. Camera centers on marker (native only)
4. Info card appears at bottom
5. Marker changes to selected state

**Info Card - Listing:**
- Title (truncated to 1 line)
- Price (formatted currency)
- Distance from map center
- "Tap to view details" implied

**Info Card - Provider:**
- Full name
- Business name (if any)
- Rating + review count
- Categories (up to 3, +N more)
- Response time
- Completion rate
- Distance
- "Tap to view full profile" hint

**Card Tap:**
- Listing: Navigate to `/listing/{id}` or `/jobs/{id}`
- Provider: Navigate to `/reviews/{providerId}`

**Close Button:**
- X button in top-right of info card
- Tap to deselect marker
- Info card slides out

### 7.5 Clustering

**When Active:**
- Zoom level (latitudeDelta) > 0.02
- Can be disabled via prop: enableClustering={false}

**Algorithm:**
```typescript
// For each marker:
//   Find nearby markers (< clusterRadius pixels)
//   If found: Create cluster at average position
//   Mark all as processed
// Return: clusters + unclustered markers
```

**Cluster Radius:** 60 pixels (configurable)

**Cluster Display:**
- Circular bubble
- Background: Primary color
- Border: White (3px)
- Text: Marker count (white, bold)
- Size: 50x50px
- Shadow: Prominent

**Cluster Tap:**
1. setSelectedCluster(cluster)
2. Calculate bounds of clustered markers
3. Zoom in to fit cluster markers (0.5x delta)
4. Markers expand to individual pins

**Clustering by Provider:**
- Automatically clusters when "Providers" mode selected
- Shows provider count instead of listing count

### 7.6 Navigation: Map ↔ Listing Details

**From Map to Detail:**
1. User taps marker
2. Info card appears
3. User taps info card
4. Determines type (listing vs provider)
5. Navigates to appropriate screen:
   - Service: `/listing/{id}`
   - Job: `/jobs/{id}`
   - Provider: `/reviews/{providerId}`

**From Detail to Map:**
- No direct link
- User must navigate back to home, switch to map view

**Location Display on Listing Detail:**
- Text address shown
- No embedded map
- "View on Map" button: Not implemented

### 7.7 Map Controls

**Web Implementation:**

**Zoom In (+):**
- Decreases latitudeDelta and longitudeDelta by 0.5x
- Centered on current map center

**Zoom Out (-):**
- Increases latitudeDelta and longitudeDelta by 2x
- Centered on current map center

**Recenter (Maximize2):**
- Calculates bounds of all markers
- Sets region to fit all markers with 1.5x padding

**Switch to List (List icon):**
- Calls onSwitchToList() callback
- Parent changes view mode

**Native Implementation:**

**Zoom In/Out:**
- Uses Mapbox camera controls
- cameraRef.current.setCamera({zoomLevel: current ± 1})

**Recenter:**
- Fits bounds: cameraRef.current.fitBounds(coordinates, padding)

**Map Style Selector:**
- Button opens style picker
- Options: Streets, Satellite, Dark, Light
- Updates mapStyle URI

### 7.8 Stats Bar

**Display:**
- Positioned: Top center below filters
- Background: Primary color
- Pill shape (borderRadius: full)
- Shadow: lg

**Content:**
- "{visible} items ({total} total)"
- Divider
- "lat, lng" (4 decimal places)

**Pointer Events:** none (doesn't block touches)

### 7.9 Known Map Inconsistencies

**Observed Issues:**

**Missing Coordinates:**
- Many listings/jobs don't have lat/lng
- Only manually entered locations stored
- No geocoding on save
- Results in empty maps for some searches

**Web vs Native Behavior:**
- Web: Simulated positioning, less accurate
- Native: Real Mapbox, accurate but requires API key
- Visual mismatch between platforms

**Marker Overlap:**
- When many markers in small area, may overlap
- Clustering helps but doesn't solve at high zoom
- Selection difficult with overlapping markers

**Performance:**
- Web: Slow with >100 markers
- Native: Handles 1000+ smoothly

**Zoom Levels:**
- Web: Math-based, can result in odd positioning
- Native: Standard map zoom levels

**Pin Click Issues (Recently Fixed):**
- Previously: Background elements blocked touches
- Fix: Added pointerEvents="box-none" and zIndex layering
- Current: Pins clickable reliably

**Location Accuracy:**
- Relies on user-entered addresses
- No validation against actual coordinates
- Some locations may be incorrect

---

## 8. VALIDATION, ERRORS & EDGE CASES

### 8.1 Field Validation Rules

**Authentication:**

**Email:**
- Format: Validated by Supabase (RFC 5322)
- Required: Yes
- Unique: Yes (database constraint)
- Error: "Invalid email format" or "Email already in use"

**Password:**
- Minimum length: 6 characters
- Required: Yes
- Complexity: Not enforced
- Match confirmation: Yes (register only)
- Errors:
  - "Password must be at least 6 characters"
  - "Passwords do not match"

**Full Name:**
- Required: Yes (register, profile edit)
- Minimum: 1 character
- Maximum: Not enforced
- Format: Any string accepted

**Listings/Jobs:**

**Title:**
- Required: Yes
- Minimum: 1 character
- Maximum: Not enforced in validation (UI may truncate)
- Format: Any string
- Error: "Title is required"

**Description:**
- Required: Yes
- Minimum: 1 character
- Maximum: 120 words (AI features only, not enforced in database)
- Format: Multiline text
- Error: "Description is required"

**Category:**
- Required: Yes
- Type: Must exist in categories table
- Error: "Please select a category"

**Price:**
- Required: Yes (listings, fixed-price jobs)
- Minimum: > 0
- Type: Number
- Decimals: Allowed
- Error: "Price must be greater than 0"

**Budget (Jobs):**
- Required: No (quote-based mode)
- Minimum: > 0 if provided
- Validation: If both min and max set, min <= max
- Error: "Minimum budget cannot exceed maximum budget"

**Availability:**
- Required: Yes (listings)
- Format: Array of day names
- Minimum: 1 day
- Error: "Please select at least one available day"

**Fulfillment:**

**Fulfillment Window:**
- Required: Yes (if fulfillment enabled)
- Minimum: 1 day
- Type: Integer
- Error: "Fulfillment window must be at least 1 day"

**Fulfillment Methods:**
- Required: Yes (if fulfillment enabled)
- Minimum: 1 method selected
- Error: "Please select at least one fulfillment method"

**Item Weight:**
- Required: Yes (if Shipping selected)
- Minimum: > 0
- Type: Number (ounces)
- Error: "Item weight is required for shipping"

**Package Dimensions:**
- Required: All three (if Shipping selected)
- Minimum: > 0
- Type: Number (inches)
- Validation: If any one filled, all three required
- Error: "All dimensions (L×W×H) required for shipping"

**Inventory:**

**Stock Quantity:**
- Required: Yes (if inventory enabled)
- Minimum: 1
- Type: Integer
- Error: "Stock quantity must be at least 1"

**Damage Deposit:**
- Required: Yes (if deposit enabled)
- Minimum: > 0
- Type: Number
- Error: "Damage deposit amount must be greater than 0"

**Booking:**

**Date:**
- Required: Yes
- Minimum: Today
- Format: ISO date string
- Error: "Please select a date"

**Time:**
- Required: Yes
- Format: "HH:MM AM/PM" or one of: Morning, Afternoon, Evening, Flexible
- Error: "Please select a time"

**Location/Address:**
- Required: Yes
- Format: String
- Minimum: 1 character
- Error: "Location is required" or "Please enter full address"

**Payment Method:**
- Required: Yes (booking checkout)
- Options: 'stripe' or 'wallet'
- Error: "Please select a payment method"

### 8.2 Silent Failures

**Observed Silent Failures:**

**Photo Upload:**
- If upload fails, listing still creates
- Photos field: Empty array or null
- No retry mechanism
- User not always notified

**Push Notifications:**
- Registration failure: Silently caught
- Push token not saved: No user notification
- Notification send failure: Logged but not surfaced

**Realtime Subscriptions:**
- Connection failures: Not reported to user
- Updates may not arrive
- No reconnection indicator

**Calendar Sync:**
- Permission denied: Caught silently in some flows
- Sync failures: Not always visible

**Geocoding:**
- Address validation: Not performed
- Invalid coordinates: Stored as-is
- Map may show incorrect locations

**AI Features:**
- API failures: Generic error messages
- Timeout: May not show clear message
- Partial results: May not indicate incomplete data

### 8.3 Partial Saves

**Listings:**
- No draft system
- All fields saved on submit only
- Form state lost if app closes
- No auto-save

**Jobs:**
- No draft system
- All fields required on submit
- No incremental save

**Bookings:**
- Soft inventory locks: 15-minute expiration
- If user abandons: Lock released automatically
- Booking record created before payment
- If payment fails: Booking remains in 'Pending' state

**Profile Edits:**
- Avatar uploaded separately
- If avatar upload fails: Profile update may succeed
- Inconsistent state possible

### 8.4 Inconsistent States

**Booking Status:**
- status = 'PendingApproval', payment_status = 'Completed': Valid
- status = 'Completed', payment_status = 'Pending': Should not occur
- status = 'Accepted', payment_status = 'Refunded': Possible if refund after acceptance

**Inventory:**
- Soft lock expired, booking still pending: Edge case
- Hard lock without booking: Should not occur
- Inventory locked but listing deleted: Possible

**Photos:**
- URLs stored but files deleted from storage: Broken images
- Photos uploaded but listing creation failed: Orphaned files
- Featured image != photos[0]: Inconsistency possible

**Wallet Balance:**
- Negative balance: Prevented by constraint
- Transaction record without balance update: Should not occur
- Balance != sum of transactions: Possible if transaction creation failed

**Provider Verification:**
- id_verified=true but no verification record: Possible
- Verification expired but flag not updated: No expiration check

### 8.5 Known User-Visible Errors

**Authentication:**
- "Invalid email or password" - Supabase auth error
- "Email already in use" - Registration attempt with existing email
- "Network error" - Connection failure

**Listing Creation:**
- "Failed to upload photos" - Storage upload failure
- "Failed to create listing" - Database insert failure
- "Please fill in all required fields" - Validation error

**Booking:**
- "Booking not found" - Invalid booking ID (recently fixed for new bookings)
- "Payment processing failed" - Stripe error
- "Insufficient wallet balance" - Wallet payment attempt with low balance
- "This item is no longer available" - Inventory check failed

**AI Features:**
- "AI Photo Assist is temporarily unavailable" - OpenAI API error
- "AI assistance is temporarily unavailable. Please write your content manually." - Title/description generation failure
- "Content blocked by safety filters" - OpenAI content moderation
- "AI Assist is disabled. Enable it in Settings to use this feature." - Feature toggle off

**Map:**
- "No Locations Available" - No listings with coordinates
- "Booking not found" (previously) - Incorrect routing to booking detail instead of creation

**General:**
- "Failed to load data" - Generic fetch failure
- "Something went wrong. Please try again." - Catch-all error

### 8.6 Validation Patterns

**Client-Side Validation:**
```typescript
const validateForm = (): boolean => {
  const newErrors: {[key: string]: string} = {};

  if (!title.trim()) {
    newErrors.title = 'Title is required';
  }

  if (!description.trim()) {
    newErrors.description = 'Description is required';
  }

  if (!categoryId) {
    newErrors.category = 'Please select a category';
  }

  if (price <= 0) {
    newErrors.price = 'Price must be greater than 0';
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length > 0) {
    Alert.alert('Validation Error', 'Please fix the errors before submitting');
    return false;
  }

  return true;
};
```

**Server-Side Validation:**
- Database constraints: NOT NULL, CHECK constraints
- Row Level Security: Enforces ownership rules
- Unique constraints: Email, listing IDs
- Foreign key constraints: Relationships validated

**Validation Timing:**
- On submit: All fields validated
- On blur: Not implemented
- Real-time: Not implemented (except word counters)

### 8.7 Error Recovery

**Retry Mechanisms:**

**Network Errors:**
- Manual retry: User taps "Try Again" button
- No automatic retry

**Upload Failures:**
- Manual retry: User re-initiates upload
- No automatic retry
- No resume capability

**Payment Failures:**
- User must restart payment flow
- Previous attempt marked as failed
- No automatic retry

**AI Generation:**
- "Try Again" button provided
- Can regenerate with same parameters
- No automatic fallback

**Fallback Strategies:**

**Missing Photos:**
- Pexels placeholder images used
- First photo: Featured image
- No photo: Generic category image

**Missing Location:**
- Text address displayed
- Map view: Filtered out
- Search: Still appears in results

**Missing Profile Data:**
- Avatar: Initials on colored background
- Name: "User" default
- Rating: 0.0 (0 reviews)

**Offline Behavior:**
- Not handled
- Network errors shown
- No offline queue
- No cached data fallback

---

## 9. DATA MODEL SUMMARY (OBSERVED)

### 9.1 Core Entities

**User:**
```typescript
// Stored in: auth.users (Supabase Auth)
{
  id: uuid,                    // Primary key
  email: string,               // Unique, not null
  encrypted_password: string,  // Hashed
  email_confirmed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp,
  raw_user_meta_data: jsonb,  // {full_name}
}
```

**Profile:**
```typescript
// Stored in: public.profiles
{
  id: uuid,                           // PK, FK to auth.users.id
  user_type: UserType,                // 'Customer' | 'Provider' | 'Hybrid' | 'Admin'
  email: string,                      // Synced from auth.users
  full_name: string,                  // Required
  phone: string,                      // Optional, E.164 format
  phone_verified: boolean,            // Default: false
  avatar_url: string,                 // URL to avatars bucket
  bio: text,                          // Optional
  location: string,                   // City, State format
  latitude: float,                    // Decimal degrees
  longitude: float,                   // Decimal degrees
  service_radius: integer,            // Miles, default: 25
  subscription_plan: SubscriptionPlan,// 'Free' | 'Pro' | 'Premium' | 'Elite'
  subscription_expires_at: timestamp, // Null for Free
  id_verified: boolean,               // Stripe Identity status
  business_verified: boolean,         // Business doc verification
  payout_connected: boolean,          // Stripe Connect status
  rating_average: float,              // 0.0-5.0, default: 0
  rating_count: integer,              // Default: 0
  total_bookings: integer,            // Default: 0
  admin_mode: boolean,                // Admin UI toggle, default: false
  ai_assist_enabled: boolean,         // AI features toggle, default: true
  created_at: timestamp,
  updated_at: timestamp,
}

// Relationships:
// - has many: service_listings (as provider)
// - has many: jobs (as customer)
// - has many: bookings (as customer or provider)
// - has many: reviews (as reviewer or reviewee)
// - has one: wallet
```

**Category:**
```typescript
// Stored in: public.categories
{
  id: uuid,                    // PK
  name: string,                // Not null, unique
  slug: string,                // URL-friendly, unique
  description: text,           // Optional
  icon: string,                // Icon name (lucide)
  image_url: string,           // Pexels or storage URL
  parent_id: uuid,             // FK to categories.id (for subcategories)
  sort_order: integer,         // Display order
  is_active: boolean,          // Default: true
  created_at: timestamp,
}

// Relationships:
// - has many: service_listings
// - has many: jobs
// - has many: subcategories (self-referential)
// - belongs to: parent_category (optional)
```

**Service Listing:**
```typescript
// Stored in: public.service_listings
{
  id: uuid,                          // PK
  provider_id: uuid,                 // FK to profiles.id, not null
  category_id: uuid,                 // FK to categories.id, not null
  title: string,                     // Not null
  description: text,                 // Not null
  base_price: decimal(10,2),         // Not null, check > 0
  pricing_type: PricingType,         // 'Fixed' | 'Hourly'
  estimated_duration: integer,       // Minutes, optional
  listing_type: ListingType,         // 'Service' | 'CustomService'
  photos: text[],                    // Array of URLs or JSON string
  featured_image_url: string,        // First photo or custom
  tags: text[],                      // Searchable keywords
  location: string,                  // Address text
  latitude: float,                   // Optional
  longitude: float,                  // Optional
  availability: jsonb,               // ["Monday", "Wednesday", ...]
  is_active: boolean,                // Default: true
  view_count: integer,               // Default: 0
  booking_count: integer,            // Default: 0
  rating_average: float,             // Aggregated from reviews
  rating_count: integer,             // Review count

  // Fulfillment (optional)
  fulfillment_window_days: integer,  // Min 1, if fulfillment enabled
  requires_fulfillment: boolean,     // Default: false

  // Shipping (optional, if fulfillment includes shipping)
  item_weight_oz: integer,           // Weight in ounces
  item_dimensions: jsonb,            // {length, width, height} in inches

  // Inventory (optional)
  inventory_enabled: boolean,        // Default: false

  // Agreements (optional)
  requires_agreement: boolean,       // Default: false
  requires_deposit: boolean,         // Default: false
  deposit_amount: decimal(10,2),     // If deposit required

  // Custom Service (optional)
  proofing_required: boolean,        // Default: false (CustomService only)

  created_at: timestamp,
  updated_at: timestamp,
}

// Relationships:
// - belongs to: profile (provider)
// - belongs to: category
// - has many: service_options (if CustomService)
// - has many: value_added_services
// - has many: fulfillment_options
// - has many: inventory_items
// - has many: bookings
```

**Service Option (Custom Service):**
```typescript
// Stored in: public.service_options
{
  id: uuid,                    // PK
  listing_id: uuid,            // FK to service_listings.id
  option_name: string,         // "Size", "Color", etc.
  option_type: string,         // 'single' | 'multiple'
  choices: jsonb,              // [{name: "Small", price_modifier: 0}, ...]
  sort_order: integer,         // Display order
  created_at: timestamp,
}
```

**Value-Added Service:**
```typescript
// Stored in: public.value_added_services
{
  id: uuid,                    // PK
  listing_id: uuid,            // FK to service_listings.id
  service_name: string,        // "Express Delivery"
  description: text,           // Optional
  price: decimal(10,2),        // Additional cost
  is_active: boolean,          // Default: true
  created_at: timestamp,
}
```

**Job:**
```typescript
// Stored in: public.jobs
{
  id: uuid,                          // PK
  customer_id: uuid,                 // FK to profiles.id
  category_id: uuid,                 // FK to categories.id
  title: string,                     // Not null
  description: text,                 // Not null
  job_type: string,                  // 'quote_based' | 'fixed_price'

  // Budget (quote-based)
  budget_min: decimal(10,2),         // Optional
  budget_max: decimal(10,2),         // Optional

  // Fixed price
  fixed_price: decimal(10,2),        // Required if fixed_price type

  estimated_duration: integer,       // Hours, optional

  // Location
  street_address: string,            // Required
  city: string,                      // Required
  state: string,                     // Required
  zip_code: string,                  // Required
  country: string,                   // Default: 'US'
  location: string,                  // "{city}, {state}"
  latitude: float,                   // Optional
  longitude: float,                  // Optional

  // Timing
  execution_date: date,              // Required
  preferred_time: string,            // 'Morning' | 'Afternoon' | 'Evening' | 'Flexible'
  start_time: time,                  // Alternative to preferred_time

  photos: text[],                    // Array of URLs
  status: JobStatus,                 // 'Open' | 'Booked' | 'Completed' | 'Expired' | 'Cancelled'
  expires_at: timestamp,             // 30 days from creation
  provider_id: uuid,                 // FK to profiles.id (when booked)

  created_at: timestamp,
  updated_at: timestamp,
}

// Relationships:
// - belongs to: profile (customer)
// - belongs to: category
// - has many: job_quotes
// - has one: booking (when accepted)
```

**Booking:**
```typescript
// Stored in: public.bookings
{
  id: uuid,                          // PK
  customer_id: uuid,                 // FK to profiles.id
  provider_id: uuid,                 // FK to profiles.id
  listing_id: uuid,                  // FK to service_listings.id (optional)
  job_id: uuid,                      // FK to jobs.id (optional)

  title: string,                     // Service/job title
  description: text,                 // Optional notes

  // Scheduling
  scheduled_date: date,              // Required
  scheduled_time: time,              // Required
  duration_minutes: integer,         // Optional
  location: string,                  // Service address

  // Pricing
  price: decimal(10,2),              // Total amount
  deposit_amount: decimal(10,2),     // If deposit option used
  balance_due: decimal(10,2),        // Remaining after deposit
  platform_fee: decimal(10,2),       // 10% of price
  provider_payout: decimal(10,2),    // 90% of price

  // Status
  status: BookingStatus,             // 'Requested' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled' | 'Disputed'
  payment_status: PaymentStatus,     // 'Pending' | 'Held' | 'Released' | 'Refunded'
  payment_intent_id: string,         // Stripe payment intent

  // Timestamps
  provider_response_deadline: timestamp, // 24 hours from creation
  accepted_at: timestamp,            // When provider accepted
  started_at: timestamp,             // When marked InProgress
  completed_at: timestamp,           // When marked Completed

  // Custom Service
  order_type: OrderType,             // 'Job' | 'Service' | 'CustomService'
  production_order_id: uuid,         // FK to production_orders
  consultation_required: boolean,    // Default: false
  escrow_amount: decimal(10,2),      // Full amount held for custom services

  // Shipping (optional)
  fulfillment_type: FulfillmentType, // 'Pickup' | 'DropOff' | 'Shipping'
  shipping_cost: decimal(10,2),      // If applicable

  created_at: timestamp,
  updated_at: timestamp,
}

// Relationships:
// - belongs to: customer (profile)
// - belongs to: provider (profile)
// - belongs to: listing (optional)
// - belongs to: job (optional)
// - has one: production_order (custom service)
// - has one: shipment
// - has many: messages
// - has one: review (from customer)
// - has one: review (from provider)
```

**Review:**
```typescript
// Stored in: public.reviews
{
  id: uuid,                    // PK
  booking_id: uuid,            // FK to bookings.id
  reviewer_id: uuid,           // FK to profiles.id
  reviewee_id: uuid,           // FK to profiles.id
  rating: integer,             // 1-5, not null
  comment: text,               // Optional
  is_provider_review: boolean, // True if reviewing provider

  // Categories (optional)
  communication_rating: integer, // 1-5
  quality_rating: integer,     // 1-5
  value_rating: integer,       // 1-5
  timeliness_rating: integer,  // 1-5

  helpful_count: integer,      // Upvotes, default: 0

  created_at: timestamp,
  updated_at: timestamp,
}

// Relationships:
// - belongs to: booking
// - belongs to: reviewer (profile)
// - belongs to: reviewee (profile)
// - has many: review_media
```

**Wallet:**
```typescript
// Stored in: public.wallets
{
  id: uuid,                       // PK
  user_id: uuid,                  // FK to profiles.id, unique
  balance: decimal(10,2),         // Current balance, default: 0, check >= 0

  // Payout settings (providers)
  auto_payout_enabled: boolean,   // Default: false
  payout_threshold: decimal(10,2),// Min balance for auto-payout
  payout_schedule: string,        // 'instant' | 'daily' | 'weekly' | 'monthly'

  created_at: timestamp,
  updated_at: timestamp,
}

// Relationships:
// - belongs to: profile (user)
// - has many: wallet_transactions
```

**Wallet Transaction:**
```typescript
// Stored in: public.wallet_transactions
{
  id: uuid,                    // PK
  wallet_id: uuid,             // FK to wallets.id
  type: string,                // 'Credit' | 'Debit'
  amount: decimal(10,2),       // Positive value
  description: text,           // Transaction description
  reference_id: uuid,          // Booking/payout ID
  reference_type: string,      // 'booking' | 'payout' | 'refund'
  status: string,              // 'Completed' | 'Pending' | 'Failed'

  created_at: timestamp,
}
```

### 9.2 Relationship Summary

**One-to-Many:**
- Profile → Listings (as provider)
- Profile → Jobs (as customer)
- Profile → Bookings (as customer)
- Profile → Bookings (as provider)
- Category → Listings
- Category → Jobs
- Listing → Bookings
- Listing → ServiceOptions (custom service)
- Listing → ValueAddedServices
- Booking → Messages

**One-to-One:**
- auth.users → Profile
- Profile → Wallet
- Booking → ProductionOrder (custom service)
- Booking → Shipment

**Many-to-Many:**
- Profile ↔ Profile (Followers, via followers table)
- Profile ↔ Listing (Favorites, via user_favorites table)

### 9.3 Key Constraints

**NOT NULL:**
- All entity IDs
- User email
- Listing/job title, description, price
- Booking customer_id, provider_id, scheduled_date
- Category name

**UNIQUE:**
- auth.users.email
- profiles.id
- categories.slug
- wallets.user_id

**CHECK:**
- price > 0 (listings, jobs)
- rating >= 1 AND rating <= 5 (reviews)
- wallet.balance >= 0
- deposit_amount >= 0

**FOREIGN KEYS:**
- All relationships enforced with FK constraints
- ON DELETE: Varies (CASCADE for some, RESTRICT for others)

---

## 10. KNOWN LIMITATIONS & INCONSISTENCIES

### 10.1 Broken or Inconsistent Flows

**Job Editing:**
- **Issue:** No edit functionality for jobs after posting
- **Impact:** Users cannot correct errors or update details
- **Workaround:** Must cancel and repost

**Listing Editing:**
- **Issue:** No edit screen for basic listing details (title, description, price)
- **Available:** Only custom service options can be edited
- **Impact:** Must recreate listing to change core details

**Draft System:**
- **Issue:** No draft saving for listings or jobs
- **Impact:** All progress lost if app closes during creation
- **Workaround:** None - must complete in single session

**Photo Management:**
- **Issue:** Cannot edit photos after listing creation
- **Issue:** Orphaned photos if listing creation fails
- **Issue:** No photo preview before upload completes
- **Impact:** Storage bloat, user confusion

**Map View Coordination:**
- **Issue:** Many listings lack lat/lng coordinates
- **Reason:** Only manual address entry, no geocoding
- **Impact:** Empty or sparse map views

**Booking ID Routing (Fixed Recently):**
- **Previous Issue:** "Book Now" navigated to `/booking/{id}` expecting existing booking
- **Impact:** "Booking not found" error for new bookings
- **Fix:** Now routes to `/book-service/{listingId}` for creation
- **Residual:** Old links may still cause issues

### 10.2 Missing UI Updates

**Real-time Updates:**
- **Partial:** Profile updates work via Supabase realtime
- **Missing:** Booking status changes not realtime for customer
- **Missing:** Message notifications not realtime
- **Impact:** Users must refresh manually

**Optimistic Updates:**
- **Issue:** No optimistic UI updates on actions
- **Example:** Toggle favorite - waits for server response
- **Impact:** Feels slow, unresponsive

**Loading States:**
- **Issue:** Some actions lack loading indicators
- **Example:** Large photo uploads show no progress
- **Impact:** User unsure if action is processing

**Error Persistence:**
- **Issue:** Errors disappear on re-render
- **Impact:** User may miss error message

**Pull-to-Refresh:**
- **Implemented:** Home feed, bookings list
- **Missing:** Notifications, messages, profile screens
- **Impact:** Inconsistent refresh behavior

### 10.3 Features That Behave Differently Across Flows

**Photo Upload:**
- **Listing Creation:** PhotoPicker with AI assist, max 5
- **Job Posting:** PhotoPicker with AI assist, max 5
- **Community Post:** MediaUpload with videos, max 5
- **Review:** ReviewMediaUpload with videos, max 10
- **Avatar:** Direct upload, single image
- **Inconsistency:** Different components, different limits, different validations

**Address Input:**
- **Job Posting:** Multi-field (street, city, state, zip)
- **Listing Creation:** Single location text field
- **Profile Edit:** Single location text field
- **Inconsistency:** Different formats, different validation

**AI Features:**
- **Available:** Listing creation, job posting
- **Unavailable:** Editing flows (edit options, profile edit)
- **Inconsistency:** Cannot improve existing content

**Category Selection:**
- **With AI:** AICategorySuggestion component (listing/job creation)
- **Manual Only:** CategoryPicker in browse/filter
- **Inconsistency:** Different UIs, different data structures

**Payment Methods:**
- **Booking:** Stripe or Wallet
- **Subscription:** Stripe only
- **Tipping:** Wallet only
- **Inconsistency:** Different methods for different flows

### 10.4 Areas with Unclear or Unstable Behavior

**Inventory Locking:**
- **Soft Lock:** 15-minute expiration
- **Unclear:** What happens if multiple users have soft locks?
- **Unclear:** Hard lock conversion timing
- **Edge Case:** Expired soft lock, booking still pending

**Escrow Release:**
- **Standard Timing:** On booking completion
- **Custom Service:** After customer confirms delivery
- **Unclear:** Timeout behavior if customer doesn't confirm
- **Observed:** 48-hour auto-release mentioned but not verified

**Provider Response Deadline:**
- **Deadline:** 24 hours from booking creation
- **Unclear:** What happens if deadline passes?
- **Unclear:** Automatic cancellation or just notification?
- **No visible enforcement in code**

**Subscription Features:**
- **Plans:** Free, Pro, Premium, Elite
- **Unclear:** What features each plan unlocks
- **Unclear:** Enforcement mechanism
- **No visible gating in app code**

**Verification Requirements:**
- **ID Verification:** When required?
- **Phone Verification:** When enforced?
- **Background Check:** Which categories?
- **Unclear:** Exact triggers and blockers

**AI Response Quality:**
- **Inconsistent:** Photo generation quality varies
- **Unpredictable:** Title/description improvements sometimes worse
- **Unclear:** How to provide feedback to improve
- **No user rating of AI suggestions**

**Geolocation:**
- **Profile Location:** Manual text entry
- **Listing Location:** Manual text entry
- **Job Location:** Structured address
- **Unclear:** Why different formats?
- **Inconsistent:** Some have lat/lng, others don't

**Review Moderation:**
- **Flagging:** Users can report reviews
- **Unclear:** What happens after report?
- **Unclear:** Admin review process
- **No visible moderation flow**

### 10.5 Platform-Specific Issues

**Web:**
- Simulated map (not real Mapbox)
- Some native modules unavailable (Camera, Notifications)
- Different UI components (ActionSheet → Alert)
- Performance: Slower with many markers on map

**iOS:**
- ActionSheet UI for photo source selection
- Apple Pay available (Stripe)
- Smoother animations
- Better gesture handling

**Android:**
- Alert UI for photo source selection
- Google Pay available (Stripe)
- Occasional keyboard covering inputs
- Performance varies by device

### 10.6 Data Integrity Concerns

**Photo URLs:**
- Stored as text[] or JSON string inconsistently
- Parsing required on read
- May contain invalid/broken URLs
- No orphan file cleanup

**Timestamps:**
- Some use `timestamp with time zone`
- Others use `timestamp without time zone`
- Inconsistent timezone handling
- User's timezone not always considered

**Pricing:**
- Stored as decimal(10,2)
- Display formatting inconsistent
- Currency assumed USD (no multi-currency)
- No currency symbol storage

**Location Data:**
- latitude/longitude optional
- Many records missing coordinates
- No validation of coordinate accuracy
- Address text may not match coordinates

**User Type:**
- Can change at any time (Customer → Provider → Hybrid)
- No verification when changing to Provider
- Historical bookings retain old context
- No type change audit trail

### 10.7 Performance Bottlenecks

**Large Lists:**
- Home feed: No virtualization
- All items rendered at once
- Slow with 100+ listings
- Pagination helps but doesn't solve

**Map View:**
- Web implementation slow with >100 markers
- No marker virtualization
- Recalculates on every pan/zoom

**Image Loading:**
- No progressive loading
- No image compression on display
- Multiple full-res images cause lag
- No CDN (direct Supabase URLs)

**Search:**
- No debounce on some inputs
- Full re-fetch on every keystroke
- No search result caching

**AI Generation:**
- Photo generation: 10-30 seconds
- No progress indicator beyond spinner
- Blocks UI during generation
- No background processing

### 10.8 Accessibility Gaps

**Screen Reader:**
- Many buttons lack labels
- Images lack alt text
- Complex gestures (drag) not accessible

**Keyboard Navigation:**
- Tab order not defined
- Some buttons not focusable
- No keyboard shortcuts

**Color Contrast:**
- Some text fails WCAG AA
- Placeholder text too light
- Disabled states unclear

**Touch Targets:**
- Some buttons < 44pt minimum
- Marker hitboxes recently improved but still small

**Font Scaling:**
- Fixed font sizes (doesn't respect system settings)
- Layout may break at large text sizes

---

## DOCUMENT END

**Status:** Complete
**Last Updated:** January 6, 2026
**Pages:** 86
**Word Count:** ~35,000

This document represents the current implementation of the Dollarsmiley App as observed in the codebase. All behaviors described are as-is, not as intended. This serves as the authoritative baseline for gap analysis, test case creation, and regression testing.
