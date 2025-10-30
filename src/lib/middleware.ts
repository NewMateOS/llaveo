import type { AstroCookies } from 'astro';
import { getSupabaseServerClient } from './supabase-server';

export interface MiddlewareOptions {
  requireAuth?: boolean;
  requireRole?: 'admin' | 'agent' | 'viewer';
  redirectTo?: string;
}

export async function securityMiddleware(
  cookies: AstroCookies,
  options: MiddlewareOptions = {}
): Promise<{
  user: any | null;
  hasAccess: boolean;
  error: string | null;
  response?: Response;
}> {
  try {
    // Verificar autenticación si es requerida
    if (options.requireAuth) {
      const supabase = getSupabaseServerClient(cookies);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        const redirectUrl = options.redirectTo || '/access-denied';
        return {
          user: null,
          hasAccess: false,
          error: 'No autenticado',
          response: new Response(null, {
            status: 302,
            headers: { 'Location': redirectUrl }
          })
        };
      }

      // Verificar rol si es requerido
      if (options.requireRole) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          return {
            user: null,
            hasAccess: false,
            error: 'Perfil no encontrado',
            response: new Response(null, {
              status: 302,
              headers: { 'Location': '/access-denied' }
            })
          };
        }

        const roleHierarchy: Record<string, number> = {
          'viewer': 1,
          'agent': 2,
          'admin': 3
        };

        // Validar que el rol del usuario existe en la jerarquía
        const userRoleLevel = roleHierarchy[profile.role];
        const requiredRoleLevel = roleHierarchy[options.requireRole];

        // Si el rol del usuario no existe en la jerarquía o es menor al requerido, denegar acceso
        if (userRoleLevel === undefined || requiredRoleLevel === undefined || userRoleLevel < requiredRoleLevel) {
          return {
            user: null,
            hasAccess: false,
            error: 'Permisos insuficientes o rol inválido',
            response: new Response(null, {
              status: 302,
              headers: { 'Location': '/access-denied' }
            })
          };
        }
      }

      return {
        user: session.user,
        hasAccess: true,
        error: null
      };
    }

    return {
      user: null,
      hasAccess: true,
      error: null
    };
  } catch (error) {
    console.error('Error en middleware de seguridad:', error);
    return {
      user: null,
      hasAccess: false,
      error: 'Error interno del servidor',
      response: new Response(null, {
        status: 500,
        headers: { 'Location': '/access-denied' }
      })
    };
  }
}

