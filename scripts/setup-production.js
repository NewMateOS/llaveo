#!/usr/bin/env node

/**
 * Script de configuración para producción
 * Ejecutar con: node scripts/setup-production.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Configurando LLaveo para producción...\n');

// Verificar si existe .env
const envPath = path.join(projectRoot, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ Archivo .env no encontrado. Copiando desde env.example...');
  fs.copyFileSync(path.join(projectRoot, 'env.example'), envPath);
  console.log('✅ Archivo .env creado. Por favor configura las variables de entorno.');
}

// Crear directorio de logs si no existe
const logsDir = path.join(projectRoot, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Directorio de logs creado');
}

// Crear archivo de configuración de producción
const prodConfig = {
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 100,
      skipSuccessfulRequests: false
    },
    cors: {
      origin: process.env.PUBLIC_APP_URL || 'https://yourdomain.com',
      credentials: true
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"]
        }
      }
    }
  },
  database: {
    connectionPool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  },
  logging: {
    level: 'info',
    format: 'json',
    file: {
      enabled: true,
      path: './logs/app.log',
      maxSize: '10m',
      maxFiles: 5
    }
  }
};

fs.writeFileSync(
  path.join(projectRoot, 'production.config.json'),
  JSON.stringify(prodConfig, null, 2)
);

console.log('✅ Archivo de configuración de producción creado');

// Crear archivo de Docker para producción mejorado
const dockerfileProd = `# Dockerfile para producción
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro

# Copiar archivos necesarios
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

# Configurar seguridad
RUN apk add --no-cache dumb-init
RUN chown -R astro:nodejs /app

USER astro

EXPOSE 4321

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:4321/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server/entry.mjs"]
`;

fs.writeFileSync(path.join(projectRoot, 'Dockerfile.prod.secure'), dockerfileProd);
console.log('✅ Dockerfile de producción seguro creado');

// Crear script de health check
const healthCheckScript = `#!/bin/bash
# Health check script para producción

HEALTH_URL="http://localhost:4321/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in \$(seq 1 \$MAX_RETRIES); do
  if curl -f \$HEALTH_URL > /dev/null 2>&1; then
    echo "✅ Health check passed"
    exit 0
  fi
  
  if [ \$i -lt \$MAX_RETRIES ]; then
    echo "⏳ Health check failed, retrying in \$RETRY_DELAY seconds... (\$i/\$MAX_RETRIES)"
    sleep \$RETRY_DELAY
  fi
done

echo "❌ Health check failed after \$MAX_RETRIES attempts"
exit 1
`;

fs.writeFileSync(path.join(projectRoot, 'scripts/health-check.sh'), healthCheckScript);
fs.chmodSync(path.join(projectRoot, 'scripts/health-check.sh'), '755');
console.log('✅ Script de health check creado');

// Crear archivo de configuración de nginx
const nginxConfig = `# Configuración de Nginx para LLaveo
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # Certificados SSL (configurar con Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
    
    # Proxy a la aplicación
    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Rate limiting para APIs
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Rate limiting para login
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Archivos estáticos
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:4321;
    }
}
`;

fs.writeFileSync(path.join(projectRoot, 'nginx.conf'), nginxConfig);
console.log('✅ Configuración de Nginx creada');

console.log('\n🎉 Configuración de producción completada!');
console.log('\n📋 Próximos pasos:');
console.log('1. Configurar variables de entorno en .env');
console.log('2. Configurar dominio en nginx.conf');
console.log('3. Configurar certificados SSL');
console.log('4. Ejecutar: docker build -f Dockerfile.prod.secure -t llaveo:prod .');
console.log('5. Ejecutar: docker run -d -p 4321:4321 --env-file .env llaveo:prod');
console.log('\n🔒 Recuerda configurar todas las variables de seguridad antes de desplegar!');
