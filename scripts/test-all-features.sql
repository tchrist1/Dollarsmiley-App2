-- DollarSmiley Complete Feature Test Suite
-- This script tests all major features and functions

\echo '=== STARTING COMPREHENSIVE FEATURE TEST ==='
\echo ''

-- Test 1: Core Tables Exist
\echo 'Test 1: Checking core tables...'
SELECT
  COUNT(*) as table_count,
  string_agg(tablename, ', ' ORDER BY tablename) FILTER (WHERE tablename IN (
    'profiles', 'categories', 'service_listings', 'bookings', 'reviews',
    'messages', 'notifications', 'transactions'
  )) as core_tables
FROM pg_tables
WHERE schemaname = 'public';

-- Test 2: Regional System
\echo 'Test 2: Testing Regional Federation...'
SELECT
  COUNT(*) as region_count,
  string_agg(region_name, ', ') as regions
FROM regions WHERE is_active = true;

SELECT
  COUNT(*) as currency_count,
  string_agg(currency_code, ', ') as currencies
FROM currencies WHERE is_active = true;

-- Test 3: Currency Conversion
\echo 'Test 3: Testing Currency Conversion...'
SELECT convert_currency(100.00, 'USD', 'EUR') as usd_to_eur;
SELECT convert_currency(100.00, 'USD', 'GBP') as usd_to_gbp;
SELECT convert_currency(100.00, 'USD', 'CAD') as usd_to_cad;

-- Test 4: Trust Score Functions
\echo 'Test 4: Testing Trust Score System...'
SELECT * FROM trust_tiers ORDER BY tier_level;

-- Test 5: AI Agent System
\echo 'Test 5: Testing AI Agent Network...'
SELECT
  agent_type,
  agent_name,
  ai_provider,
  model_name,
  is_active
FROM ai_agents
WHERE is_active = true
ORDER BY agent_type;

-- Test 6: Feed Sections
\echo 'Test 6: Testing Discover Feed System...'
SELECT
  section_key,
  section_name,
  section_type,
  display_order
FROM feed_sections
WHERE is_active = true
ORDER BY display_order;

-- Test 7: Ad Placements
\echo 'Test 7: Testing Boost & Ads System...'
SELECT
  placement_key,
  placement_name,
  placement_type,
  page_location
FROM ad_placements
WHERE is_active = true
ORDER BY placement_key;

-- Test 8: Performance Views
\echo 'Test 8: Testing Performance Optimization...'
SELECT COUNT(*) as popular_listings FROM mv_popular_listings;
SELECT COUNT(*) as provider_stats FROM mv_provider_stats;
SELECT COUNT(*) as category_performance FROM mv_category_performance;

-- Test 9: Video Consultation
\echo 'Test 9: Testing Video Consultation System...'
SELECT COUNT(*) as consultation_sessions FROM consultation_sessions;

-- Test 10: Safety Features
\echo 'Test 10: Testing Crisis/Safe Mode System...'
SELECT COUNT(*) as emergency_contacts FROM emergency_contacts;
SELECT COUNT(*) as safety_checkins FROM safety_checkins;
SELECT COUNT(*) as crisis_sessions FROM crisis_mode_sessions;

-- Test 11: Custom Products
\echo 'Test 11: Testing Custom Products Pipeline...'
SELECT COUNT(*) as custom_quotes FROM custom_service_quotes;
SELECT COUNT(*) as production_orders FROM production_orders;

-- Test 12: Delivery System
\echo 'Test 12: Testing Delivery Excellence...'
SELECT COUNT(*) as shipments FROM shipments;
SELECT COUNT(*) as delivery_zones FROM delivery_zones;

-- Test 13: GDPR Compliance
\echo 'Test 13: Testing GDPR Compliance...'
SELECT COUNT(*) as data_export_requests FROM data_export_requests;
SELECT COUNT(*) as consent_records FROM consent_records;
SELECT COUNT(*) as privacy_notices FROM privacy_notices;

-- Test 14: Error Tracking
\echo 'Test 14: Testing Error Tracking...'
SELECT COUNT(*) as error_groups FROM error_groups;
SELECT COUNT(*) as error_logs FROM error_logs;

-- Test 15: Gamification
\echo 'Test 15: Testing Gamification System...'
SELECT COUNT(*) as achievements FROM achievements;
SELECT COUNT(*) as badges FROM badges;

-- Test 16: Translations
\echo 'Test 16: Testing Multi-Language Support...'
SELECT get_translation('welcome', 'en') as welcome_en;

-- Test 17: Regional Pricing
\echo 'Test 17: Testing Regional Pricing...'
SELECT COUNT(*) as regional_pricing_rules FROM regional_pricing;

-- Test 18: Payment Methods
\echo 'Test 18: Testing Regional Payment Methods...'
SELECT
  r.region_name,
  COUNT(rpm.id) as payment_methods
FROM regions r
LEFT JOIN regional_payment_methods rpm ON rpm.region_id = r.id AND rpm.is_active = true
WHERE r.is_active = true
GROUP BY r.region_name;

-- Test 19: Feature Flags
\echo 'Test 19: Testing Feature Flags...'
SELECT COUNT(*) as feature_flags FROM feature_flags;

-- Test 20: Subscriptions
\echo 'Test 20: Testing Subscription System...'
SELECT COUNT(*) as subscription_tiers FROM subscription_tiers;

\echo ''
\echo '=== ALL TESTS COMPLETED ==='
\echo ''

-- Summary Stats
\echo 'Database Summary:'
SELECT
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views,
  (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') as total_materialized_views,
  (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace) as total_functions;
