-- Política para permitir que los usuarios creen su propio perfil
-- Esto resuelve el problema cuando usuarios de OAuth (Google) se registran
-- pero no tienen un perfil creado automáticamente

DROP POLICY IF EXISTS "users can create own profile" ON public.profiles;

CREATE POLICY "users can create own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- También podemos agregar una política para UPDATE del propio perfil si es necesario
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;

CREATE POLICY "users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

