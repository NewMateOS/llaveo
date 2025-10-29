import type { AstroCookies } from 'astro';
import { getSupabaseServerClient } from './supabase-server';
import { applySecurityHeaders } from './security';

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

        const roleHierarchy = {
          'viewer': 1,
          'agent': 2,
          'admin': 3
        };

        if (roleHierarchy[profile.role] < roleHierarchy[options.requireRole]) {
          return {
            user: null,
            hasAccess: false,
            error: 'Permisos insuficientes',
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

export function createSecureResponse(data: any, status: number = 200): Response {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  return applySecurityHeaders(response, false);
}

export function createRedirectResponse(url: string, status: number = 302): Response {
  const response = new Response(null, {
    status,
    headers: { 'Location': url }
  });

  return applySecurityHeaders(response, false);
}
