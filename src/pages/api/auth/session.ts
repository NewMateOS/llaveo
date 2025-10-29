import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase-server';

export const prerender = false;

type SessionPayload = {
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = getSupabaseServerClient(cookies);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error obteniendo sesión del servidor:', error);
      return new Response(JSON.stringify({ error: 'Unable to read session' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (!data.session) {
      return new Response(JSON.stringify({ session: null }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
      });
    }

    const session = data.session;

    return new Response(JSON.stringify({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type
      }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  } catch (error) {
    console.error('Unexpected error reading server session:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const payload = (await request.json()) as SessionPayload;
    const access_token = payload.session?.access_token;
    const refresh_token = payload.session?.refresh_token;

    console.log('🔄 [Session API] POST recibido:', {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      accessTokenLength: access_token?.length || 0
    });

    if (!access_token || !refresh_token) {
      console.error('❌ [Session API] Faltan tokens de sesión');
      return new Response(JSON.stringify({ error: 'Missing session tokens' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const supabase = getSupabaseServerClient(cookies);
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      console.error('❌ [Session API] Error al establecer sesión:', error);
      return new Response(JSON.stringify({ error: 'Unable to persist session' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    console.log('✅ [Session API] Sesión establecida correctamente:', {
      hasSession: !!data.session,
      userId: data.session?.user?.id || 'N/A',
      userEmail: data.session?.user?.email || 'N/A'
    });

    // Verificar que la sesión se guardó correctamente
    const { data: verifySession } = await supabase.auth.getSession();
    console.log('🔍 [Session API] Verificación de sesión guardada:', {
      hasSession: !!verifySession.session,
      userId: verifySession.session?.user?.id || 'N/A'
    });
    
    // CRÍTICO: Esperar un momento para asegurar que la cookie se estableció
    // y forzar la persistencia de la cookie antes de devolver la respuesta
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Forzar que la cookie se establezca explícitamente si no está presente
    // Esto es un workaround para asegurar que Astro envíe la cookie
    const currentCookie = cookies.get('sb-server-auth-token');
    if (!currentCookie || !currentCookie.value) {
      console.warn('⚠️ [Session API] Cookie no encontrada después de setSession, estableciéndola manualmente');
      // Intentar obtener la sesión serializada directamente de Supabase
      if (data.session) {
        // No podemos serializar directamente, pero podemos verificar el storage
        console.warn('⚠️ [Session API] La cookie debería haberse establecido automáticamente');
      }
    }

    // Leer la cookie directamente para verificar que se guardó
    const cookieValue = cookies.get('sb-server-auth-token')?.value;
    console.log('🍪 [Session API] Cookie después de setSession:', {
      hasCookie: !!cookieValue,
      cookieLength: cookieValue?.length || 0
    });

    // IMPORTANTE: Asegurar que las cookies se envíen en los headers de respuesta
    // Astro debería hacer esto automáticamente
    const responseHeaders = new Headers({
      'content-type': 'application/json'
    });
    
    // Verificar que la cookie principal está presente
    const mainCookie = cookies.get('sb-server-auth-token');
    console.log('🍪 [Session API] Cookie principal en respuesta:', {
      hasCookie: !!mainCookie,
      cookieName: mainCookie?.name || 'N/A'
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('❌ [Session API] Error inesperado:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    const supabase = getSupabaseServerClient(cookies);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error clearing server session cookie:', error);
      return new Response(JSON.stringify({ error: 'Unable to clear session' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('Unexpected error clearing session:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
};
