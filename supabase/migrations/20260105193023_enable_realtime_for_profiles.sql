/*
  # Enable Realtime for Profiles Table

  ## Summary
  This migration enables Supabase Realtime for the profiles table to support
  real-time profile updates across the application.

  ## Changes
  1. Enable Realtime for profiles table
     - Adds profiles table to the supabase_realtime publication
     - Allows real-time subscriptions to profile changes
     - Ensures instant profile updates across all user sessions

  ## Purpose
  - Enable real-time profile synchronization
  - Support instant UI updates when profile data changes
  - Allow multi-device profile consistency

  ## Notes
  - All authenticated users can subscribe to their own profile changes
  - RLS policies ensure users only receive their own profile updates
  - No additional security configuration needed
*/

-- Enable realtime for profiles table
alter publication supabase_realtime add table profiles;
