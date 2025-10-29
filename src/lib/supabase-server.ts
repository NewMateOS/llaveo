import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const SERVER_STORAGE_KEY = 'sb-server-auth-token';

function createCookieStorage(cookies: AstroCookies) {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (key !== SERVER_STORAGE_KEY) return null;

      try {
        const stored = cookies.get(SERVER_STORAGE_KEY)?.value;
        if (!stored) return null;
        // El valor puede venir como JSON string o como URL encoded
        const decoded = decodeURIComponent(stored);
        // Si es JSON válido, retornarlo, sino retornar el string tal cual
        try {
          JSON.parse(decoded);
          return decoded;
        } catch {
          return decoded;
        }
      } catch (error) {
        console.error('Error leyendo cookie:', error);
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;
      try {
        // El valor ya debería venir como JSON string de Supabase
        // Lo guardamos directamente sin parsear
        cookies.set(SERVER_STORAGE_KEY, encodeURIComponent(value), {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 * 2 // 14 días (refresh tokens duran más)
        });
      } catch (error) {
        console.error('Error guardando cookie:', error);
      }
    },
    removeItem: async (key: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;
      try {
        cookies.delete(SERVER_STORAGE_KEY, { path: '/' });
      } catch (error) {
        console.error('Error eliminando cookie:', error);
      }
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
      autoRefreshToken: true, // Habilitado para refrescar tokens automáticamente
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });
}