package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/database"
	"github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/handlers"
	mymiddleware "github.com/Johann3421/Proyecto_auditor_fichas/backend/internal/middleware"
)

func main() {
	log.Println("CEAM Auditor (Go Backend) - Starting up...")

	var err error

	// 1. Conectar a Base de Datos
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Println("WARNING: DATABASE_URL is not set. Using fallback for init.")
	} else {
		// Validar BD (La función real debe manejar errores o reintentos)
		db, errConn := database.ConnectDB(dbURL)
		if errConn != nil {
			log.Fatalf("Could not connect to database: %v", errConn)
		}
		defer db.Close()

		// 2. Correr Migraciones
		err = database.RunMigrations(dbURL)
		if err != nil {
			log.Printf("Migration notice: %v", err)
		}
	}

	// 3. Inicializar Router Chi
	r := chi.NewRouter()

	// Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(mymiddleware.Logger)
	r.Use(mymiddleware.Cors)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Healthcheck público
	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Endpoints protegidos
	r.Group(func(r chi.Router) {
		r.Use(mymiddleware.Auth)
		
		r.Get("/api/v1/fichas", handlers.FichasHandler)
		r.Get("/api/v1/estimaciones", handlers.EstimacionesHandler)
		r.Get("/api/v1/notificaciones", handlers.NotificacionesHandler)
		r.Get("/api/v1/reportes", handlers.ReportesHandler)
		r.Post("/api/v1/sync/manual", handlers.SyncHandler)
	})

	// 4. Iniciar Servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("Server listening on port %s", port)
	err = http.ListenAndServe(":"+port, r)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
