package models

import (
	"time"

	"github.com/google/uuid"
)

type TipoNotificacion string

const (
	TipoReporteSemanal TipoNotificacion = "reporte_semanal"
	TipoSyncManual     TipoNotificacion = "sync_manual"
	TipoAlertaSistema  TipoNotificacion = "alerta_sistema"
)

type Notificacion struct {
	ID        uuid.UUID        `json:"id"          db:"id"`
	Tipo      TipoNotificacion `json:"tipo"        db:"tipo"`
	Titulo    string           `json:"titulo"      db:"titulo"`
	Cuerpo    *string          `json:"cuerpo"      db:"cuerpo"`
	Leida     bool             `json:"leida"       db:"leida"`
	ReporteID *uuid.UUID       `json:"reporte_id"  db:"reporte_id"`
	CreatedAt time.Time        `json:"created_at"  db:"created_at"`
}
