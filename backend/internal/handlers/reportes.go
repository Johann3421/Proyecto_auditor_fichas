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
		// Sin base de datos: devolver mock directamente
		data := mockFallback(filters)
		json.NewEncoder(w).Encode(data)
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

// mockFallback is used when no DB connection is available.
func mockFallback(_ models.DashboardFilters) *models.DashboardData {
	meses := []string{
		"enero", "febrero", "marzo", "abril", "mayo", "junio",
		"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
	}
	var mensual []models.MonthlyRow
	ordenes := []float64{0.02, 0.07, 0.12, 0.09, 0.10, 0.09, 0.10, 0.09, 0.10, 0.11, 0.11, 0.11}
	montos  := []float64{289.57, 797.96, 1254.84, 1068.21, 1095.38, 1024.82, 1084.26, 1149.67, 1276.11, 1548.41, 1725.18, 1841.39}
	for i, m := range meses {
		mensual = append(mensual, models.MonthlyRow{Mes: m, Ordenes: ordenes[i], Monto: montos[i]})
	}
	return &models.DashboardData{
		Catalogos: []models.CatalogoRow{
			{Catalogo: "COMPUTADORAS DE ESCRITORIO", Ordenes: 54265, Monto: 3189365150.95, Percent: 22.53},
			{Catalogo: "CONSUMIBLES",                Ordenes: 229804, Monto: 1440042526.61, Percent: 10.17},
			{Catalogo: "COMPUTADORAS PORTÁTILES",    Ordenes: 18489, Monto: 1419453724.91, Percent: 10.03},
			{Catalogo: "IMPRESORAS",                 Ordenes: 51873, Monto: 1065797064.98, Percent: 7.53},
			{Catalogo: "PAPELES Y CARTONES",         Ordenes: 153546, Monto: 1001272879.20, Percent: 7.07},
			{Catalogo: "ÚTILES DE ESCRITORIO",       Ordenes: 252021, Monto: 895122526.27, Percent: 6.32},
			{Catalogo: "SVC EMISIÓN BOLETOS AÉREOS", Ordenes: 73348, Monto: 799747627.66, Percent: 5.65},
			{Catalogo: "TUBERÍAS Y ACCESORIOS",      Ordenes: 16485, Monto: 752802249.07, Percent: 5.32},
		},
		Mensual: mensual,
		Departamentos: []models.DepartamentoRow{
			{Nombre: "LIMA",        Ordenes: 512345, Monto: 6500000000.00},
			{Nombre: "AREQUIPA",    Ordenes: 98765, Monto: 1200000000.00},
			{Nombre: "CUSCO",       Ordenes: 76543, Monto: 980000000.00},
			{Nombre: "PIURA",       Ordenes: 65432, Monto: 870000000.00},
			{Nombre: "LA LIBERTAD", Ordenes: 54321, Monto: 740000000.00},
			{Nombre: "JUNÍN",       Ordenes: 43210, Monto: 620000000.00},
			{Nombre: "PUNO",        Ordenes: 32109, Monto: 510000000.00},
		},
		TiposCompra: []models.TipoCompraRow{
			{Tipo: "GRAN COMPRA",    Monto: 7000000000.00, Color: "#01B8AA"},
			{Tipo: "ORDINARIA",      Monto: 5800000000.00, Color: "#374649"},
			{Tipo: "BOLETOS AÉREOS", Monto: 1355802998.92, Color: "#FD625E"},
		},
		TotalOrdenes: 1106038,
		TotalMonto:   14155802998.92,
		FilterOptions: models.FilterOptions{
			Anios:         []string{"2024", "2023", "2022"},
			Trimestres:    []string{"1", "2", "3", "4"},
			Meses:         meses,
			Departamentos: []string{"LIMA", "AREQUIPA", "CUSCO", "PIURA", "LA LIBERTAD", "JUNÍN", "PUNO", "ANCASH"},
			Catalogos:     []string{"COMPUTADORAS DE ESCRITORIO", "CONSUMIBLES", "COMPUTADORAS PORTÁTILES", "IMPRESORAS"},
			AcuerdosMarco: []string{"AM-01", "AM-02", "AM-03"},
			TiposCompra:   []string{"GRAN COMPRA", "ORDINARIA", "BOLETOS AÉREOS"},
		},
	}
}
