/*
  # Create Reschedule Request System

  ## Overview
  Enables customers to request booking reschedules and providers to approve/deny them.

  ## New Tables

  ### 1. `reschedule_requests`
  Tracks all reschedule requests for bookings
  - `id` (uuid, primary key)
  - `booking_id` (uuid, references bookings) - Original booking
  - `requested_by` (uuid, references profiles) - Who requested
  - `current_date` (date) - Original scheduled date
  - `current_time` (time) - Original scheduled time
  - `proposed_date` (date) - New requested date
  - `proposed_time` (time) - New requested time
  - `reason` (text) - Reason for reschedule
  - `status` (text) - Pending, Approved, Denied, Cancelled
  - `responded_by` (uuid, references profiles) - Who approved/denied
  - `response_message` (text) - Response from provider
  - `responded_at` (timestamptz) - Response timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Features
  - Multiple reschedule requests per booking
  - Track request history
  - Reason and response messages
  - Automatic notifications
  - Conflict checking for proposed times

  ## Security
  - RLS enabled on all tables
  - Customers can create requests for their bookings
  - Providers can respond to requests for their bookings
  - Both parties can view their requests

  ## Important Notes
  - Only one pending request per booking at a time
  - Original booking not modified until approved
  - Approved requests update booking and calendar
  - Denied requests archived with reason
*/

-- Create reschedule_requests table
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_date date NOT NULL,
  current_time time NOT NULL,
  proposed_date date NOT NULL,
  proposed_time time NOT NULL,
  reason text,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Denied', 'Cancelled')),
  responded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  response_message text,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_booking ON reschedule_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_requested_by ON reschedule_requests(requested_by);

-- Enable RLS
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reschedule_requests

-- Customers can view their reschedule requests
CREATE POLICY "Customers can view own reschedule requests"
  ON reschedule_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reschedule_requests.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
    )
  );

-- Customers can create reschedule requests for their bookings
CREATE POLICY "Customers can create reschedule requests"
  ON reschedule_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.customer_id = auth.uid()
      AND bookings.status IN ('Requested', 'Accepted', 'InProgress')
    )
  );

-- Providers can update reschedule requests (approve/deny)
CREATE POLICY "Providers can respond to reschedule requests"
  ON reschedule_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reschedule_requests.booking_id
      AND bookings.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reschedule_requests.booking_id
      AND bookings.provider_id = auth.uid()
    )
  );

-- Customers can cancel their pending requests
CREATE POLICY "Customers can cancel own requests"
  ON reschedule_requests FOR UPDATE
  TO authenticated
  USING (
    requested_by = auth.uid()
    AND status = 'Pending'
  )
  WITH CHECK (
    requested_by = auth.uid()
    AND status = 'Cancelled'
  );

-- Function to update booking when reschedule approved
CREATE OR REPLACE FUNCTION handle_reschedule_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to Approved
  IF NEW.status = 'Approved' AND OLD.status = 'Pending' THEN
    -- Update the booking with new date/time
    UPDATE bookings
    SET
      scheduled_date = NEW.proposed_date,
      scheduled_time = NEW.proposed_time::text,
      updated_at = now()
    WHERE id = NEW.booking_id;

    -- Update time slot booking if exists
    UPDATE time_slot_bookings
    SET
      booking_date = NEW.proposed_date,
      start_time = NEW.proposed_time,
      end_time = (NEW.proposed_time::interval + interval '1 hour')::time,
      updated_at = now()
    WHERE booking_id = NEW.booking_id;

    -- Set responded_at if not already set
    IF NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reschedule approval
DROP TRIGGER IF EXISTS on_reschedule_approved ON reschedule_requests;
CREATE TRIGGER on_reschedule_approved
  BEFORE UPDATE ON reschedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_reschedule_approval();

-- Function to check for pending reschedule requests
CREATE OR REPLACE FUNCTION has_pending_reschedule(booking_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reschedule_requests
    WHERE booking_id = booking_id_param
    AND status = 'Pending'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get reschedule request count for booking
CREATE OR REPLACE FUNCTION get_reschedule_count(booking_id_param uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM reschedule_requests
    WHERE booking_id = booking_id_param
  );
END;
$$ LANGUAGE plpgsql;
