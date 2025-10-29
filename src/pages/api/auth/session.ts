import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase-server';

type SessionPayload = {
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

export const POST: APIRoute = async ({ request, cookies }) => {
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
      console.error('Error setting server session cookie:', error);
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
    console.error('Unexpected error syncing session:', error);
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
