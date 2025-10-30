-- Corrección: Políticas RLS para la tabla 'inquiries'
-- Fecha: 2025-01-XX
-- Descripción: Permite que usuarios anónimos inserten consultas y que admins/agents las vean

-- Primero, eliminar políticas existentes si hay problemas
DO $$ 
BEGIN
    -- Eliminar todas las políticas existentes para empezar limpio
    DROP POLICY IF EXISTS "Allow public to insert inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow admins and agents to read inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow users to read own inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow admins and agents to update inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow admins and agents to delete inquiries" ON inquiries;
END $$;

-- Asegurarse de que RLS está habilitado
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir que cualquier usuario (incluso anónimo) pueda INSERTAR consultas
-- Esta es la política CRÍTICA que permite que el formulario público funcione
CREATE POLICY "Allow public to insert inquiries"
ON inquiries
FOR INSERT
TO public -- 'public' incluye usuarios anónimos y autenticados
WITH CHECK (true); -- Permitir cualquier inserción

-- Política 2: Permitir que usuarios autenticados con rol admin o agent puedan LEER todas las consultas
CREATE POLICY "Allow admins and agents to read inquiries"
ON inquiries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'agent')
  )
);

-- Política 3 (Opcional): Permitir que usuarios autenticados puedan LEER sus propias consultas por email
CREATE POLICY "Allow users to read own inquiries"
ON inquiries
FOR SELECT
TO authenticated
USING (
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Política 4: Permitir que admins y agents puedan ACTUALIZAR consultas
CREATE POLICY "Allow admins and agents to update inquiries"
ON inquiries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'agent')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'agent')
  )
);

-- Política 5: Permitir que admins y agents puedan ELIMINAR consultas
CREATE POLICY "Allow admins and agents to delete inquiries"
ON inquiries
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'agent')
  )
);
