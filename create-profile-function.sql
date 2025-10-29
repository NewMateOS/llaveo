-- Función SQL para crear el perfil automáticamente (se puede llamar desde el código)
-- Esta función tiene permisos SECURITY DEFINER para poder crear perfiles incluso con RLS activo

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_email text,
  user_full_name text DEFAULT NULL,
  user_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar si el perfil ya existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    -- Crear el perfil
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
      user_id,
      user_full_name OR split_part(user_email, '@', 1),
      user_avatar_url,
      'viewer'
    );
  END IF;
END;
$$;

-- Conceder permisos para que los usuarios autenticados puedan llamar esta función
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text, text) TO anon;

