-- Tipos ENUM
CREATE TYPE fichas_estado_enum AS ENUM ('activa', 'invalida', 'eliminada', 'baja');
CREATE TYPE notificacion_tipo_enum AS ENUM ('reporte_semanal', 'sync_manual', 'alerta_sistema');

-- Trigger function updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Tabla: fichas
CREATE TABLE fichas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id VARCHAR(50) UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(200),
    acuerdo VARCHAR(10) NOT NULL,
    proveedor VARCHAR(200),
    estado fichas_estado_enum NOT NULL DEFAULT 'activa',
    precio_oficial NUMERIC(12,2),
    url_ficha TEXT,
    datos_raw JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_fichas_acuerdo ON fichas (acuerdo);
CREATE INDEX idx_fichas_estado ON fichas (estado);
CREATE INDEX idx_fichas_marca ON fichas (marca);
CREATE INDEX idx_fichas_marca_lower ON fichas (LOWER(marca));

CREATE TRIGGER set_fichas_updated_at
BEFORE UPDATE ON fichas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Tabla: historial_fichas
CREATE TABLE historial_fichas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_id UUID NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
    estado_anterior fichas_estado_enum,
    estado_nuevo fichas_estado_enum NOT NULL,
    motivo VARCHAR(100),
    metadata_diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100)
);

CREATE INDEX idx_hist_fichas_id ON historial_fichas (ficha_id);
CREATE INDEX idx_hist_created_desc ON historial_fichas (created_at DESC);

-- 3. Tabla: estimaciones_marca
CREATE TABLE estimaciones_marca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca VARCHAR(100) UNIQUE NOT NULL,
    precio_base NUMERIC(12,2),
    precio_min NUMERIC(12,2),
    precio_max NUMERIC(12,2),
    fuente VARCHAR(200),
    notas TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estimaciones_marca_lower ON estimaciones_marca (LOWER(marca));

CREATE TRIGGER set_est_updated_at
BEFORE UPDATE ON estimaciones_marca
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Tabla: reportes_semanales
CREATE TABLE reportes_semanales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semana_inicio DATE NOT NULL,
    semana_fin DATE NOT NULL,
    total_fichas INTEGER,
    fichas_nuevas INTEGER,
    fichas_dadas_baja INTEGER,
    fichas_invalidadas INTEGER,
    resumen_por_marca JSONB,
    webhook_enviado BOOLEAN NOT NULL DEFAULT false,
    webhook_enviado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla: notificaciones
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo notificacion_tipo_enum NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    cuerpo TEXT,
    leida BOOLEAN NOT NULL DEFAULT false,
    reporte_id UUID REFERENCES reportes_semanales(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_leida_created_desc ON notificaciones (leida, created_at DESC);
