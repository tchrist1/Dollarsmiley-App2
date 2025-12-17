import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateAdminPassword() {
  try {
    console.log('Updating password for admin@dollarsmiley.com...');

    const { data, error } = await supabase.auth.admin.updateUserById(
      'e7a81243-410e-4f75-adca-12a8700de67d',
      { password: 'Above123' }
    );

    if (error) {
      console.error('Error updating password:', error.message);
      process.exit(1);
    }

    console.log('Password updated successfully!');
    console.log('User can now login with:');
    console.log('  Email: admin@dollarsmiley.com');
    console.log('  Password: Above123');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAdminPassword();
