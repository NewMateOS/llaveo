import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

// GET - Obtener favoritos del usuario
export const GET: APIRoute = async ({ request }) => {
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
    
    // Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener favoritos del usuario con información de propiedades
    const { data: favorites, error } = await supabase
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

    return new Response(JSON.stringify({ favorites: favorites || [] }), { 
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

// POST - Agregar/quitar favorito
export const POST: APIRoute = async ({ request }) => {
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
    
    // Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { property_id, action } = await request.json();

    if (!property_id || !action) {
      return new Response(JSON.stringify({ error: 'property_id y action son requeridos' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'add') {
      // Agregar a favoritos
      const { data, error } = await supabase
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
      const { error } = await supabase
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
export const DELETE: APIRoute = async ({ request }) => {
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
    
    // Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const property_id = url.searchParams.get('property_id');

    if (!property_id) {
      return new Response(JSON.stringify({ error: 'property_id es requerido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Eliminar favorito
    const { error } = await supabase
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
