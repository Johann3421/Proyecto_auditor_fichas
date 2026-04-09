package handlers

import (
	"encoding/json"
	"net/http"
)

func FichasHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"rows":    []interface{}{},
		"lastRow": 0,
	})
}
