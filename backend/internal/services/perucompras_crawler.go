package services

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/database"
	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/models"
)

type PeruComprasCrawler struct {
	client *http.Client
	repo   *database.Repository
}

func NewPeruComprasCrawler(dbRepo *database.Repository) *PeruComprasCrawler {
	jar, _ := cookiejar.New(nil)
	return &PeruComprasCrawler{
		client: &http.Client{
			Jar:     jar,
			Timeout: 120 * time.Second,
		},
		repo: dbRepo,
	}
}

// RunScheduledIngestion ingests data from the URL set in CEAM_DATA_URL.
// Set this environment variable in Dokploy to a publicly accessible CSV URL
// (e.g. a Google Drive / GitHub / S3 direct-download link for the PeruCompras
// ordenes de catálogo electrónico export).
//
// If CEAM_DATA_URL is not set the function logs a warning and returns — no
// attempt is made to connect to any external host.
func (c *PeruComprasCrawler) RunScheduledIngestion(ctx context.Context) {
	if c.repo == nil {
		log.Println("[Ingestor] Sin repositorio DB — ingesta omitida.")
		return
	}

	customURL := os.Getenv("CEAM_DATA_URL")
	if customURL == "" {
		log.Println("[Ingestor] CEAM_DATA_URL no configurado. " +
			"Configura esta variable en Dokploy apuntando al CSV de ordenes de catálogo de PeruCompras.")
		return
	}

	log.Printf("[Ingestor] Ingiriendo desde CEAM_DATA_URL: %s", customURL)
	if err := c.IngestCSV(ctx, customURL); err != nil {
		log.Printf("[Ingestor] error: %v", err)
	}
}

// IngestCSV fetches a CSV file and upserts all valid rows into the contrataciones table.
//
// The CSV must have a header row. Column matching is case-insensitive.
// Recognised column names:
//
//	year      → ANIO | AÑO | ANNO | ANO
//	month     → MES
//	dept      → DEPARTAMENTO | REGION
//	catalog   → CATALOGO | NOMBRE_CATALOGO
//	type      → TIPO_COMPRA | TIPOCOMPRA
//	agreement → ACUERDO_MARCO | NUMERO_ACUERDO
//	orders    → NRO_ORDENES | NUMERO_ORDENES | N_ORDENES
//	amount    → MONTO | MONTO_TOTAL
func (c *PeruComprasCrawler) IngestCSV(ctx context.Context, csvURL string) error {
	if c.repo == nil {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, csvURL, nil)
	if err != nil {
		return fmt.Errorf("crear request: %w", err)
	}
	req.Header.Set("User-Agent", "CEAM-Auditor/1.0")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch CSV: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d al descargar %s", resp.StatusCode, csvURL)
	}

	reader := csv.NewReader(resp.Body)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1

	headers, err := reader.Read()
	if err != nil {
		return fmt.Errorf("leer cabecera CSV: %w", err)
	}
	idx := buildColIndex(headers)

	var batch []models.ContratacionIngest
	ingested := 0

	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("[Ingestor] advertencia CSV: %v — omitiendo fila", err)
			continue
		}
		cont, ok := parseRow(row, idx)
		if !ok {
			continue
		}
		batch = append(batch, cont)
		if len(batch) >= 500 {
			if err := c.repo.UpsertContrataciones(ctx, batch); err != nil {
				log.Printf("[Ingestor] error upsert batch: %v", err)
			} else {
				ingested += len(batch)
			}
			batch = batch[:0]
		}
	}
	if len(batch) > 0 {
		if err := c.repo.UpsertContrataciones(ctx, batch); err != nil {
			log.Printf("[Ingestor] error upsert batch final: %v", err)
		} else {
			ingested += len(batch)
		}
	}
	log.Printf("[Ingestor] %d filas ingiridas desde %s", ingested, csvURL)
	return nil
}

// buildColIndex maps normalised header names to their CSV column index.
func buildColIndex(headers []string) map[string]int {
	m := make(map[string]int, len(headers))
	for i, h := range headers {
		m[normalise(h)] = i
	}
	return m
}

// normalise removes accents and uppercases a string for case-insensitive matching.
func normalise(s string) string {
	r := strings.NewReplacer(
		"ñ", "N", "Ñ", "N",
		"á", "A", "Á", "A",
		"é", "E", "É", "E",
		"í", "I", "Í", "I",
		"ó", "O", "Ó", "O",
		"ú", "U", "Ú", "U",
	)
	return strings.ToUpper(strings.TrimSpace(r.Replace(s)))
}

// parseRow converts a single CSV row into a ContratacionIngest.
// Returns (row, false) if the row lacks mandatory fields.
func parseRow(row []string, idx map[string]int) (models.ContratacionIngest, bool) {
	get := func(keys ...string) string {
		for _, k := range keys {
			if i, ok := idx[k]; ok && i < len(row) {
				return strings.TrimSpace(row[i])
			}
		}
		return ""
	}

	anio, _ := strconv.Atoi(get("ANIO", "ANO", "AÑO"))
	mes, _ := strconv.Atoi(get("MES"))
	if anio == 0 || mes < 1 || mes > 12 {
		return models.ContratacionIngest{}, false
	}

	ordenes, _ := strconv.Atoi(get("NRO_ORDENES", "NUMERO_ORDENES", "N_ORDENES", "NROORDENES", "ORDENES"))
	montoStr := strings.ReplaceAll(
		strings.ReplaceAll(get("MONTO", "MONTO_TOTAL", "MONTOTOTAL"), ",", "."),
		" ", "",
	)
	monto, _ := strconv.ParseFloat(montoStr, 64)

	return models.ContratacionIngest{
		Anio:         anio,
		Mes:          mes,
		Departamento: strings.ToUpper(get("DEPARTAMENTO", "REGION", "DEPARTAMENTO_REGION")),
		Catalogo:     strings.ToUpper(get("CATALOGO", "NOMBRE_CATALOGO", "NOMBRE CATALOGO")),
		TipoCompra:   strings.ToUpper(get("TIPO_COMPRA", "TIPOCOMPRA", "TIPO COMPRA")),
		AcuerdoMarco: strings.ToUpper(get("ACUERDO_MARCO", "NUMERO_ACUERDO", "ACUERDO MARCO", "ACUERDOMARCO")),
		NroOrdenes:   ordenes,
		Monto:        monto,
	}, true
}
