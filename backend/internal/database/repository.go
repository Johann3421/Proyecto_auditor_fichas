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

	// ── catalogos ────────────────────────────────────────────────────────────
	rows, err := r.pool.Query(ctx, `
		SELECT catalogo,
		       SUM(nro_ordenes)::INTEGER AS ordenes,
		       SUM(monto)               AS monto,
		       ROUND(SUM(monto)*100.0/SUM(SUM(monto)) OVER (), 2) AS percent
		FROM contrataciones
		WHERE ($1='' OR anio::TEXT=$1)
		  AND ($2='' OR CEIL(mes::NUMERIC/3)::TEXT=$2)
		  AND ($3='' OR mes::TEXT=$3)
		  AND ($4='' OR departamento ILIKE $4)
		  AND ($5='' OR catalogo ILIKE $5)
		  AND ($6='' OR acuerdo_marco ILIKE $6)
		  AND ($7='' OR tipo_compra ILIKE $7)
		GROUP BY catalogo ORDER BY monto DESC`,
		f.Anio, f.Trimestre, f.Mes, f.Departamento, f.Catalogo, f.AcuerdoMarco, f.TipoCompra)
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
		data.TotalMonto += row.Monto
		data.Catalogos = append(data.Catalogos, row)
	}
	rows.Close()

	// ── mensual ───────────────────────────────────────────────────────────────
	mRows, err := r.pool.Query(ctx, `
		SELECT TO_CHAR(MAKE_DATE(anio,mes,1),'TMMonth') AS mes,
		       SUM(nro_ordenes)::FLOAT AS ordenes,
		       SUM(monto)              AS monto
		FROM contrataciones
		WHERE ($1='' OR anio::TEXT=$1)
		  AND ($2='' OR departamento ILIKE $2)
		  AND ($3='' OR catalogo ILIKE $3)
		  AND ($4='' OR tipo_compra ILIKE $4)
		GROUP BY anio, mes ORDER BY anio, mes`,
		f.Anio, f.Departamento, f.Catalogo, f.TipoCompra)
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

	// ── departamentos ─────────────────────────────────────────────────────────
	dRows, err := r.pool.Query(ctx, `
		SELECT departamento, SUM(nro_ordenes)::INTEGER, SUM(monto)
		FROM contrataciones
		WHERE ($1='' OR anio::TEXT=$1)
		  AND ($2='' OR CEIL(mes::NUMERIC/3)::TEXT=$2)
		  AND ($3='' OR mes::TEXT=$3)
		GROUP BY departamento ORDER BY monto DESC`,
		f.Anio, f.Trimestre, f.Mes)
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

	// ── tipo compra ───────────────────────────────────────────────────────────
	colors := []string{"#01B8AA", "#374649", "#FD625E", "#F2C80F", "#5F6B6D"}
	tRows, err := r.pool.Query(ctx, `
		SELECT tipo_compra, SUM(monto)
		FROM contrataciones
		WHERE ($1='' OR anio::TEXT=$1)
		  AND ($2='' OR departamento ILIKE $2)
		GROUP BY tipo_compra ORDER BY monto DESC`,
		f.Anio, f.Departamento)
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

	// ── filter options ────────────────────────────────────────────────────────
	var opts models.FilterOptions
	opts.Trimestres = []string{"1", "2", "3", "4"}
	opts.Meses = []string{
		"enero","febrero","marzo","abril","mayo","junio",
		"julio","agosto","septiembre","octubre","noviembre","diciembre",
	}
	fo := r.pool.QueryRow(ctx, `
		SELECT
		  ARRAY_AGG(DISTINCT anio::TEXT ORDER BY anio::TEXT DESC) FILTER (WHERE anio IS NOT NULL),
		  ARRAY_AGG(DISTINCT departamento ORDER BY departamento)   FILTER (WHERE departamento IS NOT NULL),
		  ARRAY_AGG(DISTINCT catalogo ORDER BY catalogo)           FILTER (WHERE catalogo IS NOT NULL),
		  ARRAY_AGG(DISTINCT acuerdo_marco ORDER BY acuerdo_marco) FILTER (WHERE acuerdo_marco IS NOT NULL),
		  ARRAY_AGG(DISTINCT tipo_compra ORDER BY tipo_compra)     FILTER (WHERE tipo_compra IS NOT NULL)
		FROM contrataciones`)
	_ = fo.Scan(&opts.Anios, &opts.Departamentos, &opts.Catalogos, &opts.AcuerdosMarco, &opts.TiposCompra)
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


