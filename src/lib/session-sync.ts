// @ts-ignore - Supabase types
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hidrata la sesión del cliente desde las cookies del servidor
 * Esto mantiene la autenticación entre el servidor y el cliente
 */
export async function hydrateClientFromServerSession(supabase: SupabaseClient): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin'
    });
    
    if (response.ok) {
      const { session } = await response.json();
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });
        return true;
      }
    }
  } catch (error) {
    // Silenciosamente fallar - no es crítico
  }
  
  return false;
}
