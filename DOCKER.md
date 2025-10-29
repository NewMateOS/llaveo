# 🐳 Guía de Docker para LLaveo

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con tus variables:

```bash
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
PUBLIC_BRAND_NAME=LLAVE
PUBLIC_BRAND_COLOR=#E2905C
PUBLIC_ALLOWED_GOOGLE_DOMAIN=tudominio.com
PUBLIC_APP_URL=http://localhost:4321
```

### 2. Instalar Dependencias (si aún no lo has hecho)

Primero instala el adaptador de Node.js:

```bash
npm install
```

### 3. Construir y Ejecutar con Docker Compose

#### Para Producción:

```bash
# Construir y ejecutar en modo detached
docker-compose -f docker-compose.preview.yml up --build -d

# Ver logs
docker-compose -f docker-compose.preview.yml logs -f

# Detener
docker-compose -f docker-compose.preview.yml down
```

O usar los scripts de npm:

```bash
# Ejecutar en producción
npm run docker:prod

# Ver logs
npm run docker:logs

# Detener
npm run docker:down
```

#### Para Desarrollo:

```bash
# Ejecutar en modo desarrollo
docker-compose up --build

# En otra terminal, ver logs
docker-compose logs -f
```

## 🔧 Comandos Útiles

### Construir solo la imagen:

```bash
docker build -f Dockerfile.prod \
  --build-arg PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL} \
  --build-arg PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY} \
  --build-arg PUBLIC_BRAND_NAME=${PUBLIC_BRAND_NAME} \
  --build-arg PUBLIC_BRAND_COLOR=${PUBLIC_BRAND_COLOR} \
  -t llaveo:prod .
```

### Ejecutar contenedor manualmente:

```bash
docker run -d \
  --name llaveo \
  -p 4321:4321 \
  --env-file .env \
  llaveo:prod
```

### Verificar que está funcionando:

```bash
# Health check
curl http://localhost:4321/health

# Ver logs
docker logs -f llaveo
```

### Acceder al contenedor:

```bash
docker exec -it llaveo sh
```

## 📋 Verificación

Una vez que el contenedor esté ejecutándose, puedes verificar:

1. **Health Check**: http://localhost:4321/health
2. **Configuración de Seguridad**: http://localhost:4321/security-config
3. **Aplicación Principal**: http://localhost:4321
4. **Panel de Administración**: http://localhost:4321/admin

## 🛠️ Solución de Problemas

### El contenedor no inicia

1. Verifica las variables de entorno:
```bash
docker-compose -rello.yml config
```

2. Revisa los logs:
```bash
docker-compose -f docker-compose.preview.yml logs
```

### Error "Port already in use"

Cambia el puerto en `docker-compose.preview.yml`:
```yaml
ports:
  - "4322:4321"  # Cambia 4321 a otro puerto
```

### Error "Module not found"

Reconstruye la imagen sin caché:
```bash
docker-compose -f docker-compose.preview.yml build --no-cache
```

### El health check falla

Verifica que el servidor esté escuchando:
```bash
docker exec llave-web-preview wget -O- http://localhost:4321/health
```

## 🔒 Seguridad

El Dockerfile está configurado para:
- ✅ Ejecutar como usuario no-root
- ✅ Usar multi-stage build para imagen más pequeña
- ✅ Health checks automáticos
- ✅ Variables de entorno seguras

## 📝 Notas

- El adaptador de Node.js se activa automáticamente cuando `USE_DOCKER=true`
- El servidor escucha en `0.0.0.0:4321` para aceptar conexiones externas
- Las variables de entorno se pasan tanto en build-time como runtime
- El health check verifica `/health` cada 30 segundos

## 🚀 Despliegue en Producción

Para producción, considera:

1. Usar un proxy reverso (Nginx/Traefik) con SSL
2. Configurar variables de entorno de forma segura
3. Usar secrets de Docker o un gestor de secretos
4. Configurar backup de la base de datos
5. Monitoreo y logging centralizado

---

**Última actualización**: 29 de octubre de 2025