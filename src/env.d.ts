/// <reference types="astro/client" />

// Extender ImportMetaEnv para variables de entorno personalizadas
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_BRAND_NAME?: string;
  readonly PUBLIC_BRAND_COLOR?: string;
  readonly PUBLIC_ALLOWED_GOOGLE_DOMAIN?: string;
  readonly PROD?: boolean;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    cspNonce?: string;
    security?: {
      isHttps: boolean;
    };
  }
}
