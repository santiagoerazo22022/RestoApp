-- ============================================
-- SCHEMA DE BASE DE DATOS PARA RESTOAPP
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- https://app.supabase.com/project/_/sql

-- ============================================
-- 1. TABLA DE USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('mozo', 'cocina', 'caja')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_role ON usuarios(role);

-- ============================================
-- 2. TABLA DE MESAS
-- ============================================
CREATE TABLE IF NOT EXISTS mesas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero INTEGER UNIQUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'libre' CHECK (estado IN ('libre', 'ocupada')),
    capacidad INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por número
CREATE INDEX idx_mesas_numero ON mesas(numero);
CREATE INDEX idx_mesas_estado ON mesas(estado);

-- ============================================
-- 3. TABLA DE ITEMS DEL MENÚ
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    disponible BOOLEAN DEFAULT true,
    imagen_url TEXT,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas
CREATE INDEX idx_menu_items_categoria ON menu_items(categoria);
CREATE INDEX idx_menu_items_disponible ON menu_items(disponible);

-- ============================================
-- 4. TABLA DE PEDIDOS
-- ============================================
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mesa_id UUID REFERENCES mesas(id) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'preparando', 'listo', 'finalizado')),
    total DECIMAL(10, 2) DEFAULT 0,
    usuario_mozo_id UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalizado_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_pedidos_mesa_id ON pedidos(mesa_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at DESC);

-- ============================================
-- 5. TABLA DE ITEMS DE PEDIDO
-- ============================================
CREATE TABLE IF NOT EXISTS pedido_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    nombre VARCHAR(100) NOT NULL, -- Desnormalizado para histórico
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX idx_pedido_items_menu_item_id ON pedido_items(menu_item_id);

-- ============================================
-- 6. TABLA DE VENTAS (para analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id UUID REFERENCES pedidos(id),
    mesa_numero INTEGER NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    num_items INTEGER NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dia DATE DEFAULT CURRENT_DATE,
    usuario_caja_id UUID REFERENCES usuarios(id),
    items_json JSONB, -- Snapshot de los items vendidos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para analytics
CREATE INDEX idx_ventas_dia ON ventas(dia DESC);
CREATE INDEX idx_ventas_fecha_hora ON ventas(fecha_hora DESC);
CREATE INDEX idx_ventas_mesa_numero ON ventas(mesa_numero);

-- ============================================
-- 7. TABLA DE CIERRES DE CAJA
-- ============================================
CREATE TABLE IF NOT EXISTS cierres_caja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE UNIQUE NOT NULL,
    total_ventas DECIMAL(10, 2) NOT NULL,
    num_ordenes INTEGER NOT NULL,
    num_items INTEGER NOT NULL,
    ticket_promedio DECIMAL(10, 2),
    usuario_id UUID REFERENCES usuarios(id),
    detalles_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX idx_cierres_caja_fecha ON cierres_caja(fecha DESC);

-- ============================================
-- 8. FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mesas_updated_at BEFORE UPDATE ON mesas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. FUNCIÓN PARA CALCULAR TOTAL DEL PEDIDO
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pedidos
    SET total = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM pedido_items
        WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    )
    WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar total automáticamente
CREATE TRIGGER trigger_actualizar_total_pedido
    AFTER INSERT OR UPDATE OR DELETE ON pedido_items
    FOR EACH ROW EXECUTE FUNCTION actualizar_total_pedido();

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios (solo lectura para autenticación)
CREATE POLICY "Usuarios pueden leer todos los usuarios" ON usuarios
    FOR SELECT USING (true);

-- Políticas para mesas (todos pueden leer, solo mozo/caja pueden modificar)
CREATE POLICY "Todos pueden leer mesas" ON mesas
    FOR SELECT USING (true);

CREATE POLICY "Todos pueden actualizar mesas" ON mesas
    FOR UPDATE USING (true);

CREATE POLICY "Todos pueden insertar mesas" ON mesas
    FOR INSERT WITH CHECK (true);

-- Políticas para menu_items
CREATE POLICY "Todos pueden leer menu_items" ON menu_items
    FOR SELECT USING (true);

CREATE POLICY "Todos pueden modificar menu_items" ON menu_items
    FOR ALL USING (true);

-- Políticas para pedidos (todos pueden ver y modificar)
CREATE POLICY "Todos pueden leer pedidos" ON pedidos
    FOR SELECT USING (true);

CREATE POLICY "Todos pueden crear pedidos" ON pedidos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar pedidos" ON pedidos
    FOR UPDATE USING (true);

