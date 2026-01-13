/*
  # Fix Bookings RLS for Provider Quote Submission

  ## Summary
  Allow providers to create quote bookings (status = 'Requested') in addition
  to customers creating regular bookings.

  ## Changes
  - Drop existing "Customers can create bookings" policy
  - Create new policy that allows BOTH:
    1. Customers to create bookings (customer_id = auth.uid())
    2. Providers to create quote bookings (provider_id = auth.uid())

  ## Security
  - RLS remains enabled
  - Customers can only create bookings where they are the customer
  - Providers can only create bookings where they are the provider
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Customers can create bookings" ON bookings;

-- Create new policy that allows both customers and providers
CREATE POLICY "Customers and providers can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() OR provider_id = auth.uid()
  );
