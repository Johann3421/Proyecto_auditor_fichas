package models

import (
	"time"

	"github.com/google/uuid"
)

type EstimacionMarca struct {
	ID         uuid.UUID  `json:"id"          db:"id"`
	Marca      string     `json:"marca"       db:"marca"`
	PrecioBase *float64   `json:"precio_base" db:"precio_base"`
	PrecioMin  *float64   `json:"precio_min"  db:"precio_min"`
	PrecioMax  *float64   `json:"precio_max"  db:"precio_max"`
	Fuente     *string    `json:"fuente"      db:"fuente"`
	Notas      *string    `json:"notas"       db:"notas"`
	UpdatedAt  time.Time  `json:"updated_at"  db:"updated_at"`
}
