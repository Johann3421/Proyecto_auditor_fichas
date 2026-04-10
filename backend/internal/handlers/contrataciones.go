package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/models"
)

// ContratacionesImportHandler handles POST /api/v1/contrataciones/import
// Accepts a CSV file (multipart field "file") or raw CSV body.
//
// Expected CSV columns (case-insensitive, any order):
//   anio, mes, departamento, catalogo, tipo_compra, acuerdo_marco, nro_ordenes, monto
//
// Example row:
//   2025,1,LIMA,COMPUTADORAS DE ESCRITORIO,Acuerdo Marco,EXT-CE-2022-5,150,125000.50
func ContratacionesImportHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var csvReader *csv.Reader

	// Accept either multipart/form-data with a "file" field or raw CSV body.
	ct := r.Header.Get("Content-Type")
	if strings.Contains(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			http.Error(w, `{"error":"cannot parse multipart form"}`, http.StatusBadRequest)
			return
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			http.Error(w, `{"error":"missing 'file' field"}`, http.StatusBadRequest)
			return
		}
		defer file.Close()
		csvReader = csv.NewReader(file)
	} else {
		csvReader = csv.NewReader(r.Body)
	}

	csvReader.TrimLeadingSpace = true
	csvReader.LazyQuotes = true

	// Read header row.
	header, err := csvReader.Read()
	if err != nil {
		http.Error(w, `{"error":"cannot read CSV header"}`, http.StatusBadRequest)
		return
	}

	// Map column names → indices (case-insensitive, accept spaces or underscores).
	colIdx := map[string]int{}
	for i, h := range header {
		key := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(h), " ", "_"))
		colIdx[key] = i
	}

	required := []string{"anio", "mes", "departamento"}
	for _, req := range required {
		if _, ok := colIdx[req]; !ok {
			http.Error(w, fmt.Sprintf(`{"error":"missing required column: %s"}`, req), http.StatusBadRequest)
			return
		}
	}

	// Fallback aliases.
	aliases := map[string][]string{
		"nro_ordenes":  {"nro_ordenes", "ordenes", "n\u00b0_ordenes", "numero_ordenes"},
		"monto":        {"monto", "importe", "total"},
		"catalogo":     {"catalogo", "cat\u00e1logo", "sub_catalogo"},
		"tipo_compra":  {"tipo_compra", "tipo"},
		"acuerdo_marco": {"acuerdo_marco", "acuerdo"},
	}
	getIdx := func(field string) int {
		if idx, ok := colIdx[field]; ok {
			return idx
		}
		for _, alias := range aliases[field] {
			if idx, ok := colIdx[alias]; ok {
				return idx
			}
		}
		return -1
	}

	col := func(row []string, field string) string {
		idx := getIdx(field)
		if idx < 0 || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	var rows []models.ContratacionIngest
	var parseErrors []string
	lineNum := 1
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		lineNum++
		if err != nil {
			parseErrors = append(parseErrors, fmt.Sprintf("line %d: %v", lineNum, err))
			continue
		}
		if len(record) == 0 || strings.TrimSpace(strings.Join(record, "")) == "" {
			continue
		}

		anio, err1 := strconv.Atoi(col(record, "anio"))
		mes, err2 := strconv.Atoi(col(record, "mes"))
		if err1 != nil || err2 != nil || mes < 1 || mes > 12 {
			parseErrors = append(parseErrors, fmt.Sprintf("line %d: invalid anio/mes", lineNum))
			continue
		}

		nroOrdenes := 0
		if v := col(record, "nro_ordenes"); v != "" {
			nroOrdenes, _ = strconv.Atoi(v)
		}
		monto := 0.0
		if v := col(record, "monto"); v != "" {
			v = strings.ReplaceAll(v, ",", ".")
			monto, _ = strconv.ParseFloat(v, 64)
		}

		rows = append(rows, models.ContratacionIngest{
			Anio:         anio,
			Mes:          mes,
			Departamento: strings.ToUpper(col(record, "departamento")),
			Catalogo:     col(record, "catalogo"),
			TipoCompra:   col(record, "tipo_compra"),
			AcuerdoMarco: col(record, "acuerdo_marco"),
			NroOrdenes:   nroOrdenes,
			Monto:        monto,
		})
	}

	if len(rows) == 0 {
		resp := map[string]interface{}{
			"imported":    0,
			"parse_errors": parseErrors,
			"message":     "No valid rows found in CSV",
		}
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(resp)
		return
	}

	if Repo == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"imported": len(rows), "message": "dry-run (no DB)",
		})
		return
	}

	if err := Repo.UpsertContrataciones(r.Context(), rows); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"imported":     len(rows),
		"parse_errors": parseErrors,
		"message":      fmt.Sprintf("Imported %d rows successfully", len(rows)),
	})
}
