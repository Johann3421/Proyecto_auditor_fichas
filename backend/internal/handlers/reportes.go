package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/models"
)

func ReportesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	filters := models.DashboardFilters{
		Anio:         q.Get("anio"),
		Trimestre:    q.Get("trimestre"),
		Mes:          q.Get("mes"),
		Departamento: q.Get("departamento"),
		Catalogo:     q.Get("catalogo"),
		AcuerdoMarco: q.Get("acuerdo_marco"),
		TipoCompra:   q.Get("tipo_compra"),
	}

	if Repo == nil {
		// Sin base de datos: devolver estructura vacía
		json.NewEncoder(w).Encode(&models.DashboardData{
			FilterOptions: models.FilterOptions{
				Trimestres: []string{"1", "2", "3", "4"},
				Meses: []string{
					"enero", "febrero", "marzo", "abril", "mayo", "junio",
					"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
				},
			},
		})
		return
	}

	data, err := Repo.GetDashboardData(r.Context(), filters)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(data)
}

