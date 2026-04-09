package services

import (
	"context"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/database"
	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/models"
)

const catalogBaseURL = "https://buscadorcatalogos.perucompras.gob.pe"

// maxPagesDefault controls how many pages (12 items/page) to fetch per agreement.
// Override with CEAM_MAX_PAGES env var; set to 0 for unlimited (may take a long time).
const maxPagesDefault = 100

// targetCatalogKeywords — only agreements whose description contains one of these
// normalised (no-accent uppercase) substrings will be scraped.
var targetCatalogKeywords = []string{
	"COMPUTADORAS DE ESCRITORIO",
	"COMPUTADORAS PORTATILES",
	"ESCANERES",
	"IMPRESORAS",
	"REPUESTOS Y ACCESORIOS DE OFICINA",
	"UTILES DE ESCRITORIO",
}

// isTargetCatalog returns true when the agreement description matches any target keyword.
func isTargetCatalog(desc string) bool {
	r := strings.NewReplacer(
		"á", "A", "Á", "A", "é", "E", "É", "E",
		"í", "I", "Í", "I", "ó", "O", "Ó", "O",
		"ú", "U", "Ú", "U", "ñ", "N", "Ñ", "N",
	)
	norm := r.Replace(strings.ToUpper(desc))
	for _, kw := range targetCatalogKeywords {
		if strings.Contains(norm, kw) {
			return true
		}
	}
	return false
}

type PeruComprasCrawler struct {
	client *http.Client
	repo   *database.Repository
}

func NewPeruComprasCrawler(dbRepo *database.Repository) *PeruComprasCrawler {
	jar, _ := cookiejar.New(nil)
	return &PeruComprasCrawler{
		client: &http.Client{Jar: jar, Timeout: 60 * time.Second},
		repo:   dbRepo,
	}
}

// RunScheduledIngestion scrapes buscadorcatalogos.perucompras.gob.pe and saves fichas to DB.
// Set CEAM_MAX_PAGES=0 in Dokploy to scrape all pages (slow); default is 5 per agreement.
func (c *PeruComprasCrawler) RunScheduledIngestion(ctx context.Context) {
	if c.repo == nil {
		log.Println("[Crawler] Sin repositorio DB — omitido.")
		return
	}
	log.Println("[Crawler] Iniciando scraping de buscadorcatalogos.perucompras.gob.pe")
	if err := c.ScrapeAllCatalogs(ctx); err != nil {
		log.Printf("[Crawler] error: %v", err)
	}
}

// ScrapeAllCatalogs fetches all active agreements from the homepage and scrapes each one.
func (c *PeruComprasCrawler) ScrapeAllCatalogs(ctx context.Context) error {
	maxPages := maxPagesDefault
	if v := os.Getenv("CEAM_MAX_PAGES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			maxPages = n
		}
	}

	homeHTML, csrfToken, err := c.fetchHome()
	if err != nil {
		return fmt.Errorf("fetch homepage: %w", err)
	}

	agreements := parseAgreements(homeHTML)
	log.Printf("[Crawler] %d acuerdos vigentes encontrados", len(agreements))

	// Filter to target catalogs only.
	var targeted []agreementInfo
	for _, ag := range agreements {
		if isTargetCatalog(ag.Description) {
			targeted = append(targeted, ag)
		}
	}
	if len(targeted) == 0 {
		log.Println("[Crawler] Ningún acuerdo coincide con catálogos objetivo — scrapeando todos")
		targeted = agreements
	}
	log.Printf("[Crawler] %d/%d acuerdos seleccionados para scraping", len(targeted), len(agreements))
	agreements = targeted

	totalFichas := 0
	for _, ag := range agreements {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, err := c.scrapeAgreement(ctx, csrfToken, ag, maxPages)
		if err != nil {
			log.Printf("[Crawler] error en acuerdo %s: %v", ag.Code, err)
		} else {
			totalFichas += n
		}

		// Refresh token and cookies between agreements to avoid session expiry.
		if _, tok, refreshErr := c.fetchHome(); refreshErr == nil {
			csrfToken = tok
		}
	}
	log.Printf("[Crawler] Scraping completado: %d fichas procesadas", totalFichas)
	return nil
}

