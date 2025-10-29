import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { property_id, name, email, phone, message } = body;

    // Validar campos requeridos
    if (!property_id || !name || !email) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar que la propiedad existe y está activa
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, title')
      .eq('id', property_id)
      .eq('is_active', true)
      .single();

    if (propertyError || !property) {
      return new Response(JSON.stringify({ error: 'Propiedad no encontrada' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insertar la consulta
    const { data, error } = await supabase
      .from('inquiries')
      .insert([{
        property_id,
        name,
        email,
        phone: phone || null,
        message: message || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting inquiry:', error);
      return new Response(JSON.stringify({ error: 'Error al guardar la consulta' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Consulta enviada correctamente',
      inquiry: data 
    }), { 
      status: 201,
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
