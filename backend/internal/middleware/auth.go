package middleware

import (
	"net/http"
)

// Auth es un middleware placeholder. En producción validaría JWT.
// DECISIÓN: Para la fase actual se permite todo para no bloquear el despliegue.
// Implementar validación JWT completa en Fase 5.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}