type agreementInfo struct {
	Code        string
	Description string
	// Full data-agreement value as needed for the POST filter, e.g.
	// "VIGENTE•EXT-CE-2022-5 COMPUTADORAS DE ESCRITORIO..."
	FilterValue string
}

func (c *PeruComprasCrawler) fetchHome() (string, string, error) {
	resp, err := c.client.Get(catalogBaseURL + "/")
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}
	body := string(b)

	reToken := regexp.MustCompile(`__RequestVerificationToken" type="hidden" value="([^"]+)"`)
	m := reToken.FindStringSubmatch(body)
	if len(m) < 2 {
		return body, "", fmt.Errorf("CSRF token no encontrado en homepage")
	}
	return body, m[1], nil
}

// parseAgreements extracts the list of active agreements from the homepage HTML.
func parseAgreements(body string) []agreementInfo {
	// Each agreement icon has: data-agreement="VIGENTE•EXT-CE-2022-5 DESCRIPTION"
	re := regexp.MustCompile(`data-agreement="([^"]+)"`)
	matches := re.FindAllStringSubmatch(body, -1)

	seen := map[string]bool{}
	var result []agreementInfo
	for _, m := range matches {
		raw := html.UnescapeString(m[1]) // decode HTML entities
		if seen[raw] {
			continue
		}
		seen[raw] = true

		// Format: "VIGENTE•EXT-CE-2022-5 DESCRIPTION"
		parts := strings.SplitN(raw, "\u2022", 2) // split on •
		if len(parts) != 2 {
			continue
		}
		rest := strings.TrimSpace(parts[1]) // "EXT-CE-2022-5 DESCRIPTION"
		codeParts := strings.SplitN(rest, " ", 2)
		code := codeParts[0]
		desc := ""
		if len(codeParts) > 1 {
			desc = codeParts[1]
		}
		result = append(result, agreementInfo{
			Code:        code,
			Description: desc,
			FilterValue: raw,
		})
	}
	return result
}

// scrapeAgreement paginates through one agreement's product list.
func (c *PeruComprasCrawler) scrapeAgreement(ctx context.Context, csrfToken string, ag agreementInfo, maxPages int) (int, error) {
	desc := ag.Description
	if len(desc) > 35 {
		desc = desc[:35] + "…"
	}
	log.Printf("[Crawler] Acuerdo %s — %s", ag.Code, desc)

	total := 0
	for page := 1; ; page++ {
		if maxPages > 0 && page > maxPages {
			break
		}
		select {
		case <-ctx.Done():
			return total, ctx.Err()
		default:
		}

		pageHTML, hasNext, err := c.fetchProductPage(csrfToken, ag.FilterValue, page)
		if err != nil {
			return total, fmt.Errorf("pág %d: %w", page, err)
		}

		fichas := parseProductCards(pageHTML, ag.Code, ag.Description)
		for _, f := range fichas {
			fCopy := f
			if err := c.repo.UpsertFicha(ctx, &fCopy); err != nil {
				log.Printf("[Crawler] error guardando ficha %s: %v", f.FichaID, err)
			}
			total++
		}

		if !hasNext {
			break
		}
		time.Sleep(300 * time.Millisecond) // polite delay between pages
	}
	return total, nil
}

// fetchProductPage submits the search form for a specific agreement page.
func (c *PeruComprasCrawler) fetchProductPage(csrfToken, filterValue string, page int) (string, bool, error) {
	filterJSON := `["` + strings.ReplaceAll(filterValue, `"`, `\"`) + `"]`

	formValues := fmt.Sprintf(
		"__RequestVerificationToken=%s&Status=VIGENTE&Pagination.Page=%d&Pagination.LeftMostPage=1&Pagination.Paging=%d&ClientFilter.Feature=%%5B%%5D&ClientFilter.Agreement=%s&ClientFilter.Catalogue=&ClientFilter.Category=&ServerFilter.Agreement=&ServerFilter.Catalogue=&ServerFilter.Category=&SearchText=",
		urlEncode(csrfToken),
		page, page,
		urlEncode(filterJSON),
	)

	req, err := http.NewRequest(http.MethodPost, catalogBaseURL+"/", strings.NewReader(formValues))
	if err != nil {
		return "", false, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Referer", catalogBaseURL+"/")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", false, err
	}
	body := string(b)

	// Check if there's a "next" page link
	hasNext := strings.Contains(body, `data-paging="next"`)
	return body, hasNext, nil
}

