import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { 
  rateLimit, 
  getClientIP, 
  createSecureResponse, 
  createErrorResponse,
  sanitizeInput 
} from '../../lib/security';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (!rateLimit(`search_get_${clientIP}`, 120, 15 * 60 * 1000)) {
      return createErrorResponse('Demasiadas solicitudes. Intenta más tarde.', 429);
    }

    const u = new URL(request.url);
    let q = (u.searchParams.get('q') || '').trim();
    let city = u.searchParams.get('city')?.trim() || undefined;
    let status = u.searchParams.get('status')?.trim() || undefined;
    let minRooms = u.searchParams.get('minRooms')?.trim();
    let minPrice = u.searchParams.get('minPrice')?.trim();
    let maxPrice = u.searchParams.get('maxPrice')?.trim();

    // Sanitizar y validar inputs
    if (q) {
      q = sanitizeInput(q).toLowerCase();
      if (q.length > 200) {
        q = q.substring(0, 200);
      }
    }

    if (city) {
      city = sanitizeInput(city);
      if (city.length > 100) {
        city = city.substring(0, 100);
      }
    }

    if (status && !['venta', 'alquiler'].includes(status)) {
      return createErrorResponse('Estado inválido. Use "venta" o "alquiler"', 400);
    }

    // Validar números
    const minRoomsNum = minRooms ? Number.parseInt(minRooms, 10) : 0;
    const minPriceNum = minPrice ? Number.parseInt(minPrice, 10) : 0;
    const maxPriceNum = maxPrice ? Number.parseInt(maxPrice, 10) : 0;

    // Validar rangos lógicos
    if (minRoomsNum < 0 || minRoomsNum > 20) {
      return createErrorResponse('Número de habitaciones inválido', 400);
    }

    if (minPriceNum < 0 || minPriceNum > 100000000) {
      return createErrorResponse('Precio mínimo inválido', 400);
    }

    if (maxPriceNum < 0 || maxPriceNum > 100000000) {
      return createErrorResponse('Precio máximo inválido', 400);
    }

    if (minPriceNum > 0 && maxPriceNum > 0 && minPriceNum > maxPriceNum) {
      return createErrorResponse('El precio mínimo no puede ser mayor que el máximo', 400);
    }

    // Construir query
    let query = supabase.from('properties')
      .select('*, property_images(url, sort_order)')
      .eq('is_active', true);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (minRoomsNum > 0) {
      query = query.gte('rooms', minRoomsNum);
    }
    
    if (minPriceNum > 0) {
      query = query.gte('price', minPriceNum);
    }
    
    if (maxPriceNum > 0) {
      query = query.lte('price', maxPriceNum);
    }
    
    if (q) {
      // Escapar caracteres especiales para ilike
      const escapedQ = q.replace(/[%_\\]/g, '\\$&');
      query = query.or(`title.ilike.%${escapedQ}%,address.ilike.%${escapedQ}%,description.ilike.%${escapedQ}%,city.ilike.%${escapedQ}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
    
    if (error) {
      console.error('Error fetching properties:', error);
      return createErrorResponse('Error al buscar propiedades: ' + error.message, 500);
    }

    return createSecureResponse({ items: data || [] });

  } catch (error) {
    console.error('Search API Error:', error);
    return createErrorResponse('Error interno del servidor: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
};
