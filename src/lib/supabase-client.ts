import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const { url, anonKey } = getSupabaseConfig();
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage,
        storageKey: 'sb-auth-token',
        flowType: 'pkce'
      }
    });
  }

  return supabaseClient;
}
