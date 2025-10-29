import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const SERVER_STORAGE_KEY = 'sb-server-auth-token';

function createCookieStorage(cookies: AstroCookies) {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (key !== SERVER_STORAGE_KEY) return null;
      const stored = cookies.get(SERVER_STORAGE_KEY)?.value;
      return stored ? decodeURIComponent(stored) : null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;
      cookies.set(SERVER_STORAGE_KEY, encodeURIComponent(value), {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
    },
    removeItem: async (key: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;
      cookies.delete(SERVER_STORAGE_KEY, { path: '/' });
    }
  };
}

export function getSupabaseServerClient(cookies: AstroCookies): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: createCookieStorage(cookies),
      storageKey: SERVER_STORAGE_KEY,
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
}
