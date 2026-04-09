package middleware

import "net/http"

func Cors(next http.Handler) http.Handler {
    return next
}
