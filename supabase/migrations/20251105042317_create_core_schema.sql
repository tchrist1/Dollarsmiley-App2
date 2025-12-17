/*
  # Dollarsmiley Core Database Schema

  ## Overview
  Complete database schema for the Dollarsmiley marketplace platform connecting customers with service providers.

  ## New Tables Created

  ### 1. profiles
  - `id` (uuid, references auth.users) - User ID
  - `user_type` (text) - Customer, Provider, or Both
  - `email` (text) - User email
  - `full_name` (text) - Display name or business name
  - `phone` (text) - Phone number
  - `phone_verified` (boolean) - Phone verification status
  - `avatar_url` (text) - Profile photo URL
  - `bio` (text) - Short bio or description
  - `location` (text) - City/area
  - `latitude` (numeric) - GPS latitude
  - `longitude` (numeric) - GPS longitude
  - `service_radius` (integer) - Service area in miles
  - `subscription_plan` (text) - Free, Pro, Premium, Elite
  - `subscription_expires_at` (timestamptz) - Plan expiration date
  - `id_verified` (boolean) - ID verification status
  - `business_verified` (boolean) - Business verification status
  - `payout_connected` (boolean) - Payout account linked
  - `rating_average` (numeric) - Average rating (0-5)
  - `rating_count` (integer) - Total ratings received
  - `total_bookings` (integer) - Completed bookings count
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. categories
  - `id` (uuid) - Category ID
  - `name` (text) - Category name
  - `slug` (text) - URL-friendly identifier
  - `description` (text) - Category description
  - `icon` (text) - Icon identifier
  - `parent_id` (uuid) - Parent category for sub-categories
  - `sort_order` (integer) - Display order
  - `is_active` (boolean) - Active status

  ### 3. service_listings
  - `id` (uuid) - Listing ID
  - `provider_id` (uuid) - Provider who created listing
  - `category_id` (uuid) - Category assignment
  - `title` (text) - Service title
  - `description` (text) - Detailed description
  - `base_price` (numeric) - Starting price
  - `pricing_type` (text) - Fixed, Hourly, Custom
  - `photos` (jsonb) - Array of photo URLs
  - `tags` (text[]) - Searchable tags
  - `location` (text) - Service location
  - `latitude` (numeric) - GPS latitude
  - `longitude` (numeric) - GPS longitude
  - `estimated_duration` (integer) - Minutes
  - `status` (text) - Draft, Active, Paused, Archived
  - `view_count` (integer) - Total views
  - `save_count` (integer) - Times saved/favorited
  - `booking_count` (integer) - Total bookings
  - `is_featured` (boolean) - Featured placement
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update

  ### 4. jobs
  - `id` (uuid) - Job ID
  - `customer_id` (uuid) - Job poster
  - `category_id` (uuid) - Category
  - `title` (text) - Job title
  - `description` (text) - Job details
  - `budget_min` (numeric) - Minimum budget
  - `budget_max` (numeric) - Maximum budget
  - `location` (text) - Job location
  - `latitude` (numeric) - GPS latitude
  - `longitude` (numeric) - GPS longitude
  - `execution_date_start` (date) - Start date
  - `execution_date_end` (date) - End date (for multi-day jobs)
  - `preferred_time` (text) - Morning, Afternoon, Evening
  - `photos` (jsonb) - Attached photos
  - `status` (text) - Open, Booked, Completed, Expired
  - `expires_at` (timestamptz) - Auto-expiration timestamp
  - `provider_id` (uuid) - Assigned provider (when booked)
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. bookings
  - `id` (uuid) - Booking ID
  - `customer_id` (uuid) - Customer
  - `provider_id` (uuid) - Service provider
  - `listing_id` (uuid) - Service listing (optional)
  - `job_id` (uuid) - Related job (optional)
  - `title` (text) - Booking title
  - `description` (text) - Booking details
  - `scheduled_date` (date) - Service date
  - `scheduled_time` (text) - Time slot
  - `location` (text) - Service location
  - `price` (numeric) - Agreed price
  - `status` (text) - Requested, Accepted, InProgress, Completed, Cancelled, Disputed
  - `payment_status` (text) - Pending, Held, Released, Refunded
  - `payment_intent_id` (text) - Payment gateway reference
  - `platform_fee` (numeric) - Dollarsmiley fee (10%)
  - `provider_payout` (numeric) - Provider earnings (90%)
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_at` (timestamptz) - Booking creation

  ### 6. reviews
  - `id` (uuid) - Review ID
  - `booking_id` (uuid) - Related booking
  - `reviewer_id` (uuid) - Who wrote review
  - `reviewee_id` (uuid) - Who received review
  - `rating` (integer) - 1-5 stars
  - `comment` (text) - Written review
  - `is_provider_review` (boolean) - True if provider reviewing customer
  - `created_at` (timestamptz) - Review timestamp

  ### 7. messages
  - `id` (uuid) - Message ID
  - `booking_id` (uuid) - Related booking thread
  - `sender_id` (uuid) - Message sender
  - `recipient_id` (uuid) - Message recipient
  - `content` (text) - Message text
  - `attachments` (jsonb) - File attachments
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Send timestamp

  ### 8. user_favorites
  - `user_id` (uuid) - User who saved
  - `listing_id` (uuid) - Saved listing
  - `created_at` (timestamptz) - Save timestamp

  ### 9. verification_documents
  - `id` (uuid) - Document ID
  - `user_id` (uuid) - User submitting document
  - `document_type` (text) - ID, Business, Address
  - `document_url` (text) - Secure storage URL
  - `status` (text) - Pending, Approved, Rejected
  - `verified_at` (timestamptz) - Verification timestamp
  - `created_at` (timestamptz) - Upload timestamp

  ### 10. wallet_transactions
  - `id` (uuid) - Transaction ID
  - `user_id` (uuid) - Wallet owner
  - `booking_id` (uuid) - Related booking
  - `type` (text) - Earning, Payout, Refund, Fee
  - `amount` (numeric) - Transaction amount
  - `status` (text) - Pending, Completed, Failed
  - `description` (text) - Transaction description
  - `created_at` (timestamptz) - Transaction timestamp

  ## Security
  - Enable RLS on all tables
  - Policies enforce user access based on authentication and ownership
  - Verified providers have additional permissions
  - Admin access controlled separately
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('Customer', 'Provider', 'Both')) DEFAULT 'Customer',
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  phone_verified boolean DEFAULT false,
  avatar_url text,
  bio text,
  location text,
  latitude numeric,
  longitude numeric,
  service_radius integer DEFAULT 25,
  subscription_plan text DEFAULT 'Free' CHECK (subscription_plan IN ('Free', 'Pro', 'Premium', 'Elite')),
  subscription_expires_at timestamptz,
  id_verified boolean DEFAULT false,
  business_verified boolean DEFAULT false,
  payout_connected boolean DEFAULT false,
  rating_average numeric DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
  rating_count integer DEFAULT 0,
  total_bookings integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create service_listings table
CREATE TABLE IF NOT EXISTS service_listings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  base_price numeric NOT NULL CHECK (base_price >= 0),
  pricing_type text DEFAULT 'Fixed' CHECK (pricing_type IN ('Fixed', 'Hourly', 'Custom')),
  photos jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  location text,
  latitude numeric,
  longitude numeric,
  estimated_duration integer,
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Paused', 'Archived')),
  view_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  booking_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  budget_min numeric CHECK (budget_min >= 0),
  budget_max numeric CHECK (budget_max >= budget_min),
  location text NOT NULL,
  latitude numeric,
  longitude numeric,
  execution_date_start date NOT NULL,
  execution_date_end date,
  preferred_time text CHECK (preferred_time IN ('Morning', 'Afternoon', 'Evening', 'Flexible')),
  photos jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'Open' CHECK (status IN ('Open', 'Booked', 'Completed', 'Expired', 'Cancelled')),
  expires_at timestamptz,
  provider_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  scheduled_time text,
  location text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  status text DEFAULT 'Requested' CHECK (status IN ('Requested', 'Accepted', 'InProgress', 'Completed', 'Cancelled', 'Disputed')),
  payment_status text DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Held', 'Released', 'Refunded')),
  payment_intent_id text,
  platform_fee numeric DEFAULT 0,
  provider_payout numeric DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_provider_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- Create verification_documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('ID', 'Business', 'Address')),
  document_url text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('Earning', 'Payout', 'Refund', 'Fee', 'Subscription')),
  amount numeric NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_listings_provider ON service_listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON service_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON service_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_location ON service_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_execution_date ON jobs(execution_date_start);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, is_read);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Categories policies (public read)
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service listings policies
CREATE POLICY "Anyone can view active listings"
  ON service_listings FOR SELECT
  TO authenticated
  USING (status = 'Active');

CREATE POLICY "Providers can manage own listings"
  ON service_listings FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Jobs policies
CREATE POLICY "Anyone can view open jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (status IN ('Open', 'Booked'));

CREATE POLICY "Customers can manage own jobs"
  ON jobs FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Bookings policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Customers can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Participants can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() OR provider_id = auth.uid());

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for own bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.provider_id = auth.uid())
      AND bookings.status = 'Completed'
    )
  );

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- User favorites policies
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own favorites"
  ON user_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verification documents policies
CREATE POLICY "Users can view own documents"
  ON verification_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can submit documents"
  ON verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Wallet transactions policies
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON service_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();