import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

// Determinar qué adaptador usar
// En desarrollo no se usa adaptador (Astro tiene servidor integrado)
// Para Docker/Node.js usar adaptador de Node (solo en producción)
// Para Netlify usar adaptador de Netlify
const useDocker = process.env.USE_DOCKER === 'true' || process.env.DOCKER === 'true';
const isProd = process.env.NODE_ENV === 'production';

// En desarrollo siempre sin adaptador
let adapter = undefined;

// Solo en producción usar adaptador
if (isProd) {
  if (useDocker) {
    // Para Docker, usar adaptador de Node
    adapter = node({ mode: 'standalone' });
  } else {
    // Para Netlify
    adapter = netlify();
  }
}

export default defineConfig({
  output: 'server',
  adapter: adapter,
  integrations: [tailwind(), react()],
  server: {
    host: true, // Escuchar en todas las interfaces (necesario para Docker)
    port: 4321,
  },
});
