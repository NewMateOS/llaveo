import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { 
  rateLimit, 
  validateEmail, 
  validatePropertyId, 
  getClientIP, 
  createSecureResponse, 
  createErrorResponse,
  sanitizeInput 
} from '../../lib/security';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimit(`inquiry_post_${clientIP}`, 10, 15 * 60 * 1000)) {
      return createErrorResponse('Demasiadas solicitudes. Intenta más tarde.', 429);
    }

    const body = await request.json();
    let { property_id, name, email, phone, message } = body;

    // Validar campos requeridos
    if (!property_id || !name || !email) {
      return createErrorResponse('Faltan campos requeridos: property_id, name y email son obligatorios', 400);
    }

    // Sanitizar inputs
    property_id = String(property_id).trim();
    name = sanitizeInput(String(name || ''));
    email = String(email || '').trim().toLowerCase();
    phone = phone ? sanitizeInput(String(phone)) : null;
    message = message ? sanitizeInput(String(message)) : null;

    // Validar formato de email
    if (!validateEmail(email)) {
      return createErrorResponse('Email inválido', 400);
    }

    // Validar property_id
    if (!validatePropertyId(property_id)) {
      return createErrorResponse('ID de propiedad inválido', 400);
    }

    // Validar nombre
    if (name.length < 2 || name.length > 100) {
      return createErrorResponse('El nombre debe tener entre 2 y 100 caracteres', 400);
    }

    // Validar teléfono si se proporciona
    if (phone && phone.length > 20) {
      return createErrorResponse('Teléfono inválido', 400);
    }

    // Validar mensaje si se proporciona
    if (message && message.length > 1000) {
      return createErrorResponse('El mensaje no puede exceder 1000 caracteres', 400);
    }

    // Validar que la propiedad existe y está activa
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, title')
      .eq('id', property_id)
      .eq('is_active', true)
      .single();

    if (propertyError || !property) {
      return createErrorResponse('Propiedad no encontrada o no disponible', 404);
    }

    // Insertar la consulta
    const { data, error } = await supabase
      .from('inquiries')
      .insert([{
        property_id,
        name,
        email,
        phone: phone || null,
        message: message || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error inserting inquiry:', error);
      return createErrorResponse('Error al guardar la consulta: ' + error.message, 500);
    }

    return createSecureResponse({ 
      success: true, 
      message: 'Consulta enviada correctamente',
      inquiry: data 
    }, 201);

  } catch (error) {
    console.error('API Error:', error);
    return createErrorResponse('Error interno del servidor: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
};
