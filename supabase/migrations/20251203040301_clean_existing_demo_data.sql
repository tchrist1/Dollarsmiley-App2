/*
  # Clean All Existing Demo Data
  
  Removes all existing demo data from the database to prepare for
  new comprehensive demo dataset generation
*/

-- Delete all dependent data first
DELETE FROM reviews;
DELETE FROM bookings;
DELETE FROM messages;
DELETE FROM wallet_transactions WHERE booking_id IS NOT NULL;
DELETE FROM user_favorites;
DELETE FROM user_item_interactions WHERE item_type = 'listing' OR item_type = 'job';

-- Delete all service listings
DELETE FROM service_listings;

-- Delete all jobs
DELETE FROM jobs;

-- Delete all job acceptances
DELETE FROM job_acceptances;

-- Delete provider profiles (keep customer and admin profiles)
DELETE FROM profiles WHERE user_type = 'Provider' OR user_type = 'Hybrid';
DELETE FROM wallets WHERE user_id NOT IN (SELECT id FROM profiles);
