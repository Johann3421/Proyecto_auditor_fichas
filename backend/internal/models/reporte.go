package models

import (
	"time"

	"github.com/google/uuid"
)

type ResumenMarca struct {
	Nuevas      int `json:"nuevas"`
	Bajas       int `json:"bajas"`
	Invalidadas int `json:"invalidadas"`
	Eliminadas  int `json:"eliminadas"`
}

type ReporteSemanal struct {
	ID                uuid.UUID               `json:"id"                 db:"id"`
	SemanaInicio      time.Time               `json:"semana_inicio"      db:"semana_inicio"`
	SemanaFin         time.Time               `json:"semana_fin"         db:"semana_fin"`
	TotalFichas       *int                    `json:"total_fichas"       db:"total_fichas"`
	FichasNuevas      *int                    `json:"fichas_nuevas"      db:"fichas_nuevas"`
	FichasDadasBaja   *int                    `json:"fichas_dadas_baja"  db:"fichas_dadas_baja"`
	FichasInvalidadas *int                    `json:"fichas_invalidadas" db:"fichas_invalidadas"`
	ResumenPorMarca   map[string]ResumenMarca `json:"resumen_por_marca"  db:"resumen_por_marca"`
	WebhookEnviado    bool                    `json:"webhook_enviado"    db:"webhook_enviado"`
	WebhookEnviadoAt *time.Time               `json:"webhook_enviado_at" db:"webhook_enviado_at"`
	CreatedAt         time.Time               `json:"created_at"         db:"created_at"`
}

// ──────────────────────────────────────────────────────────
// Dashboard de Contrataciones
// ──────────────────────────────────────────────────────────

type DashboardFilters struct {
	Anio         string
	Trimestre    string
	Mes          string
	Departamento string
	Catalogo     string
	AcuerdoMarco string
	TipoCompra   string
}

type CatalogoRow struct {
	Catalogo string  `json:"catalogo"`
	Ordenes  int     `json:"ordenes"`
	Monto    float64 `json:"monto"`
	Percent  float64 `json:"percent"`
}

type MonthlyRow struct {
	Mes     string  `json:"mes"`
	Ordenes float64 `json:"ordenes"`
	Monto   float64 `json:"monto"`
}

type DepartamentoRow struct {
	Nombre  string  `json:"nombre"`
	Ordenes int     `json:"ordenes"`
	Monto   float64 `json:"monto"`
}

type TipoCompraRow struct {
	Tipo  string  `json:"tipo"`
	Monto float64 `json:"monto"`
	Color string  `json:"color"`
}

type FilterOptions struct {
	Anios         []string `json:"anios"`
	Trimestres    []string `json:"trimestres"`
	Meses         []string `json:"meses"`
	Departamentos []string `json:"departamentos"`
	Catalogos     []string `json:"catalogos"`
	AcuerdosMarco []string `json:"acuerdos_marco"`
	TiposCompra   []string `json:"tipos_compra"`
}

type DashboardData struct {
	Catalogos     []CatalogoRow     `json:"catalogos"`
	Mensual       []MonthlyRow      `json:"mensual"`
	Departamentos []DepartamentoRow `json:"departamentos"`
	TiposCompra   []TipoCompraRow   `json:"tipos_compra"`
	TotalOrdenes  int               `json:"total_ordenes"`
	TotalMonto    float64           `json:"total_monto"`
	FilterOptions FilterOptions     `json:"filter_options"`
}

// ContratacionIngest is a single parsed row from PeruCompras open-data CSV/JSON.
type ContratacionIngest struct {
	Anio         int
	Mes          int
	Departamento string
	Catalogo     string
	TipoCompra   string
	AcuerdoMarco string
	NroOrdenes   int
	Monto        float64
}
