import type { AstroCookies } from 'astro';
import { supabase } from './supabase';
import { getSupabaseServerClient } from './supabase-server';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'agent' | 'viewer';
}

export interface AuthResult {
  user: User | null;
  error: string | null;
}

export async function getCurrentUser(cookies?: AstroCookies): Promise<AuthResult> {
  try {
    const client = cookies ? getSupabaseServerClient(cookies) : supabase;
    const { data: { session }, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      console.error('Error de sesión de Supabase:', sessionError);
      return { user: null, error: 'Error al obtener la sesión' };
    }

    if (!session?.user) {
      return { user: null, error: 'No hay sesión activa' };
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error obteniendo el perfil del usuario:', profileError);
      return { user: null, error: 'Error al obtener el perfil del usuario' };
    }

    const user: User = {
      id: session.user.id,
      email: session.user.email || '',
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role || 'viewer'
    };

    return { user, error: null };
  } catch (error) {
    console.error('Error inesperado obteniendo el usuario actual:', error);
    return { user: null, error: 'Error inesperado al obtener el usuario actual' };
  }
}

export function hasRole(user: User | null, requiredRole: 'admin' | 'agent' | 'viewer'): boolean {
  if (!user) return false;

  const roleHierarchy = {
    viewer: 1,
    agent: 2,
    admin: 3
  } as const;

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export async function protectRoute(
  cookies: AstroCookies,
  requiredRole: 'admin' | 'agent' | 'viewer' = 'viewer'
): Promise<{
  user: User | null;
  hasAccess: boolean;
  error: string | null;
}> {
  const { user, error } = await getCurrentUser(cookies);

  if (error) {
    return { user: null, hasAccess: false, error };
  }

  if (!user) {
    return { user: null, hasAccess: false, error: 'Usuario no autenticado' };
  }

  const hasAccess = hasRole(user, requiredRole);

  return { user, hasAccess, error: hasAccess ? null : 'Acceso denegado: rol insuficiente' };
}
