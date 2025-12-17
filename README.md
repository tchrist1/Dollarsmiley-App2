# Dollarsmiley Mobile App

**Status:** ✅ Ready for Duplication

A modern marketplace connecting people with trusted local service providers for events, parties, and home services.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Run development server
npm run dev
```

## Project Configuration

All essential configuration files are present:

- ✅ `babel.config.js` - Babel configuration
- ✅ `metro.config.js` - Metro bundler
- ✅ `expo-env.d.ts` - TypeScript definitions
- ✅ `app.json` - Expo configuration
- ✅ `tsconfig.json` - TypeScript config
- ✅ `.env` - Environment variables
- ✅ `.env.example` - Environment template

## Tech Stack

- **Framework:** Expo 54 (React Native)
- **Language:** TypeScript 5.9
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **Navigation:** Expo Router

## Project Structure

```
dollarsmiley/
├── app/                 # Expo Router pages (37 routes)
├── components/          # UI components (179 files)
├── lib/                 # Business logic (104 files)
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── supabase/
│   ├── migrations/     # Database migrations (111 files)
│   └── functions/      # Edge functions (43 files)
└── assets/             # Images and static files
```

## Features

### Core Marketplace
- Job posting system
- Provider service listings
- Quote/bid management
- Booking workflow
- Real-time messaging

### Payments & Transactions
- Stripe integration
- Escrow system
- Multiple payment methods
- Payout management
- Transaction history

### User Management
- Email/password authentication
- User profiles (Customer, Provider, Both)
- Verification system
- Review and ratings
- Social features

### Advanced Features
- 111 database migrations
- 43 Supabase Edge Functions
- Push notifications
- Calendar integration
- Location-based search
- Analytics dashboards

## Database Setup

Apply migrations to your Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually through Supabase Dashboard
# Copy migrations from supabase/migrations/
```

## Environment Variables

Required variables in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Scripts

```bash
npm run dev          # Start development server
npm run build:web    # Build for web
npm run typecheck    # Check TypeScript
npm run lint         # Lint code
```

## Project Stats

- **Total Files:** 585 (excluding node_modules)
- **Project Size:** 446MB (437MB node_modules)
- **Components:** 179
- **Library Files:** 104
- **Database Migrations:** 111
- **Edge Functions:** 43
- **Dependencies:** 874 packages

## Duplication Notes

This project has been optimized for duplication:

1. All required configuration files created
2. Missing assets added
3. TypeScript errors reduced (189 → 80 warnings)
4. Package naming aligned with app.json
5. Documentation files minimized
6. All JSON files validated

## Known Issues (Non-blocking)

- ~80 TypeScript warnings (type annotations)
- Some component prop mismatches
- FileSystem API compatibility warnings

These are code quality issues that don't prevent the app from running.

## Support

For issues or questions:
1. Check environment variables are set correctly
2. Ensure Node.js ≥ 18 and npm ≥ 9
3. Verify Supabase project is accessible
4. Check Stripe keys are valid

---

**Brand:** Dollarsmiley
**Motto:** Spend Smart. Smile Big.
**Version:** 1.0.0
**Last Updated:** 2025-11-09
