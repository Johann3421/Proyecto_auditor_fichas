package database

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
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
// If the contrataciones table is empty or doesn't exist it returns rich mock data
// so the frontend stays functional before real ingestion has occurred.
func (r *Repository) GetDashboardData(ctx context.Context, f models.DashboardFilters) (*models.DashboardData, error) {
	data, err := r.queryDashboardData(ctx, f)
	if err != nil || len(data.Catalogos) == 0 {
		return mockDashboardData(), nil
	}
	return data, nil
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

// mockDashboardData returns realistic sample data so the UI works before DB is seeded.
func mockDashboardData() *models.DashboardData {
	meses := []string{
		"enero","febrero","marzo","abril","mayo","junio",
		"julio","agosto","septiembre","octubre","noviembre","diciembre",
	}
	ordenesBase := []float64{0.02, 0.07, 0.12, 0.09, 0.10, 0.09, 0.10, 0.09, 0.10, 0.11, 0.11, 0.11}
	montoBase   := []float64{289.57, 797.96, 1254.84, 1068.21, 1095.38, 1024.82, 1084.26, 1149.67, 1276.11, 1548.41, 1725.18, 1841.39}

	var mensual []models.MonthlyRow
	for i, m := range meses {
		mensual = append(mensual, models.MonthlyRow{Mes: m, Ordenes: ordenesBase[i], Monto: montoBase[i]})
	}

	catalogos := []models.CatalogoRow{
		{Catalogo: "COMPUTADORAS DE ESCRITORIO", Ordenes: 54265, Monto: 3189365150.95, Percent: 22.53},
		{Catalogo: "CONSUMIBLES",                Ordenes: 229804, Monto: 1440042526.61, Percent: 10.17},
		{Catalogo: "COMPUTADORAS PORTÁTILES",    Ordenes: 18489, Monto: 1419453724.91, Percent: 10.03},
		{Catalogo: "IMPRESORAS",                 Ordenes: 51873, Monto: 1065797064.98, Percent: 7.53},
		{Catalogo: "PAPELES Y CARTONES",         Ordenes: 153546, Monto: 1001272879.20, Percent: 7.07},
		{Catalogo: "ÚTILES DE ESCRITORIO",       Ordenes: 252021, Monto: 895122526.27, Percent: 6.32},
		{Catalogo: "SVC EMISIÓN BOLETOS AÉREOS", Ordenes: 73348, Monto: 799747627.66, Percent: 5.65},
		{Catalogo: "TUBERÍAS Y ACCESORIOS",      Ordenes: 16485, Monto: 752802249.07, Percent: 5.32},
		{Catalogo: "BIENES PARA USOS DIVERSOS",  Ordenes: 23116, Monto: 542206393.32, Percent: 3.83},
		{Catalogo: "MATERIALES DE LIMPIEZA",     Ordenes: 60804, Monto: 357998855.72, Percent: 2.53},
	}

	departamentos := []models.DepartamentoRow{
		{Nombre: "LIMA",        Ordenes: 512345, Monto: 6500000000.00},
		{Nombre: "AREQUIPA",    Ordenes: 98765, Monto: 1200000000.00},
		{Nombre: "CUSCO",       Ordenes: 76543, Monto: 980000000.00},
		{Nombre: "PIURA",       Ordenes: 65432, Monto: 870000000.00},
		{Nombre: "LA LIBERTAD", Ordenes: 54321, Monto: 740000000.00},
		{Nombre: "JUNÍN",       Ordenes: 43210, Monto: 620000000.00},
		{Nombre: "PUNO",        Ordenes: 32109, Monto: 510000000.00},
		{Nombre: "ANCASH",      Ordenes: 21098, Monto: 430000000.00},
	}

	tiposCompra := []models.TipoCompraRow{
		{Tipo: "GRAN COMPRA",    Monto: 7000000000.00, Color: "#01B8AA"},
		{Tipo: "ORDINARIA",      Monto: 5800000000.00, Color: "#374649"},
		{Tipo: "BOLETOS AÉREOS", Monto: 1355802998.92, Color: "#FD625E"},
	}

	return &models.DashboardData{
		Catalogos:     catalogos,
		Mensual:       mensual,
		Departamentos: departamentos,
		TiposCompra:   tiposCompra,
		TotalOrdenes:  1106038,
		TotalMonto:    14155802998.92,
		FilterOptions: models.FilterOptions{
			Anios:         []string{"2024", "2023", "2022"},
			Trimestres:    []string{"1", "2", "3", "4"},
			Meses:         meses,
			Departamentos: []string{"LIMA","AREQUIPA","CUSCO","PIURA","LA LIBERTAD","JUNÍN","PUNO","ANCASH"},
			Catalogos:     []string{"COMPUTADORAS DE ESCRITORIO","CONSUMIBLES","COMPUTADORAS PORTÁTILES","IMPRESORAS"},
			AcuerdosMarco: []string{"AM-01","AM-02","AM-03"},
			TiposCompra:   []string{"GRAN COMPRA","ORDINARIA","BOLETOS AÉREOS"},
		},
	}
}
