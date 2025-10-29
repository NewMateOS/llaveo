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
      const decoded = stored ? decodeURIComponent(stored) : null;
      console.log('🍪 [CookieStorage] getItem:', {
        key,
        hasStored: !!stored,
        valueLength: decoded?.length || 0,
        valuePreview: decoded ? decoded.substring(0, 50) + '...' : 'null'
      });
      return decoded;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;
      console.log('🍪 [CookieStorage] setItem:', {
        key,
        valueLength: value.length,
        valuePreview: value.substring(0, 50) + '...'
      });
      // Usar sameSite: 'none' en desarrollo puede ayudar, pero 'lax' debería funcionar
      // Asegurar que secure sea false en desarrollo para localhost
      const isDev = !import.meta.env.PROD || import.meta.env.DEV;
      cookies.set(SERVER_STORAGE_KEY, encodeURIComponent(value), {
        path: '/',
        httpOnly: true,
        secure: !isDev, // false en desarrollo (localhost), true en producción
        sameSite: isDev ? 'lax' : 'lax', // 'lax' debería funcionar para same-origin
        maxAge: 60 * 60 * 24 * 7, // 7 días
        // Añadir domain explícitamente si es necesario (normalmente no necesario)
      });
      // Verificar que se guardó - esto puede no ser necesario pero ayuda con debugging
      await new Promise(resolve => setTimeout(resolve, 0)); // Pequeño delay para asegurar que se estableció
      const verify = cookies.get(SERVER_STORAGE_KEY)?.value;
      console.log('🍪 [CookieStorage] Verificación después de setItem:', {
        hasCookie: !!verify,
        cookieLength: verify?.length || 0,
        isDev
      });
    },
    removeItem: async (key: string): Promise<void> => {
      if (key !== SERVER_STORAGE_KEY) return;
      console.log('🍪 [CookieStorage] removeItem:', { key });
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
      detectSessionInUrl: true, // Detectar código en URL automáticamente
      flowType: 'pkce' // Usar PKCE para compatibilidad
    }
  });
}
