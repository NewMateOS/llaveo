-- Migración: Agregar columna 'status' a la tabla 'inquiries'
-- Fecha: 2025-01-XX
-- Descripción: Agrega una columna 'status' para rastrear el estado de las consultas

-- Agregar la columna 'status' si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'inquiries' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE inquiries 
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;
        
        -- Actualizar las consultas existentes para que tengan 'pending' como estado
        UPDATE inquiries SET status = 'pending' WHERE status IS NULL;
        
        -- Agregar un comentario a la columna para documentación
        COMMENT ON COLUMN inquiries.status IS 'Estado de la consulta: pending (pendiente) o responded (respondida)';
    END IF;
END $$;

-- Opcional: Crear un índice si planeas filtrar por status frecuentemente
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

