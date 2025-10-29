import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').toLowerCase();
  const city = u.searchParams.get('city') || undefined;
  const status = u.searchParams.get('status') || undefined;
  const minRooms = Number(u.searchParams.get('minRooms') || 0);
  const minPrice = Number(u.searchParams.get('minPrice') || 0);
  const maxPrice = Number(u.searchParams.get('maxPrice') || 0);

  let query = supabase.from('properties')
    .select('*, property_images(url, sort_order)')
    .eq('is_active', true);

  if (city) query = query.ilike('city', city);
  if (status) query = query.eq('status', status);
  if (minRooms) query = query.gte('rooms', minRooms);
  if (minPrice) query = query.gte('price', minPrice);
  if (maxPrice) query = query.lte('price', maxPrice);
  if (q) query = query.or(`title.ilike.%${q}%,address.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query.order('created_at', { ascending:false }).limit(60);
  if (error) {
    console.error('Error fetching properties:', error);
    return new Response(JSON.stringify({ items: [], error: error.message }), { 
      status: 500, 
      headers: {'content-type':'application/json'} 
    });
  }
  return new Response(JSON.stringify({ items: data || [] }), { headers: {'content-type':'application/json'} });
};
