-- Reportes Queries

-- name: GetCatalogosSummary
-- Suma de ordenes y monto agrupado por catalogo, con filtros opcionales
SELECT
    catalogo,
    SUM(nro_ordenes)::INTEGER                    AS ordenes,
    SUM(monto)                                   AS monto,
    ROUND(SUM(monto) * 100.0 / SUM(SUM(monto)) OVER (), 2) AS percent
FROM contrataciones
WHERE 1=1
  AND ($1 = '' OR anio::TEXT = $1)
  AND ($2 = '' OR CEIL(mes::NUMERIC / 3)::TEXT = $2)
  AND ($3 = '' OR mes::TEXT = $3)
  AND ($4 = '' OR departamento ILIKE $4)
  AND ($5 = '' OR catalogo ILIKE $5)
  AND ($6 = '' OR acuerdo_marco ILIKE $6)
  AND ($7 = '' OR tipo_compra ILIKE $7)
GROUP BY catalogo
ORDER BY monto DESC;

-- name: GetMonthlySummary
-- Ordenes y monto por mes
SELECT
    TO_CHAR(MAKE_DATE(anio, mes, 1), 'TMMonth') AS mes,
    SUM(nro_ordenes)::FLOAT                     AS ordenes,
    SUM(monto)                                  AS monto
FROM contrataciones
WHERE 1=1
  AND ($1 = '' OR anio::TEXT = $1)
  AND ($2 = '' OR departamento ILIKE $2)
  AND ($3 = '' OR catalogo ILIKE $3)
  AND ($4 = '' OR tipo_compra ILIKE $4)
GROUP BY anio, mes
ORDER BY anio, mes;

-- name: GetDepartamentosSummary
-- Ordenes y monto agrupado por departamento
SELECT
    departamento                AS nombre,
    SUM(nro_ordenes)::INTEGER   AS ordenes,
    SUM(monto)                  AS monto
FROM contrataciones
WHERE 1=1
  AND ($1 = '' OR anio::TEXT = $1)
  AND ($2 = '' OR CEIL(mes::NUMERIC / 3)::TEXT = $2)
  AND ($3 = '' OR mes::TEXT = $3)
GROUP BY departamento
ORDER BY monto DESC;

-- name: GetTipoCompraSummary
-- Monto por tipo de compra
SELECT
    tipo_compra AS tipo,
    SUM(monto)  AS monto
FROM contrataciones
WHERE 1=1
  AND ($1 = '' OR anio::TEXT = $1)
  AND ($2 = '' OR departamento ILIKE $2)
GROUP BY tipo_compra
ORDER BY monto DESC;

-- name: GetFilterOptions
-- Opciones disponibles para los filtros del dashboard
SELECT
    ARRAY_AGG(DISTINCT anio::TEXT ORDER BY anio::TEXT DESC) FILTER (WHERE anio IS NOT NULL)             AS anios,
    ARRAY_AGG(DISTINCT departamento ORDER BY departamento)  FILTER (WHERE departamento IS NOT NULL)      AS departamentos,
    ARRAY_AGG(DISTINCT catalogo ORDER BY catalogo)          FILTER (WHERE catalogo IS NOT NULL)          AS catalogos,
    ARRAY_AGG(DISTINCT acuerdo_marco ORDER BY acuerdo_marco) FILTER (WHERE acuerdo_marco IS NOT NULL)    AS acuerdos_marco,
    ARRAY_AGG(DISTINCT tipo_compra ORDER BY tipo_compra)    FILTER (WHERE tipo_compra IS NOT NULL)       AS tipos_compra
FROM contrataciones;
