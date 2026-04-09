# Stage 1: compilar
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Instalar git (requerido por go mod para algunos módulos)
RUN apk add --no-cache git

COPY go.mod ./
# go mod download requiere un entorno limpio
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /ceam-server ./cmd/server

# Stage 2: imagen final mínima
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /ceam-server /ceam-server
# Copiar las migraciones necesarias para el arranque
COPY --from=builder /app/migrations ./migrations
EXPOSE 8080
CMD ["/ceam-server"]
