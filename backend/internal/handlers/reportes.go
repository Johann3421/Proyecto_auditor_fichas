package handlers

import (
	"encoding/json"
	"net/http"
)

func ReportesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]interface{}{})
}
