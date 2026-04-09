package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/database"
)

var Repo *database.Repository

func InitHandlers(repo *database.Repository) {
	Repo = repo
}

func FichasHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if Repo == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"rows":    []interface{}{},
			"lastRow": 0,
			"error":   "Database repository not initialized",
		})
		return
	}

	fichas, err := Repo.GetFichas(context.Background())
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"rows":    []interface{}{},
			"lastRow": 0,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"rows":    fichas,
		"lastRow": len(fichas),
	})
}


