export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY deben estar configuradas.');
  }

  return { url, anonKey };
}
