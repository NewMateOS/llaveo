-- Script para hacer administrador al usuario gestion@llaveo.pro
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Primero, buscar el ID del usuario por email
DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Buscar el usuario por email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'gestion@llaveo.pro';

  IF user_uuid IS NULL THEN
    RAISE NOTICE 'Usuario gestion@llaveo.pro no encontrado en auth.users';
    RAISE NOTICE 'El usuario debe existir primero (registrarse o hacer login con Google)';
  ELSE
    RAISE NOTICE 'Usuario encontrado con ID: %', user_uuid;
    
    -- Verificar si el perfil existe
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid) THEN
      -- Actualizar el perfil existente a admin
      UPDATE public.profiles
      SET role = 'admin'
      WHERE id = user_uuid;
      
      RAISE NOTICE 'Perfil actualizado a administrador exitosamente';
    ELSE
      -- Crear el perfil con rol de administrador
      INSERT INTO public.profiles (id, full_name, role)
      VALUES (user_uuid, 'Gestión LLAVEO', 'admin')
      ON CONFLICT (id) DO UPDATE SET role = 'admin';
      
      RAISE NOTICE 'Perfil de administrador creado exitosamente';
    END IF;
  END IF;
END $$;

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

