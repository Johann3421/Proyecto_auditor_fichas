package services

import (
	"context"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/database"
	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/models"
)

type PeruComprasCrawler struct {
	BaseURL string
	client  *http.Client
	dbRepo  *database.Repository
}

func NewPeruComprasCrawler(dbRepo *database.Repository) *PeruComprasCrawler {
	jar, _ := cookiejar.New(nil)
	return &PeruComprasCrawler{
		BaseURL: "https://buscadorcatalogos.perucompras.gob.pe/",
		client: &http.Client{
			Jar:     jar,
			Timeout: 30 * time.Second,
		},
		dbRepo: dbRepo,
	}
}

// StartExtraction inicia el proceso asincrono de extracción del catálogo buscado.
func (c *PeruComprasCrawler) StartExtraction(ctx context.Context, searchQuery string, agreementFilter string) error {
	log.Printf("[Crawler] Iniciando extracción para Acuerdo: %s", agreementFilter)

	// Paso 1: Obtener la Cookie Antisecuestro y el RequestVerificationToken
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL, nil)
	if err != nil {
		return err
	}
	// Mimic a standard browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Crawler] Error: El servidor devolvió %d", resp.StatusCode)
		return nil
	}

	// Extraer el token del cuerpo de la respuesta HTML (Implementación base usando RegEx en lugar de full DOM tree para rendimiento inicial)
	bodyBytes := make([]byte, 1024*1024) // 1MB buffer aprox para la home
	n, _ := resp.Body.Read(bodyBytes)
	htmlContent := string(bodyBytes[:n])

	reStr := `<input name="__RequestVerificationToken" type="hidden" value="([^"]+)"`
	re := regexp.MustCompile(reStr)
	matches := re.FindStringSubmatch(htmlContent)
	if len(matches) < 2 {
		log.Printf("[Crawler] Error: No se pudo obtener el RequestVerificationToken. Analizador detenido.")
		return nil
	}
	token := matches[1]

	log.Printf("[Crawler] Token de seguridad obtenido. Realizando petición de búsqueda POST...")

	// Paso 2: Ejecutar la búsqueda en "/Public/Search" o "/"
	form := url.Values{}
	form.Add("__RequestVerificationToken", token)
	form.Add("IsNewSearch", "True")
	form.Add("From", "Search")
	form.Add("SearchText", searchQuery)
	form.Add("Pagination.Page", "1")
	form.Add("Pagination.LeftMostPage", "1")
	
	if agreementFilter != "" {
		// Debe tener formato JSON: ["VIGENTE•EXT-CE-2024-3..."]
		form.Add("ClientFilter.Agreement", `["`+agreementFilter+`"]`)
	}

	reqPost, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	reqPost.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	reqPost.Header.Add("Referer", c.BaseURL)
	reqPost.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

	respPost, err := c.client.Do(reqPost)
	if err != nil {
		return err
	}
	defer respPost.Body.Close()

	// Parseo de los resultados desde el response
	// FIXME: Requiere parseador GoQuery para mapear las fichas cuando ya está expuesta la data total.
	log.Printf("[Crawler] HTTP STATUS %d retornado.", respPost.StatusCode)

	// Demostrador de inserción a la BD del "diff_engine" 
	// Para enganchar con el frontend que has pedido.
	dummyFicha := models.Ficha{
		ID:        uuid.New(),
		FichaID:   "DEMO-12345",
		Nombre:    "Computadora De Escritorio Avanzada",
		Marca:     "DemoMarca",
		Acuerdo:   "EXT-CE-2024-3",
		Estado:    models.EstadoActiva,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = c.dbRepo.CreateFicha(ctx, &dummyFicha)
	if err != nil {
		log.Printf("[Crawler] Error insertando ficha demo: %v", err)
	} else {
		log.Printf("[Crawler] ¡Ficha insertada con éxito!")
	}

	return nil
}

// RunBackgroundMockCrawler sirve para poblar la DB con datos que demuestren que el Scraper
// se conecta a nuestro nuevo Dashboard estilo Power BI de Contrataciones.
func (c *PeruComprasCrawler) RunBackgroundMockCrawler(ctx context.Context) {
	if c.dbRepo == nil {
		log.Println("[Crawler] No hay repositorio DB disponible, mock crawler omitido.")
		return
	}
	log.Println("[Crawler] Iniciando extracción falsa en segundo plano para activar el Dashboard...")
	
	// Generar fichas que calcen con mock catalogos
	fichasFake := []models.Ficha{
		{FichaID: "F-101", Nombre: "PC GAmer", Marca: "HP", Acuerdo: "COMPUTADORAS DE ESCRITORIO", Estado: models.EstadoActiva},
		{FichaID: "F-102", Nombre: "Papel Bond A4", Marca: "Report", Acuerdo: "PAPELES Y CARTONES", Estado: models.EstadoActiva},
		{FichaID: "F-103", Nombre: "Tinta Epson 664", Marca: "Epson", Acuerdo: "CONSUMIBLES", Estado: models.EstadoActiva},
	}

	for _, f := range fichasFake {
		f.ID = uuid.New()
		f.CreatedAt = time.Now()
		f.UpdatedAt = time.Now()
		f.DatosRaw = map[string]interface{}{"ordenes": 150, "monto_total": 450000.0}
		
		_ = c.dbRepo.CreateFicha(ctx, &f)
	}
	
	log.Println("[Crawler] Base de datos rellenada con Fichas demo para el Auditor.")
}
