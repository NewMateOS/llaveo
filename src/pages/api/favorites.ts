import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { 
  rateLimit, 
  validateEmail, 
  validatePropertyId, 
  getClientIP, 
  createSecureResponse, 
  createErrorResponse,
  sanitizeInput 
} from '../../lib/security';

// Importante: marcar como no prerenderizado para que pueda acceder a request.headers
export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
}

// GET - Obtener favoritos del usuario
export const GET: APIRoute = async ({ request }: { request: Request }) => {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimit(`favorites_get_${clientIP}`, 60, 15 * 60 * 1000)) {
      return createErrorResponse('Demasiadas solicitudes. Intenta más tarde.', 429);
    }

    // Obtener token de autorización
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Token de autorización requerido', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Crear cliente y verificar sesión
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [Favorites API GET] Error verificando usuario:', authError);
      return createErrorResponse('Sesión inválida: ' + (authError?.message || 'Token inválido'), 401);
    }

    // Validar email del usuario
    if (user.email && !validateEmail(user.email)) {
      return createErrorResponse('Email de usuario inválido', 400);
    }

    // Crear cliente autenticado para las consultas
    const authenticatedSupabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verificar y crear perfil si no existe usando función SQL
    const { data: existingProfile, error: profileCheckError } = await authenticatedSupabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile && (!profileCheckError || profileCheckError.code === 'PGRST116')) {
      // Intentar crear perfil usando función SQL (si existe)
      const { error: createProfileError } = await authenticatedSupabase.rpc('create_user_profile', {
        user_id: user.id,
        user_email: user.email || '',
        user_full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        user_avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      });

      if (createProfileError) {
        // Si la función no existe o falla, intentar insert directo
        const { error: profileError } = await authenticatedSupabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            role: 'viewer'
          });

        if (profileError) {
          console.error('❌ [Favorites API GET] Error creando perfil:', profileError);
          // Si sigue fallando, es un problema de políticas RLS
          return new Response(JSON.stringify({ 
            error: 'No se pudo crear el perfil. Por favor, ejecuta el SQL en Supabase Dashboard para crear las políticas necesarias.',
            details: profileError.message 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          console.log('✅ [Favorites API GET] Perfil creado automáticamente para:', user.id);
        }
      } else {
        console.log('✅ [Favorites API GET] Perfil creado usando función SQL para:', user.id);
      }
    }

    // Obtener favoritos del usuario con información de propiedades
    const { data: favorites, error } = await authenticatedSupabase
      .from('favorites')
      .select(`
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
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return new Response(JSON.stringify({ error: 'Error al obtener favoritos' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return createSecureResponse({ favorites: favorites || [] });

  } catch (error) {
    console.error('API Error:', error);
    return createErrorResponse('Error interno del servidor', 500);
  }
};

// POST - Agregar/quitar favorito
export const POST: APIRoute = async ({ request }: { request: Request }) => {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimit(`favorites_post_${clientIP}`, 30, 15 * 60 * 1000)) {
      return createErrorResponse('Demasiadas solicitudes. Intenta más tarde.', 429);
    }

    // Obtener token de autorización
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Token de autorización requerido', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Crear cliente y verificar sesión
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [Favorites API POST] Error verificando usuario:', authError);
      return new Response(JSON.stringify({ error: 'Sesión inválida: ' + (authError?.message || 'Token inválido') }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear cliente autenticado para las consultas
    const authenticatedSupabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verificar y crear perfil si no existe usando función SQL
    const { data: existingProfile, error: profileCheckError } = await authenticatedSupabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile && (!profileCheckError || profileCheckError.code === 'PGRST116')) {
      // Intentar crear perfil usando función SQL (si existe)
      const { error: createProfileError } = await authenticatedSupabase.rpc('create_user_profile', {
        user_id: user.id,
        user_email: user.email || '',
        user_full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        user_avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      });

      if (createProfileError) {
        // Si la función no existe o falla, intentar insert directo
        const { error: profileError } = await authenticatedSupabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            role: 'viewer'
          });

        if (profileError) {
          console.error('❌ [Favorites API POST] Error creando perfil:', profileError);
          return new Response(JSON.stringify({ 
            error: 'No se pudo crear el perfil. Por favor, ejecuta el SQL en Supabase Dashboard para crear las políticas necesarias.',
            details: profileError.message 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          console.log('✅ [Favorites API POST] Perfil creado automáticamente para:', user.id);
        }
      } else {
        console.log('✅ [Favorites API POST] Perfil creado usando función SQL para:', user.id);
      }
    }

    const body = await request.json();
    const { property_id, action } = body;

    // Validar entrada
    if (!property_id || !action) {
      return createErrorResponse('property_id y action son requeridos', 400);
    }

    // Validar property_id
    if (!validatePropertyId(property_id)) {
      return createErrorResponse('ID de propiedad inválido', 400);
    }

    // Validar action
    if (!['add', 'remove'].includes(action)) {
      return createErrorResponse('Acción inválida. Use "add" o "remove"', 400);
    }

    if (action === 'add') {
      // Agregar a favoritos
      const { data, error } = await authenticatedSupabase
        .from('favorites')
        .insert({
          user_id: user.id,
          property_id: property_id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Ya existe en favoritos
          return new Response(JSON.stringify({ message: 'Ya está en favoritos', isFavorite: true }), { 
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }

      return new Response(JSON.stringify({ message: 'Agregado a favoritos', isFavorite: true }), { 
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'remove') {
      // Quitar de favoritos
      const { error } = await authenticatedSupabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', property_id);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ message: 'Eliminado de favoritos', isFavorite: false }), { 
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({ error: 'Acción inválida. Use "add" o "remove"' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Eliminar favorito específico
export const DELETE: APIRoute = async ({ request }: { request: Request }) => {
  try {
    // Obtener token de autorización
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autorización requerido' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Crear cliente y verificar sesión
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [Favorites API] Error verificando usuario:', authError);
      return new Response(JSON.stringify({ error: 'Sesión inválida: ' + (authError?.message || 'Token inválido') }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear cliente autenticado para las consultas
    const authenticatedSupabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verificar y crear perfil si no existe usando función SQL
    const { data: existingProfile, error: profileCheckError } = await authenticatedSupabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile && (!profileCheckError || profileCheckError.code === 'PGRST116')) {
      // Intentar crear perfil usando función SQL (si existe)
      const { error: createProfileError } = await authenticatedSupabase.rpc('create_user_profile', {
        user_id: user.id,
        user_email: user.email || '',
        user_full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        user_avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
      });

      if (createProfileError) {
        // Si la función no existe o falla, intentar insert directo
        const { error: profileError } = await authenticatedSupabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            role: 'viewer'
          });

        if (profileError) {
          console.error('❌ [Favorites API DELETE] Error creando perfil:', profileError);
          return new Response(JSON.stringify({ 
            error: 'No se pudo crear el perfil. Por favor, ejecuta el SQL en Supabase Dashboard para crear las políticas necesarias.',
            details: profileError.message 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          console.log('✅ [Favorites API DELETE] Perfil creado automáticamente para:', user.id);
        }
      } else {
        console.log('✅ [Favorites API DELETE] Perfil creado usando función SQL para:', user.id);
      }
    }

    const url = new URL(request.url);
    const property_id = url.searchParams.get('property_id');

    if (!property_id) {
      return new Response(JSON.stringify({ error: 'property_id es requerido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Eliminar favorito usando el cliente autenticado
    const { error } = await authenticatedSupabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('property_id', property_id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: 'Favorito eliminado' }), { 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
