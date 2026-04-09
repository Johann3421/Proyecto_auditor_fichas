package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/models"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(db *DB) *Repository {
	if db == nil {
		return nil
	}
	return &Repository{pool: db.Pool}
}

func (r *Repository) CreateFicha(ctx context.Context, f *models.Ficha) error {
	query := `
		INSERT INTO fichas (id, ficha_id, nombre, marca, modelo, acuerdo, proveedor, estado, precio_oficial, precio_estimado, url_ficha, datos_raw, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (ficha_id, acuerdo) DO UPDATE 
		SET nombre = $3, marca = $4, estado = $8, updated_at = $14`

	_, err := r.pool.Exec(ctx, query,
		f.ID, f.FichaID, f.Nombre, f.Marca, f.Modelo, f.Acuerdo, f.Proveedor, f.Estado,
		f.PrecioOficial, f.PrecioEstimado, f.UrlFicha, f.DatosRaw, f.CreatedAt, f.UpdatedAt)
	return err
}

func (r *Repository) GetFichas(ctx context.Context) ([]models.Ficha, error) {
	query := `SELECT id, ficha_id, nombre, marca, acuerdo, estado, datos_raw, created_at, updated_at FROM fichas ORDER BY created_at DESC LIMIT 100`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fichas []models.Ficha
	for rows.Next() {
		var f models.Ficha
		if err := rows.Scan(&f.ID, &f.FichaID, &f.Nombre, &f.Marca, &f.Acuerdo, &f.Estado, &f.DatosRaw, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		fichas = append(fichas, f)
	}
	return fichas, nil
}

// GetDashboardData returns aggregated contrataciones data for the BI dashboard.
// Returns empty arrays when the contrataciones table has no data yet.
func (r *Repository) GetDashboardData(ctx context.Context, f models.DashboardFilters) (*models.DashboardData, error) {
	return r.queryDashboardData(ctx, f)
}

func (r *Repository) queryDashboardData(ctx context.Context, f models.DashboardFilters) (*models.DashboardData, error) {
	data := &models.DashboardData{}

	// ── catalogos (fichas per catalogue) ─────────────────────────────────────
	rows, err := r.pool.Query(ctx, `
		SELECT COALESCE(datos_raw->>'catalogue', acuerdo) AS catalogo,
		       COUNT(*)::INTEGER AS ordenes,
		       0.0::FLOAT AS monto,
		       ROUND(COUNT(*)*100.0/SUM(COUNT(*)) OVER(), 2) AS percent
		FROM fichas
		WHERE deleted_at IS NULL
		  AND estado != 'eliminada'
		  AND ($1='' OR acuerdo ILIKE $1)
		  AND ($2='' OR estado::TEXT = $2)
		  AND ($3='' OR datos_raw->>'catalogue' ILIKE $3)
		GROUP BY COALESCE(datos_raw->>'catalogue', acuerdo)
		ORDER BY ordenes DESC LIMIT 20`,
		f.AcuerdoMarco, f.TipoCompra, f.Catalogo)
	if err != nil {
		return nil, fmt.Errorf("catalogos query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var row models.CatalogoRow
		if err := rows.Scan(&row.Catalogo, &row.Ordenes, &row.Monto, &row.Percent); err != nil {
			return nil, err
		}
		data.TotalOrdenes += row.Ordenes
		data.Catalogos = append(data.Catalogos, row)
	}
	rows.Close()

	// ── mensual (fichas by publication month, 2025 onwards) ─────────────────
	mRows, err := r.pool.Query(ctx, `
		SELECT TO_CHAR(published_at, 'Mon YYYY') AS mes,
		       COUNT(*)::FLOAT AS ordenes,
		       0.0::FLOAT AS monto
		FROM fichas
		WHERE deleted_at IS NULL
		  AND published_at IS NOT NULL
		  AND published_at >= '2025-01-01'
		  AND ($1='' OR EXTRACT(YEAR FROM published_at)::TEXT = $1)
		GROUP BY EXTRACT(YEAR FROM published_at), EXTRACT(MONTH FROM published_at),
		         TO_CHAR(published_at, 'Mon YYYY')
		ORDER BY EXTRACT(YEAR FROM published_at), EXTRACT(MONTH FROM published_at)`,
		f.Anio)
	if err != nil {
		return nil, fmt.Errorf("mensual query: %w", err)
	}
	defer mRows.Close()
	for mRows.Next() {
		var row models.MonthlyRow
		if err := mRows.Scan(&row.Mes, &row.Ordenes, &row.Monto); err != nil {
			return nil, err
		}
		data.Mensual = append(data.Mensual, row)
	}
	mRows.Close()

	// ── departamentos (repurposed → fichas per acuerdo_marco) ─────────────────
	dRows, err := r.pool.Query(ctx, `
		SELECT acuerdo, COUNT(*)::INTEGER, 0.0::FLOAT
		FROM fichas
		WHERE deleted_at IS NULL AND estado != 'eliminada'
		GROUP BY acuerdo ORDER BY COUNT(*) DESC LIMIT 15`)
	if err != nil {
		return nil, fmt.Errorf("departamentos query: %w", err)
	}
	defer dRows.Close()
	for dRows.Next() {
		var row models.DepartamentoRow
		if err := dRows.Scan(&row.Nombre, &row.Ordenes, &row.Monto); err != nil {
			return nil, err
		}
		data.Departamentos = append(data.Departamentos, row)
	}
	dRows.Close()

	// ── tipo compra (repurposed → fichas by estado) ───────────────────────────
	colors := []string{"#01B8AA", "#374649", "#FD625E", "#F2C80F", "#5F6B6D"}
	tRows, err := r.pool.Query(ctx, `
		SELECT estado::TEXT, COUNT(*)::FLOAT
		FROM fichas
		WHERE deleted_at IS NULL
		GROUP BY estado ORDER BY COUNT(*) DESC`)
	if err != nil {
		return nil, fmt.Errorf("tipo_compra query: %w", err)
	}
	defer tRows.Close()
	idx := 0
	for tRows.Next() {
		var row models.TipoCompraRow
		if err := tRows.Scan(&row.Tipo, &row.Monto); err != nil {
			return nil, err
		}
		if idx < len(colors) {
			row.Color = colors[idx]
		}
		idx++
		data.TiposCompra = append(data.TiposCompra, row)
	}
	tRows.Close()

	// totals
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::INTEGER FROM fichas WHERE deleted_at IS NULL AND estado != 'eliminada'`,
	).Scan(&data.TotalOrdenes)

	// ── filter options ────────────────────────────────────────────────────────
	var opts models.FilterOptions
	fo := r.pool.QueryRow(ctx, `
		SELECT
		  ARRAY_AGG(DISTINCT EXTRACT(YEAR FROM published_at)::TEXT
		            ORDER BY EXTRACT(YEAR FROM published_at)::TEXT DESC)
		            FILTER (WHERE published_at IS NOT NULL AND published_at >= '2025-01-01'),
		  ARRAY_AGG(DISTINCT acuerdo ORDER BY acuerdo)
		            FILTER (WHERE acuerdo IS NOT NULL),
		  ARRAY_AGG(DISTINCT datos_raw->>'catalogue' ORDER BY datos_raw->>'catalogue')
		            FILTER (WHERE datos_raw->>'catalogue' IS NOT NULL),
		  ARRAY_AGG(DISTINCT estado::TEXT ORDER BY estado::TEXT)
		            FILTER (WHERE estado IS NOT NULL)
		FROM fichas WHERE deleted_at IS NULL AND estado != 'eliminada'`)
	_ = fo.Scan(&opts.Anios, &opts.AcuerdosMarco, &opts.Catalogos, &opts.TiposCompra)
	data.FilterOptions = opts

	return data, nil
}

// UpsertContrataciones inserts or updates a batch of procurement rows.
func (r *Repository) UpsertContrataciones(ctx context.Context, rows []models.ContratacionIngest) error {
	for _, row := range rows {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO contrataciones (anio, mes, departamento, catalogo, tipo_compra, acuerdo_marco, nro_ordenes, monto)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			ON CONFLICT (anio, mes, departamento, catalogo, tipo_compra, acuerdo_marco)
			DO UPDATE SET nro_ordenes = EXCLUDED.nro_ordenes, monto = EXCLUDED.monto`,
			row.Anio, row.Mes, row.Departamento, row.Catalogo,
			row.TipoCompra, row.AcuerdoMarco, row.NroOrdenes, row.Monto)
		if err != nil {
			return err
		}
	}
	return nil
}

// UpsertFicha inserts or updates a single ficha scraped from buscadorcatalogos.perucompras.gob.pe.
func (r *Repository) UpsertFicha(ctx context.Context, f *models.Ficha) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO fichas (ficha_id, nombre, marca, acuerdo, estado, url_ficha, datos_raw, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (ficha_id) DO UPDATE
		SET nombre       = EXCLUDED.nombre,
		    marca        = EXCLUDED.marca,
		    estado       = EXCLUDED.estado,
		    url_ficha    = EXCLUDED.url_ficha,
		    datos_raw    = EXCLUDED.datos_raw,
		    published_at = EXCLUDED.published_at,
		    updated_at   = NOW()`,
		f.FichaID, f.Nombre, f.Marca, f.Acuerdo, f.Estado, f.UrlFicha, f.DatosRaw, f.PublishedAt)
	return err
}

