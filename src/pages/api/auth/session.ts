import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase-server';
import type { AstroCookies } from 'astro';

export const prerender = false;

type SessionPayload = {
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

export const GET: APIRoute = async ({ cookies }: { cookies: AstroCookies }) => {
  try {
    const supabase = getSupabaseServerClient(cookies);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
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
    console.error('Error reading server session:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }: { request: Request; cookies: AstroCookies }) => {
  try {
    const payload = (await request.json()) as SessionPayload;
    const access_token = payload.session?.access_token;
    const refresh_token = payload.session?.refresh_token;

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: 'Missing session tokens' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const supabase = getSupabaseServerClient(cookies);
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      console.error('Error setting server session:', error);
      return new Response(JSON.stringify({ error: 'Unable to persist session' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('Error syncing session:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }: { cookies: AstroCookies }) => {
  try {
    const supabase = getSupabaseServerClient(cookies);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error clearing server session:', error);
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
    console.error('Error clearing session:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
};
