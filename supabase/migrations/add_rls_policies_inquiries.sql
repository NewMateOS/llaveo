-- Migración: Políticas RLS para la tabla 'inquiries'
-- Fecha: 2025-01-XX
-- Descripción: Permite que usuarios anónimos inserten consultas y que admins/agents las vean

-- Habilitar RLS en la tabla inquiries (si no está ya habilitado)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir que cualquier usuario (incluso anónimo) pueda INSERTAR consultas
-- Esto permite que el formulario público funcione sin autenticación
DROP POLICY IF EXISTS "Allow public to insert inquiries" ON inquiries;
CREATE POLICY "Allow public to insert inquiries"
ON inquiries
FOR INSERT
TO public
WITH CHECK (true);

-- Política 2: Permitir que usuarios autenticados con rol admin o agent puedan LEER todas las consultas
-- Necesitas tener una función helper o verificar el rol en el perfil
DROP POLICY IF EXISTS "Allow admins and agents to read inquiries" ON inquiries;
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

-- Política 3 (Opcional): Permitir que usuarios autenticados puedan LEER sus propias consultas
-- Útil si quieres que los usuarios vean las consultas que ellos enviaron
DROP POLICY IF EXISTS "Allow users to read own inquiries" ON inquiries;
CREATE POLICY "Allow users to read own inquiries"
ON inquiries
FOR SELECT
TO authenticated
USING (
  email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Política 4: Permitir que admins y agents puedan ACTUALIZAR consultas (para marcar como respondidas)
DROP POLICY IF EXISTS "Allow admins and agents to update inquiries" ON inquiries;
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
);

-- Política 5: Permitir que admins y agents puedan ELIMINAR consultas
DROP POLICY IF EXISTS "Allow admins and agents to delete inquiries" ON inquiries;
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

