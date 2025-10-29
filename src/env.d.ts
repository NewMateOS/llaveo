/// <reference path="../.astro/types.d.ts" />

// Extender ImportMetaEnv para variables de entorno personalizadas
// Astro automáticamente detecta esta interfaz en src/env.d.ts
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_BRAND_NAME?: string;
  readonly PUBLIC_BRAND_COLOR?: string;
  readonly PUBLIC_ALLOWED_GOOGLE_DOMAIN?: string;
}