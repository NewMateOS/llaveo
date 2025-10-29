-- Script simple para hacer administrador a gestion@llaveo.pro
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Actualizar el rol del usuario gestion@llaveo.pro a administrador
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'gestion@llaveo.pro'
);

-- Si el perfil no existe todavía, crearlo
INSERT INTO public.profiles (id, full_name, role)
SELECT 
  id,
  'Gestión LLAVEO',
  'admin'
FROM auth.users
WHERE email = 'gestion@llaveo.pro'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.users.id
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verificar el resultado
SELECT 
  u.email,
  p.role,
  p.full_name,
  CASE 
    WHEN p.role = 'admin' THEN '✅ Es administrador'
    ELSE '❌ No es administrador'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'gestion@llaveo.pro';

