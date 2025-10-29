-- Políticas simplificadas para evitar recursión infinita
-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "admin lee perfiles" ON public.profiles;
DROP POLICY IF EXISTS "admin edita perfiles" ON public.profiles;
DROP POLICY IF EXISTS "agent read own" ON public.properties;
DROP POLICY IF EXISTS "agent create" ON public.properties;
DROP POLICY IF EXISTS "agent update own" ON public.properties;
DROP POLICY IF EXISTS "agent delete own" ON public.properties;
DROP POLICY IF EXISTS "admin all" ON public.properties;
DROP POLICY IF EXISTS "write images agent own" ON public.property_images;
DROP POLICY IF EXISTS "admin read inquiries" ON public.inquiries;

-- Crear políticas simplificadas
-- Profiles: solo lectura propia
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Properties: lectura pública para activas
CREATE POLICY "properties_select_public" ON public.properties FOR SELECT USING (is_active = true);

-- Images: lectura pública
CREATE POLICY "images_select_public" ON public.property_images FOR SELECT USING (true);

-- Favorites: gestión propia
CREATE POLICY "favorites_own" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inquiries: inserción pública, lectura solo para autenticados
CREATE POLICY "inquiries_insert_public" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiries_select_auth" ON public.inquiries FOR SELECT USING (auth.uid() IS NOT NULL);