CREATE POLICY "Todos pueden eliminar pedidos" ON pedidos
    FOR DELETE USING (true);

-- Políticas para pedido_items
CREATE POLICY "Todos pueden leer pedido_items" ON pedido_items
    FOR SELECT USING (true);

CREATE POLICY "Todos pueden crear pedido_items" ON pedido_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar pedido_items" ON pedido_items
    FOR UPDATE USING (true);

CREATE POLICY "Todos pueden eliminar pedido_items" ON pedido_items
    FOR DELETE USING (true);

-- Políticas para ventas
CREATE POLICY "Todos pueden leer ventas" ON ventas
    FOR SELECT USING (true);

CREATE POLICY "Todos pueden crear ventas" ON ventas
    FOR INSERT WITH CHECK (true);

-- Políticas para cierres_caja
CREATE POLICY "Todos pueden leer cierres_caja" ON cierres_caja
    FOR SELECT USING (true);

CREATE POLICY "Todos pueden crear cierres_caja" ON cierres_caja
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 11. DATOS INICIALES
-- ============================================

-- Insertar mesas (12 mesas)
INSERT INTO mesas (numero, estado, capacidad) VALUES
    (1, 'libre', 4),
    (2, 'libre', 4),
    (3, 'libre', 2),
    (4, 'libre', 4),
    (5, 'libre', 6),
    (6, 'libre', 4),
    (7, 'libre', 2),
    (8, 'libre', 4),
    (9, 'libre', 6),
    (10, 'libre', 4),
    (11, 'libre', 2),
    (12, 'libre', 8)
ON CONFLICT (numero) DO NOTHING;

-- Insertar usuarios por defecto
-- NOTA: En producción, usa bcrypt o similar para hashear passwords
-- Por simplicidad, guardamos el hash simple (deberías mejorarlo)
INSERT INTO usuarios (username, password_hash, role) VALUES
    ('mozo', '1234', 'mozo'),
    ('cocina', '1234', 'cocina'),
    ('caja', '1234', 'caja')
ON CONFLICT (username) DO NOTHING;

-- Insertar menú inicial
INSERT INTO menu_items (nombre, categoria, precio) VALUES
    -- Entradas
    ('Empanadas (3 unidades)', 'Entradas', 800),
    ('Provoleta', 'Entradas', 1200),
    ('Tabla de Fiambres', 'Entradas', 1500),
    
    -- Platos Principales
    ('Bife de Chorizo', 'Platos Principales', 3500),
    ('Milanesa Napolitana', 'Platos Principales', 2800),
    ('Pasta con Salsa', 'Platos Principales', 2200),
    ('Pollo al Horno', 'Platos Principales', 2500),
    
    -- Bebidas
    ('Gaseosa', 'Bebidas', 500),
    ('Agua Mineral', 'Bebidas', 400),
    ('Cerveza', 'Bebidas', 700),
    ('Vino (Copa)', 'Bebidas', 900),
    
    -- Postres
    ('Flan Casero', 'Postres', 800),
    ('Helado', 'Postres', 900),
    ('Tiramisu', 'Postres', 1100)
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. VISTAS ÚTILES PARA ANALYTICS
-- ============================================

-- Vista de ventas del día actual
CREATE OR REPLACE VIEW ventas_hoy AS
SELECT 
    v.*,
    TO_CHAR(v.fecha_hora, 'HH24:MI') as hora
FROM ventas v
WHERE v.dia = CURRENT_DATE
ORDER BY v.fecha_hora DESC;

-- Vista de estadísticas del día
CREATE OR REPLACE VIEW estadisticas_dia AS
SELECT 
    CURRENT_DATE as fecha,
    COUNT(*) as num_ventas,
    COALESCE(SUM(total), 0) as total_ventas,
    COALESCE(SUM(num_items), 0) as total_items,
    COALESCE(AVG(total), 0) as ticket_promedio
FROM ventas
WHERE dia = CURRENT_DATE;

-- Vista de pedidos activos con detalles
CREATE OR REPLACE VIEW pedidos_activos AS
SELECT 
    p.id,
    p.mesa_id,
    m.numero as mesa_numero,
    p.estado,
    p.total,
    p.created_at,
    p.updated_at,
    COUNT(pi.id) as num_items
FROM pedidos p
JOIN mesas m ON p.mesa_id = m.id
LEFT JOIN pedido_items pi ON pi.pedido_id = p.id
WHERE p.estado != 'finalizado'
GROUP BY p.id, m.numero
ORDER BY p.created_at DESC;

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- Verificación: Listar todas las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
