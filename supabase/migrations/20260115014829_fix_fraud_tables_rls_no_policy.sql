/*
  # Fix Fraud Tables - RLS Enabled No Policy
  
  ## Overview
  This migration addresses Security Advisor SUGGESTIONS for 8 fraud detection tables
  that have RLS enabled but no explicit policies. These tables are server/admin-only
  and should NOT be accessible from client applications.
  
  ## Affected Tables
  1. fraud_alerts - Fraud detection alerts and investigations
  2. fraud_behavioral_patterns - User behavioral analysis
  3. fraud_blacklists - Blacklisted emails, phones, IPs, etc.
  4. fraud_device_fingerprints - Device fingerprinting data
  5. fraud_investigation_notes - Internal investigation notes
  6. fraud_rules - Fraud detection rule engine
  7. fraud_user_profiles - User fraud risk profiles
  8. fraud_velocity_checks - Rate limiting and velocity tracking
  
  ## Implementation: OPTION B - Explicit Deny Policies
  
  We chose Option B over Option A (moving to private schema) because:
  - Simpler migration without schema refactoring
  - Explicit denial is self-documenting
  - Easier to audit and understand intent
  - No need to update function references
  
  ## Changes Made
  1. Revoke unnecessary SELECT/INSERT/UPDATE/DELETE grants from anon/authenticated
  2. Add explicit RESTRICTIVE policies that deny all client access
  3. Document tables as server-only with comments
  4. service_role retains full access (bypasses RLS as designed)
  
  ## Security Impact
  - No change in actual access (tables were already locked by RLS with no policies)
  - Makes security intent explicit and auditable
  - Removes unnecessary grants that could be confusing
  - Resolves 8 Security Advisor suggestions
*/

-- ============================================================================
-- STEP 1: REVOKE UNNECESSARY GRANTS FROM CLIENT ROLES
-- ============================================================================

-- Revoke all privileges from anon and authenticated roles
REVOKE ALL ON fraud_alerts FROM anon, authenticated;
REVOKE ALL ON fraud_behavioral_patterns FROM anon, authenticated;
REVOKE ALL ON fraud_blacklists FROM anon, authenticated;
REVOKE ALL ON fraud_device_fingerprints FROM anon, authenticated;
REVOKE ALL ON fraud_investigation_notes FROM anon, authenticated;
REVOKE ALL ON fraud_rules FROM anon, authenticated;
REVOKE ALL ON fraud_user_profiles FROM anon, authenticated;
REVOKE ALL ON fraud_velocity_checks FROM anon, authenticated;

-- ============================================================================
-- STEP 2: ADD EXPLICIT RESTRICTIVE POLICIES (DENY ALL)
-- ============================================================================

-- These RESTRICTIVE policies explicitly deny all access to anon/authenticated
-- service_role bypasses RLS and retains full access

-- fraud_alerts
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_alerts
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_behavioral_patterns
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_behavioral_patterns
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_blacklists
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_blacklists
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_device_fingerprints
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_device_fingerprints
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_investigation_notes
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_investigation_notes
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_rules
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_rules
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_user_profiles
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_user_profiles
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- fraud_velocity_checks
CREATE POLICY "Server-only: Deny all client access"
  ON fraud_velocity_checks
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ============================================================================
-- STEP 3: ADD DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE fraud_alerts IS 
  'Server/Admin-only: Fraud detection alerts and investigations. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_behavioral_patterns IS 
  'Server/Admin-only: User behavioral analysis for fraud detection. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_blacklists IS 
  'Server/Admin-only: Blacklisted entities (email, phone, IP, device, card, address). Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_device_fingerprints IS 
  'Server/Admin-only: Device fingerprinting data for fraud detection. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_investigation_notes IS 
  'Server/Admin-only: Internal investigation notes for fraud cases. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_rules IS 
  'Server/Admin-only: Fraud detection rule engine configuration. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_user_profiles IS 
  'Server/Admin-only: User fraud risk profiles and trust scores. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

COMMENT ON TABLE fraud_velocity_checks IS 
  'Server/Admin-only: Rate limiting and velocity tracking for fraud detection. Access restricted to service_role. Client access explicitly denied via RESTRICTIVE policy.';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- After migration, verify:
-- 1. All 8 tables have RLS enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename LIKE 'fraud_%';

-- 2. All 8 tables have exactly 1 RESTRICTIVE policy
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename LIKE 'fraud_%'
-- GROUP BY tablename;

-- 3. No grants to anon/authenticated
-- SELECT table_name, grantee, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public'
-- AND table_name LIKE 'fraud_%'
-- AND grantee IN ('anon', 'authenticated');
