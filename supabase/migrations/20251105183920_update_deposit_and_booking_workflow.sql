/*
  # Update Deposit Default and Booking Workflow

  ## Changes Made

  1. **Deposit Default Changed to 50%**
    - Updated `deposit_settings` table default for `deposit_percentage` from 0.25 (25%) to 0.50 (50%)
    - Updated existing records to use 50% deposit

  2. **Provider Response Deadline Field**
    - Added `provider_response_deadline` to bookings table
    - Defaults to 24 hours from booking request time
    - Used to track when provider must respond to booking request

  3. **Booking Status Workflow Enhancement**
    - Added "PendingApproval" status to bookings
    - Updated status check constraint to include new status
    - New workflow: Requested → PendingApproval → Accepted → InProgress → Completed

  4. **Updated Indexes**
    - Added index on provider_response_deadline for efficient deadline queries

  ## Security
  - All changes maintain existing RLS policies
  - No new security vulnerabilities introduced
*/

-- Change default deposit percentage from 25% to 50%
DO $$
BEGIN
  -- Update the default constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deposit_settings' AND column_name = 'deposit_percentage'
  ) THEN
    ALTER TABLE deposit_settings 
      ALTER COLUMN deposit_percentage SET DEFAULT 0.50;
    
    -- Update existing records that have 25% to 50%
    UPDATE deposit_settings 
    SET deposit_percentage = 0.50, updated_at = now()
    WHERE deposit_percentage = 0.25 AND deposit_type = 'Percentage';
  END IF;
END $$;

-- Add provider_response_deadline field to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'provider_response_deadline'
  ) THEN
    ALTER TABLE bookings 
      ADD COLUMN provider_response_deadline timestamptz DEFAULT now() + interval '24 hours';
  END IF;
END $$;

-- Update booking status to include PendingApproval
DO $$
BEGIN
  -- Drop the old constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'bookings' AND column_name = 'status'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  END IF;
  
  -- Add new constraint with PendingApproval status
  ALTER TABLE bookings 
    ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('Requested', 'PendingApproval', 'Accepted', 'InProgress', 'Completed', 'Cancelled', 'Disputed'));
END $$;

-- Add index on provider_response_deadline for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_response_deadline 
ON bookings(provider_response_deadline) 
WHERE status IN ('Requested', 'PendingApproval');

-- Add comment explaining the workflow
COMMENT ON COLUMN bookings.provider_response_deadline IS 
'Deadline for provider to respond to booking request. After this time, booking may be auto-cancelled or reassigned.';

COMMENT ON COLUMN bookings.status IS 
'Booking status workflow: Requested (initial) → PendingApproval (payment received, awaiting provider) → Accepted (provider approved) → InProgress (service started) → Completed (service finished). Can be Cancelled or Disputed at any point.';