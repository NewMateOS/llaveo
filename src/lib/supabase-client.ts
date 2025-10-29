// Cliente singleton de Supabase para el cliente (scripts del lado del cliente)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Obtiene el cliente de Supabase para uso en scripts del lado del cliente.
 * Usa un patrón singleton para evitar múltiples instancias.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    // Detectar entorno
    const isProduction = typeof window !== 'undefined' && 
                         (window.location.protocol === 'https:' || 
                          window.location.hostname !== 'localhost');
    
    // Log información del entorno
    console.log('🔧 [Supabase Client] Inicializando cliente...', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'server',
      isProduction,
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NO CONFIGURADO'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        '❌ [Supabase Client] Variables de entorno NO configuradas!\n',
        '⚠️ Faltan:',
        !supabaseUrl ? '- PUBLIC_SUPABASE_URL' : '',
        !supabaseAnonKey ? '- PUBLIC_SUPABASE_ANON_KEY' : ''
      );
      // Retornar un cliente dummy que fallará en tiempo de ejecución si se usa
      supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { persistSession: false }
      });
    } else {
      const storageAvailable = typeof window !== 'undefined' && window.localStorage;
      
      console.log('🔧 [Supabase Client] Configuración:', {
        url: supabaseUrl,
        keyLength: supabaseAnonKey.length,
        storageAvailable,
        flowType: 'pkce',
        persistSession: true
      });
      
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: storageAvailable ? window.localStorage : undefined,
          storageKey: 'sb-auth-token',
          flowType: 'pkce' // Usar PKCE para mejor seguridad en producción
        },
        global: {
          headers: {
            'x-client-info': `llaveo@${isProduction ? 'prod' : 'dev'}`
          }
        }
      });
      
      // Verificar session existente
      if (storageAvailable) {
        supabaseClient.auth.getSession().then(({ data, error }) => {
          if (error) {
            console.error('❌ [Supabase Client] Error al obtener sesión inicial:', error);
          } else if (data.session) {
            console.log('✅ [Supabase Client] Sesión existente encontrada:', data.session.user.email);
          } else {
            console.log('ℹ️ [Supabase Client] No hay sesión activa');
          }
        });
      }
      
      console.log(`✅ [Supabase Client] Cliente inicializado para ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}:`, 
                   typeof window !== 'undefined' ? window.location.hostname : 'server');
    }
  }

  return supabaseClient;
}