// urlEncode does minimal percent-encoding for form values.
func urlEncode(s string) string {
	var b strings.Builder
	for _, c := range []byte(s) {
		switch {
		case c >= 'A' && c <= 'Z', c >= 'a' && c <= 'z', c >= '0' && c <= '9',
			c == '-', c == '_', c == '.', c == '~':
			b.WriteByte(c)
		default:
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

// parseProductCards extracts Ficha objects from a search result HTML page.
func parseProductCards(body, acuerdoCode, acuerdoDesc string) []models.Ficha {
	reH4 := regexp.MustCompile(`card-title-custom[^>]*>\s*([^\n<]+?)\s*</h4>`)
	reID := regexp.MustCompile(`<a[^>]*id="(\d+)"[^>]*class="enlace-detalles`)
	reAttr := func(name string) *regexp.Regexp {
		return regexp.MustCompile(`data-` + name + `="([^"]*)"`)
	}
	reCatalogue := reAttr("catalogue")
	reStatus := reAttr("status")
	reFile := reAttr("file")
	rePubDate := reAttr("published-date")

	// Split into individual card sections
	sections := strings.Split(body, `<div class="card">`)
	now := time.Now()

	var result []models.Ficha
	for _, sec := range sections[1:] { // skip pre-card content
		h4m := reH4.FindStringSubmatch(sec)
		if len(h4m) < 2 {
			continue
		}
		idm := reID.FindStringSubmatch(sec)
		if len(idm) < 2 {
			continue
		}

		nombre := strings.TrimSpace(html.UnescapeString(h4m[1]))
		fichaID := idm[1]

		// Brand: text after " : " in header (e.g., "COMPUTADORA DE ESCRITORIO : VASTEC MULTIV RL")
		marca := ""
		if idx := strings.Index(nombre, " : "); idx >= 0 {
			rest := strings.TrimSpace(nombre[idx+3:])
			if sp := strings.Index(rest, " "); sp > 0 {
				marca = rest[:sp]
			} else {
				marca = rest
			}
		}

		catalogue := ""
		if m := reCatalogue.FindStringSubmatch(sec); len(m) >= 2 {
			catalogue = html.UnescapeString(m[1])
		}

		statusStr := "OFERTADA"
		if m := reStatus.FindStringSubmatch(sec); len(m) >= 2 {
			statusStr = strings.ToUpper(m[1])
		}
		estado := models.EstadoActiva
		if statusStr == "SUSPENDIDA" {
			estado = models.EstadoBaja
		}

		urlFicha := ""
		if m := reFile.FindStringSubmatch(sec); len(m) >= 2 {
			urlFicha = m[1]
		}

		pubDate := ""
		if m := rePubDate.FindStringSubmatch(sec); len(m) >= 2 {
			pubDate = strings.TrimPrefix(strings.TrimSpace(m[1]), "Fecha de publicación: ")
		}

		datosRaw := map[string]interface{}{
			"catalogue":      catalogue,
			"acuerdo_desc":   acuerdoDesc,
			"published_date": pubDate,
			"status_raw":     statusStr,
		}

		// Parse DD/MM/YYYY → time.Time for published_at column.
		var pubAt *time.Time
		if pubDate != "" {
			if t, err := time.Parse("02/01/2006", pubDate); err == nil {
				pubAt = &t
			}
		}

		result = append(result, models.Ficha{
			FichaID:     fichaID,
			Nombre:      nombre,
			Marca:       marca,
			Acuerdo:     acuerdoCode,
			Estado:      estado,
			UrlFicha:    &urlFicha,
			DatosRaw:    datosRaw,
			PublishedAt: pubAt,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}
	return result
}
