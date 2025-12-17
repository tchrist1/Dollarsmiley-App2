/*
  # Enhance Provider Profiles

  This migration updates provider profiles with complete information
  to display properly throughout the app.
*/

-- Update provider profiles with complete information
UPDATE profiles 
SET 
  bio = 'Professional event services provider with 10+ years of experience. Specializing in creating unforgettable moments for weddings, corporate events, and special celebrations. Licensed, insured, and passionate about delivering excellence.',
  location = 'Los Angeles, CA',
  latitude = 34.0522,
  longitude = -118.2437,
  rating_average = 4.85,
  rating_count = 856,
  total_bookings = 342
WHERE id = 'd48b3ae5-1556-49c1-a9ec-608d7dcda93f';

UPDATE profiles 
SET 
  bio = 'Experienced event professional dedicated to bringing your vision to life. From intimate gatherings to large-scale productions, I provide creative solutions and exceptional service. Let''s make your next event extraordinary!',
  location = 'Miami, FL',
  latitude = 25.7617,
  longitude = -80.1918,
  rating_average = 4.82,
  rating_count = 724,
  total_bookings = 289
WHERE id = '30e7fc07-ae15-460a-a51c-738e0aba580e';
