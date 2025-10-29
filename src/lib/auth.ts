import type { AstroCookies } from 'astro';
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

/**
 * Verifica si el usuario está autenticado y obtiene su información
 */
export async function getCurrentUser(cookies?: AstroCookies): Promise<AuthResult> {
  try {
    if (!cookies) {
      return { user: null, error: 'No se proporcionaron cookies' };
    }
    
    const client = getSupabaseServerClient(cookies);
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    if (sessionError) {
      return { user: null, error: 'Error de sesión: ' + sessionError.message };
    }
    
    if (!session?.user) {
      return { user: null, error: 'No hay sesión activa' };
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return { user: null, error: 'Error al obtener perfil: ' + profileError.message };
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
    console.error('Error inesperado en getCurrentUser:', error);
    return { user: null, error: 'Error inesperado: ' + (error as Error).message };
  }
}

/**
 * Verifica si el usuario tiene el rol requerido
 */
export function hasRole(user: User | null, requiredRole: 'admin' | 'agent' | 'viewer'): boolean {
  if (!user) return false;
  
  const roleHierarchy = {
    'viewer': 1,
    'agent': 2,
    'admin': 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Verifica si el usuario puede acceder al admin
 */
export function canAccessAdmin(user: User | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Verifica si el usuario puede gestionar propiedades
 */
export function canManageProperties(user: User | null): boolean {
  return hasRole(user, 'agent');
}

/**
 * Middleware para proteger rutas
 */
export async function protectRoute(
  cookies: AstroCookies, 
  requiredRole: 'admin' | 'agent' | 'viewer' = 'viewer'
): Promise<{
  user: User | null;
  hasAccess: boolean;
  error: string | null;
}> {
  const { user, error } = await getCurrentUser(cookies);
  
  if (error || !user) {
    return { user: null, hasAccess: false, error: error || 'Usuario no autenticado' };
  }
  
  const hasAccess = hasRole(user, requiredRole);
  return { user, hasAccess, error: hasAccess ? null : 'Acceso denegado: rol insuficiente' };
}
