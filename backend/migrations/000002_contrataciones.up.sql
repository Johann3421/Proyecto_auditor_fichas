-- Tabla de contrataciones (datos de PeruCompras)
CREATE TABLE IF NOT EXISTS contrataciones (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    anio          INTEGER       NOT NULL,
    mes           INTEGER       NOT NULL CHECK (mes BETWEEN 1 AND 12),
    departamento  VARCHAR(100),
    catalogo      VARCHAR(250),
    tipo_compra   VARCHAR(100),
    acuerdo_marco VARCHAR(100),
    nro_ordenes   INTEGER       NOT NULL DEFAULT 0,
    monto         NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cont_anio_mes    ON contrataciones(anio, mes);
CREATE INDEX IF NOT EXISTS idx_cont_depto       ON contrataciones(departamento);
CREATE INDEX IF NOT EXISTS idx_cont_catalogo    ON contrataciones(catalogo);
CREATE INDEX IF NOT EXISTS idx_cont_tipo_compra ON contrataciones(tipo_compra);
CREATE INDEX IF NOT EXISTS idx_cont_acuerdo     ON contrataciones(acuerdo_marco);
