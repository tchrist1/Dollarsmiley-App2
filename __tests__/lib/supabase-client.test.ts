import { supabase } from '@/lib/supabase';

describe('Supabase Client', () => {
  it('should be properly initialized', () => {
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it('should have auth methods', () => {
    expect(supabase.auth.getSession).toBeDefined();
    expect(supabase.auth.signIn).toBeDefined();
    expect(supabase.auth.signOut).toBeDefined();
  });

  it('should have database query methods', () => {
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.rpc).toBe('function');
  });

  it('should have functions invoke method', () => {
    expect(supabase.functions).toBeDefined();
    expect(supabase.functions.invoke).toBeDefined();
  });
});
