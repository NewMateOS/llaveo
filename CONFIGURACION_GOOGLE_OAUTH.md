# Configuración de Google OAuth para LLaveo

## ✅ Pasos para habilitar Google OAuth en Supabase

### 1. En Supabase Dashboard

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Navega a **Authentication** → **Providers**
3. Busca **Google** en la lista
4. **Habilita** el toggle de Google
5. Se mostrarán campos para **Client ID** y **Client Secret**

### 2. Crear credenciales en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
5. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo de aplicación: **External**
   - Nombre de la app: **LLaveo**
   - Email de soporte: Tu email
   - Guarda y continúa
6. Configura las credenciales:
   - **Application type**: `Web application`
   - **Name**: `LLaveo Supabase Auth`
   - **Authorized redirect URIs**: 
     ```
     https://TU-PROYECTO.supabase.co/auth/v1/callback
     ```
     ⚠️ **IMPORTANTE**: Reemplaza `TU-PROYECTO` con tu ID de proyecto de Supabase
7. Haz clic en **Create**
8. **Copia** el **Client ID** y **Client Secret**

### 3. Configurar en Supabase

1. En Supabase, ve a **Authentication** → **Providers** → **Google**
2. Pega el **Client ID** y **Client Secret** de Google
3. Guarda la configuración

### 4. Configurar URLs en Supabase

1. Ve a **Authentication** → **URL Configuration**
2. Configura:
   - **Site URL**: `https://tu-sitio.netlify.app`
   - **Redirect URLs**: Añade:
     ```
     https://tu-sitio.netlify.app/auth/callback
     https://tu-sitio.netlify.app/**
     ```

### 5. Verificar variables de entorno en Netlify

Asegúrate de que tienes configuradas en Netlify:

```
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
PUBLIC_ALLOWED_GOOGLE_DOMAIN=tu-dominio.com (opcional)
```

## 🔍 Cómo encontrar tu URL de Supabase

Tu URL de callback de Supabase tiene este formato:
```
https://[PROJECT_ID].supabase.co/auth/v1/callback
```

Para encontrarla:
1. Ve a tu proyecto en Supabase
2. Ve a **Settings** → **API**
3. La **Project URL** es la que necesitas
4. Añade `/auth/v1/callback` al final

## ✅ Verificación

Una vez configurado:
1. Recarga tu sitio en Netlify
2. Intenta hacer login con Google
3. Deberías ser redirigido a Google para autorizar
4. Después serás redirigido de vuelta a tu sitio

## 🐛 Troubleshooting

### Error: "Unsupported provider"
- Verifica que Google está **habilitado** en Supabase
- Confirma que las credenciales están correctas

### Error: "Redirect URI mismatch"
- Verifica que la URL en Google Cloud Console coincide exactamente
- Debe ser: `https://PROJECT_ID.supabase.co/auth/v1/callback`

### Error: "Site URL not allowed"
- Verifica las Redirect URLs en Supabase
- Añade tu dominio de Netlify

## 📝 Notas

- Si cambias el dominio de tu sitio, actualiza las URLs en Supabase
- El `PUBLIC_ALLOWED_GOOGLE_DOMAIN` es opcional, se usa para restringir el dominio de Google
- Para desarrollo local, añade `http://localhost:4321/auth/callback` a las Redirect URLs

