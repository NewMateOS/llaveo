// Cliente singleton de Supabase para scripts del lado del cliente
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Obtiene el cliente de Supabase para uso en scripts del lado del cliente.
 * Usa un patrón singleton para evitar múltiples instancias.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Variables de entorno de Supabase no configuradas');
      supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { persistSession: false }
      });
      return supabaseClient;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-auth-token',
        flowType: 'pkce'
      }
    });
  }

  return supabaseClient;
}
