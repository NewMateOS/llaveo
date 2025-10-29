import type { APIRoute } from 'astro';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../lib/supabase-config';

export const prerender = false;

const { url, anonKey } = getSupabaseConfig();
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS
  });
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.replace('Bearer ', '');
}

function createBaseClient(): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

async function ensureProfile(client: SupabaseClient, user: User): Promise<Response | null> {
  const { data: existingProfile, error: profileCheckError } = await client
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    return null;
  }

  if (profileCheckError && profileCheckError.code !== 'PGRST116') {
    console.error('Error verificando el perfil del usuario:', profileCheckError);
    return jsonResponse({ error: 'No se pudo verificar el perfil del usuario.' }, 500);
  }

  const profilePayload = {
    id: user.id,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Usuario',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    role: 'viewer'
  };

  const { error: rpcError } = await client.rpc('create_user_profile', {
    user_id: user.id,
    user_email: user.email || '',
    user_full_name: profilePayload.full_name,
    user_avatar_url: profilePayload.avatar_url
  });

  if (!rpcError) {
    return null;
  }

  const { error: insertError } = await client.from('profiles').insert(profilePayload);

  if (insertError) {
    console.error('Error creando el perfil del usuario:', insertError);
    return jsonResponse(
      {
        error: 'No se pudo crear el perfil del usuario. Revisa las políticas de Supabase.',
        details: insertError.message
      },
      500
    );
  }

  return null;
}

async function resolveAuthContext(request: Request): Promise<Response | { token: string; user: User }> {
  const token = getBearerToken(request);
  if (!token) {
    return jsonResponse({ error: 'Token de autorización requerido' }, 401);
  }

  const supabase = createBaseClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('Error verificando el usuario autenticado:', authError);
    return jsonResponse({ error: 'Sesión inválida' }, 401);
  }

  return { token, user };
}

export const GET: APIRoute = async ({ request }) => {
  const authContext = await resolveAuthContext(request);
  if (authContext instanceof Response) {
    return authContext;
  }

  const { token, user } = authContext;
  const client = createAuthenticatedClient(token);
  const profileError = await ensureProfile(client, user);
  if (profileError) {
    return profileError;
  }

  const { data, error } = await client
    .from('favorites')
    .select(
      `
        *,
        property:properties(
          id,
          title,
          description,
          price,
          city,
          address,
          rooms,
          baths,
          area_m2,
          status,
          property_images(url, sort_order)
        )
      `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error obteniendo los favoritos del usuario:', error);
    return jsonResponse({ error: 'Error al obtener los favoritos.' }, 500);
  }

  return jsonResponse({ favorites: data ?? [] });
};

export const POST: APIRoute = async ({ request }) => {
  const authContext = await resolveAuthContext(request);
  if (authContext instanceof Response) {
    return authContext;
  }

  const { token, user } = authContext;
  const client = createAuthenticatedClient(token);
  const profileError = await ensureProfile(client, user);
  if (profileError) {
    return profileError;
  }

  const { property_id, action } = await request.json();

  if (!property_id || !action) {
    return jsonResponse({ error: 'property_id y action son requeridos.' }, 400);
  }

  if (action === 'add') {
    const { error } = await client
      .from('favorites')
      .insert({ user_id: user.id, property_id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return jsonResponse({ message: 'La propiedad ya está en favoritos', isFavorite: true });
      }

      console.error('Error agregando la propiedad a favoritos:', error);
      return jsonResponse({ error: 'No se pudo agregar la propiedad a favoritos.' }, 500);
    }

    return jsonResponse({ message: 'Agregado a favoritos', isFavorite: true });
  }

  if (action === 'remove') {
    const { error } = await client
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('property_id', property_id);

    if (error) {
      console.error('Error eliminando la propiedad de favoritos:', error);
      return jsonResponse({ error: 'No se pudo eliminar la propiedad de favoritos.' }, 500);
    }

    return jsonResponse({ message: 'Eliminado de favoritos', isFavorite: false });
  }

  return jsonResponse({ error: 'Acción inválida. Usa "add" o "remove".' }, 400);
};

export const DELETE: APIRoute = async ({ request }) => {
  const authContext = await resolveAuthContext(request);
  if (authContext instanceof Response) {
    return authContext;
  }

  const { token, user } = authContext;
  const client = createAuthenticatedClient(token);
  const profileError = await ensureProfile(client, user);
  if (profileError) {
    return profileError;
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');

  if (!propertyId) {
    return jsonResponse({ error: 'property_id es requerido.' }, 400);
  }

  const { error } = await client
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error eliminando el favorito:', error);
    return jsonResponse({ error: 'No se pudo eliminar el favorito.' }, 500);
  }

  return jsonResponse({ message: 'Favorito eliminado' });
};
