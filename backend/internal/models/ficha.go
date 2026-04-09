package models

import (
	"time"

	"github.com/google/uuid"
)

type EstadoFicha string

const (
	EstadoActiva    EstadoFicha = "activa"
	EstadoInvalida  EstadoFicha = "invalida"
	EstadoEliminada EstadoFicha = "eliminada"
	EstadoBaja      EstadoFicha = "baja"
)

type Ficha struct {
	ID             uuid.UUID              `json:"id"              db:"id"`
	FichaID        string                 `json:"ficha_id"        db:"ficha_id"`
	Nombre         string                 `json:"nombre"          db:"nombre"`
	Marca          string                 `json:"marca"           db:"marca"`
	Modelo         *string                `json:"modelo"          db:"modelo"`
	Acuerdo        string                 `json:"acuerdo"         db:"acuerdo"`
	Proveedor      *string                `json:"proveedor"       db:"proveedor"`
	Estado         EstadoFicha            `json:"estado"          db:"estado"`
	PrecioOficial  *float64               `json:"precio_oficial"  db:"precio_oficial"`
	PrecioEstimado *float64               `json:"precio_estimado" db:"precio_estimado"` // Para el JOIN de lecturas
	UrlFicha       *string                `json:"url_ficha"       db:"url_ficha"`
	DatosRaw       map[string]interface{} `json:"datos_raw"       db:"datos_raw"`
	PublishedAt    *time.Time             `json:"published_at"    db:"published_at"`
	CreatedAt      time.Time              `json:"created_at"      db:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"      db:"updated_at"`
	DeletedAt      *time.Time             `json:"deleted_at"      db:"deleted_at"`
}

type HistorialFicha struct {
	ID             uuid.UUID              `json:"id"               db:"id"`
	FichaID        uuid.UUID              `json:"ficha_id"         db:"ficha_id"`
	EstadoAnterior *EstadoFicha           `json:"estado_anterior"  db:"estado_anterior"`
	EstadoNuevo    EstadoFicha            `json:"estado_nuevo"     db:"estado_nuevo"`
	Motivo         *string                `json:"motivo"           db:"motivo"`
	MetadataDiff   map[string]interface{} `json:"metadata_diff"    db:"metadata_diff"`
	CreatedAt      time.Time              `json:"created_at"       db:"created_at"`
	CreatedBy      *string                `json:"created_by"       db:"created_by"`
}
