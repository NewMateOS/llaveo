import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import {
  rateLimit,
  validateEmail,
  validatePropertyId,
  getClientIP,
  createSecureResponse,
  createErrorResponse,
  resolveSecurityOptions,
  sanitizeInput
} from '../../lib/security';

// Usar service_role si está disponible, sino usar cliente anónimo con RLS
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Crear cliente: preferir service_role (bypass RLS), sino usar anon key (requiere políticas RLS)
let supabase: ReturnType<typeof createClient> | null = null;
let supabaseConfigError: string | null = null;

if (!supabaseUrl) {
  supabaseConfigError = 'PUBLIC_SUPABASE_URL no está configurada';
} else if (!supabaseServiceKey && !supabaseAnonKey) {
  supabaseConfigError = 'No se encontró SUPABASE_SERVICE_ROLE_KEY ni PUBLIC_SUPABASE_ANON_KEY';
} else {
  const keyToUse = supabaseServiceKey || supabaseAnonKey;
  supabase = createClient(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  if (supabaseServiceKey) {
    console.log('✅ Usando service_role key (bypass RLS)');
  } else {
    console.log('⚠️ Usando anon key (requiere políticas RLS configuradas)');
  }
}

if (supabaseConfigError) {
  console.error('❌ Configuración de Supabase:', supabaseConfigError);
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const securityOptions = resolveSecurityOptions(request);
    // Verificar que Supabase está configurado
    if (!supabase || supabaseConfigError) {
      console.error('❌ Supabase no configurado:', supabaseConfigError || 'Cliente no inicializado');
      return createErrorResponse(
        `Error de configuración del servidor: ${supabaseConfigError || 'Variables de entorno de Supabase no configuradas'}. ` +
        'Verifica que PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY estén configuradas en tu archivo .env',
        500,
        undefined,
        securityOptions
      );
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimit(`inquiry_post_${clientIP}`, 10, 15 * 60 * 1000)) {
      return createErrorResponse('Demasiadas solicitudes. Intenta más tarde.', 429, undefined, securityOptions);
    }

    const body = await request.json();
    let { property_id, name, email, phone, message } = body;

    // Validar que el body existe
    if (!body || typeof body !== 'object') {
      return createErrorResponse('Formulario inválido. Por favor, completa todos los campos requeridos.', 400, undefined, securityOptions);
    }

    // Validar campos requeridos
    if (!property_id || !name || !email) {
      return createErrorResponse('Faltan campos requeridos: Nombre y Email son obligatorios', 400, undefined, securityOptions);
    }

    // Sanitizar inputs
    property_id = String(property_id).trim();
    name = sanitizeInput(String(name || '')).trim();
    email = String(email || '').trim().toLowerCase();
    phone = phone ? sanitizeInput(String(phone)).trim() : null;
    message = message ? sanitizeInput(String(message)).trim() : null;

    // Validar que los campos no estén vacíos después de trim
    if (!property_id || !name || !email) {
      return createErrorResponse('Los campos Nombre y Email no pueden estar vacíos', 400, undefined, securityOptions);
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return createErrorResponse('Email inválido', 400, undefined, securityOptions);
    }

    // Validar property_id
    if (!validatePropertyId(property_id)) {
      return createErrorResponse('ID de propiedad inválido', 400, undefined, securityOptions);
    }

    // Validar nombre
    if (name.length < 2 || name.length > 100) {
      return createErrorResponse('El nombre debe tener entre 2 y 100 caracteres', 400, undefined, securityOptions);
    }

    // Validar teléfono si se proporciona
    if (phone && phone.length > 20) {
      return createErrorResponse('Teléfono inválido', 400, undefined, securityOptions);
    }

    // Validar mensaje si se proporciona
    if (message && message.length > 1000) {
      return createErrorResponse('El mensaje no puede exceder 1000 caracteres', 400, undefined, securityOptions);
    }

    // Validar que la propiedad existe y está activa
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, title')
      .eq('id', property_id)
      .eq('is_active', true)
      .single();

    if (propertyError || !property) {
      return createErrorResponse('Propiedad no encontrada o no disponible', 404, undefined, securityOptions);
    }

    // Insertar la consulta
    // Nota: Si la columna 'status' no existe, simplemente no la incluimos en el insert
    const insertData: any = {
      property_id,
      name,
      email,
      phone: phone || null,
      message: message || null,
      status: 'pending' // Si la columna no existe, Supabase ignorará este campo
    };
    
    const { data, error } = await supabase
      .from('inquiries')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting inquiry:', error);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      
      // Mensaje más descriptivo basado en el código de error
      let errorMessage = 'Error al guardar la consulta: ' + error.message;
      
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        errorMessage = 'Error de permisos: Las políticas de seguridad (RLS) no permiten insertar consultas. ' +
          'Verifica que hayas ejecutado las políticas RLS en Supabase (ver MIGRATIONS.md). ' +
          'Si ya las ejecutaste, verifica que la política "Allow public to insert inquiries" esté activa.';
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        errorMessage = 'Error de base de datos: La tabla o columna no existe. Verifica el esquema de la base de datos.';
      } else if (error.code === '23503' || error.message?.includes('foreign key')) {
        errorMessage = 'Error: La propiedad especificada no existe.';
      }
      
      return createErrorResponse(errorMessage, 500, undefined, securityOptions);
    }

    return createSecureResponse({
      success: true,
      message: 'Consulta enviada correctamente',
      inquiry: data
    }, 201, securityOptions);

  } catch (error) {
    console.error('API Error:', error);
    const securityOptions = resolveSecurityOptions(request);
    return createErrorResponse(
      'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Unknown error'),
      500,
      undefined,
      securityOptions,
    );
  }
};
