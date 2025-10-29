import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Validar variables de entorno (solo si están ausentes, no fallar al importar)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Crear cliente solo si las credenciales están disponibles
// Esto permite que el módulo se importe sin error si las variables no están configuradas
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : (() => {
      console.warn(
        '⚠️ Variables de entorno de Supabase no configuradas. ' +
        'Por favor, configura PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en tu archivo .env'
      );
      // Retornar un cliente dummy que fallará en tiempo de ejecución si se usa
      return createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { persistSession: false }
      });
    })();
