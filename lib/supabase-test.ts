import { supabase } from './supabase';

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');

  try {
    // Try a simple query
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection test failed:', error);
      return {
        success: false,
        error: error.message,
        details: error,
      };
    }

    console.log('✅ Supabase connection test successful');
    console.log('   Retrieved data:', data);
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('❌ Supabase connection test exception:');
    console.error('   Type:', error?.constructor?.name);
    console.error('   Message:', error?.message);
    console.error('   Stack:', error?.stack);

    return {
      success: false,
      error: error?.message || 'Unknown error',
      exception: error,
    };
  }
}

export async function testSupabaseAuth() {
  console.log('🧪 Testing Supabase auth...');

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ Auth test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Auth test successful');
    console.log('   Session:', data.session ? 'Active' : 'No session');
    return {
      success: true,
      hasSession: !!data.session,
      user: data.session?.user,
    };
  } catch (error: any) {
    console.error('❌ Auth test exception:', error?.message);
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
}
