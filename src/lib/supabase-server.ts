import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import { getSupabaseConfig } from './supabase-config';

const { url, anonKey } = getSupabaseConfig();
const SERVER_STORAGE_KEY = 'sb-server-auth-token';

function createCookieStorage(cookies: AstroCookies) {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (key !== SERVER_STORAGE_KEY) return null;
      return cookies.get(SERVER_STORAGE_KEY)?.value ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;

      const isDev = import.meta.env.DEV;
      cookies.set(SERVER_STORAGE_KEY, value, {
        path: '/',
        httpOnly: true,
        secure: !isDev,
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
  return createClient(url, anonKey, {
    auth: {
      storage: createCookieStorage(cookies),
      storageKey: SERVER_STORAGE_KEY,
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });
}
