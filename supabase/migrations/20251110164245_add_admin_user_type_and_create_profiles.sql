/*
  # Add Admin User Type and Create Missing Profiles
  
  1. Changes
    - Add 'Admin' to allowed user_type values
    - Create automatic profile creation trigger
    - Backfill existing users without profiles
    - Set admin privileges for admin email
    
  2. Security
    - Function runs with SECURITY DEFINER
    - Trigger automatically creates profiles for new users
*/

-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Add new constraint with Admin type
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
  CHECK (user_type = ANY (ARRAY['Customer'::text, 'Provider'::text, 'Both'::text, 'Admin'::text]));

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'Customer',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users without profiles
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  user_type,
  is_verified,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  'Customer',
  false,
  au.created_at,
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Update admin user to have admin privileges
UPDATE public.profiles
SET 
  user_type = 'Admin',
  is_verified = true,
  full_name = 'Admin User',
  updated_at = now()
WHERE email = 'admin@dollarsmiley.com';
