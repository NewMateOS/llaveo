import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

// En desarrollo, no usar adaptador de Netlify (requiere Deno)
// Solo usarlo cuando se construye para producción
const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  output: 'server',
  adapter: isProd ? netlify() : undefined,
  integrations: [tailwind(), react()],
});
