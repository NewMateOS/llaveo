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

/**
 * Verifica si el usuario está autenticado y obtiene su información
 */
export async function getCurrentUser(cookies?: AstroCookies): Promise<AuthResult> {
  try {
    const client = cookies ? getSupabaseServerClient(cookies) : supabase;
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    
    console.log('🔍 [Auth] getCurrentUser:', {
      hasCookies: !!cookies,
      hasSession: !!session,
      sessionError: sessionError?.message || 'N/A',
      userId: session?.user?.id || 'N/A',
      userEmail: session?.user?.email || 'N/A'
    });
    
    if (sessionError) {
      console.error('❌ [Auth] Error de sesión:', sessionError);
      return { user: null, error: 'Error de sesión: ' + sessionError.message };
    }
    
    if (!session?.user) {
      console.log('⚠️ [Auth] No hay sesión activa');
      return { user: null, error: 'No hay sesión activa' };
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    console.log('📋 [Auth] Perfil obtenido:', {
      hasProfile: !!profile,
      profileError: profileError?.message || 'N/A',
      profileRole: profile?.role || 'N/A',
      profileId: profile?.id || 'N/A'
    });

    if (profileError) {
      console.error('❌ [Auth] Error al obtener perfil:', profileError);
      return { user: null, error: 'Error al obtener perfil: ' + profileError.message };
    }

    const user: User = {
      id: session.user.id,
      email: session.user.email || '',
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role || 'viewer'
    };

    console.log('✅ [Auth] Usuario obtenido:', {
      id: user.id,
      email: user.email,
      role: user.role
    });

    return { user, error: null };
  } catch (error) {
    console.error('❌ [Auth] Error inesperado:', error);
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
export async function protectRoute(cookies: AstroCookies, requiredRole: 'admin' | 'agent' | 'viewer' = 'viewer'): Promise<{
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

/**
 * Obtiene el token de acceso para APIs protegidas
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
}
