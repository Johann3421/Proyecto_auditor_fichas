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
	ID               uuid.UUID               `json:"id"                 db:"id"`
	SemanaInicio     time.Time               `json:"semana_inicio"      db:"semana_inicio"`
	SemanaFin        time.Time               `json:"semana_fin"         db:"semana_fin"`
	TotalFichas      *int                    `json:"total_fichas"       db:"total_fichas"`
	FichasNuevas     *int                    `json:"fichas_nuevas"      db:"fichas_nuevas"`
	FichasDadasBaja  *int                    `json:"fichas_dadas_baja"  db:"fichas_dadas_baja"`
	FichasInvalidadas *int                   `json:"fichas_invalidadas" db:"fichas_invalidadas"`
	ResumenPorMarca  map[string]ResumenMarca `json:"resumen_por_marca"  db:"resumen_por_marca"`
	WebhookEnviado   bool                    `json:"webhook_enviado"    db:"webhook_enviado"`
	WebhookEnviadoAt *time.Time              `json:"webhook_enviado_at" db:"webhook_enviado_at"`
	CreatedAt        time.Time               `json:"created_at"         db:"created_at"`
}
