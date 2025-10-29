import type { Session, SupabaseClient } from '@supabase/supabase-js';

type ServerSessionResponse = {
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
  };
};

/**
 * Hidrata el cliente de Supabase en el navegador usando la sesión guardada en las cookies del servidor.
 * Devuelve la sesión del usuario si se pudo sincronizar, o null en caso contrario.
 */
export async function hydrateClientFromServerSession(
  client: SupabaseClient
): Promise<Session | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'cache-control': 'no-store'
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ServerSessionResponse;
    const tokens = payload.session;

    if (!tokens?.access_token || !tokens?.refresh_token) {
      return null;
    }

    const { data, error } = await client.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type
    });

    if (error) {
      console.error('No se pudo hidratar la sesión del cliente desde el servidor:', error);
      return null;
    }

    return data.session ?? null;
  } catch (error) {
    console.error('Error sincronizando sesión desde el servidor:', error);
    return null;
  }
}
