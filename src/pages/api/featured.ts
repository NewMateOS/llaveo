import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Obtener las últimas 6 propiedades activas como destacadas
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(url, sort_order)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Error fetching featured properties:', error);
      return new Response(JSON.stringify({ error: 'Error al obtener propiedades destacadas' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Asegurar que siempre devolvemos un array, nunca null o undefined
    return new Response(JSON.stringify({ properties: data || [] }), { 
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
