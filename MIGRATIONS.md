# Migraciones de Base de Datos

Este documento contiene las instrucciones para aplicar migraciones de base de datos a Supabase.

## Agregar columna 'status' a la tabla 'inquiries'

### Método 1: Desde el Panel de Supabase (Recomendado)

1. **Accede al Panel de Supabase**:
   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Abre el Editor SQL**:
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Ejecuta el siguiente SQL**:
```sql
-- Agregar columna 'status' a la tabla 'inquiries'
ALTER TABLE inquiries 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;

-- Actualizar consultas existentes (si las hay)
UPDATE inquiries SET status = 'pending' WHERE status IS NULL;

-- Agregar comentario
COMMENT ON COLUMN inquiries.status IS 'Estado de la consulta: pending (pendiente) o responded (respondida)';

-- Crear índice para mejorar consultas por estado
CREATE INDEX idx_inquiries_status ON inquiries(status);
```

4. **Verifica la migración**:
   - Ve a "Table Editor" > "inquiries"
   - Confirma que la columna `status` aparece con el valor por defecto `pending`

### Método 2: Usando Supabase CLI (Local)

Si estás usando Supabase localmente:

```bash
# Aplicar la migración
supabase db reset

# O ejecutar directamente la migración
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/add_status_to_inquiries.sql
```

### Método 3: Desde la Línea de Comandos (PostgreSQL directo)

Si tienes acceso directo a PostgreSQL:

```bash
psql -h [TU_HOST] -U postgres -d postgres -f supabase/migrations/add_status_to_inquiries.sql
```

## Estructura de la columna 'status'

- **Tipo**: VARCHAR(20)
- **Valor por defecto**: 'pending'
- **NOT NULL**: Sí
- **Valores posibles**:
  - `pending`: Consulta pendiente (por defecto)
  - `responded`: Consulta respondida

## Después de agregar la columna

Una vez agregada la columna, puedes actualizar el código para usarla:

1. **En `/api/inquiry.ts`**: Ya está configurado para usar `status: 'pending'`
2. **En `inquiries.jsx`**: El código ya está preparado para usar la columna `status`

## Configurar Políticas RLS para 'inquiries'

### El problema: "new row violates row-level security policy"

Este error aparece cuando RLS está habilitado pero no hay políticas que permitan insertar datos.

### Solución 1: Limpiar y recrear políticas RLS (Recomendado si hay problemas)

1. **Abre el SQL Editor** en Supabase Dashboard
2. **Ejecuta el siguiente SQL** (también disponible en `supabase/migrations/fix_rls_policies_inquiries.sql`):

```sql
-- Primero, eliminar políticas existentes si hay problemas
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public to insert inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow admins and agents to read inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow users to read own inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow admins and agents to update inquiries" ON inquiries;
    DROP POLICY IF EXISTS "Allow admins and agents to delete inquiries" ON inquiries;
END $$;

-- Asegurarse de que RLS está habilitado
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Política CRÍTICA: Permitir que usuarios anónimos inserten consultas
CREATE POLICY "Allow public to insert inquiries"
ON inquiries
FOR INSERT
TO public
WITH CHECK (true);

-- Política 2: Permitir que admins y agents lean consultas
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

-- Política 3: Permitir que admins y agents actualicen consultas
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

-- Política 4: Permitir que admins y agents eliminen consultas
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
```

### Solución 2: Crear políticas RLS desde cero

1. **Abre el SQL Editor** en Supabase Dashboard
2. **Ejecuta el siguiente SQL** (también disponible en `supabase/migrations/add_rls_policies_inquiries.sql`):

```sql
-- Habilitar RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir que usuarios anónimos inserten consultas (para formulario público)
DROP POLICY IF EXISTS "Allow public to insert inquiries" ON inquiries;
CREATE POLICY "Allow public to insert inquiries"
ON inquiries
FOR INSERT
TO public
WITH CHECK (true);

-- Política 2: Permitir que admins y agents lean todas las consultas
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

-- Política 3: Permitir que admins y agents actualicen consultas
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

-- Política 4: Permitir que admins y agents eliminen consultas
DROP POLICY IF EXISTS "Allow admins and agents to delete inquiries" ON inquiries;
STMATE POLICY "Allow admins and agents to delete inquiries"
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
```

### Alternativa: Usar Service Role Key (Recomendado para producción)

Si prefieres no usar RLS para operaciones del servidor, puedes usar la `SUPABASE_SERVICE_ROLE_KEY`:

1. **Agrega la variable de entorno**:
   - En tu `.env`: `SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui`
   - Obtén el service_role key desde: Supabase Dashboard > Settings > API > service_role key

2. **El código ya está preparado** para usar service_role si está disponible.

**Nota**: El service_role key bypass RLS completamente, así que úsalo solo en el servidor, nunca en el cliente.

