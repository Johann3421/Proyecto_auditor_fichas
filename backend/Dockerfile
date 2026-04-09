# Stage 1: compilar
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Instalar git (requerido por go mod para algunos módulos) y herramientas de build
RUN apk add --no-cache git gcc musl-dev

COPY go.mod ./
# go mod tidy asegura que las dependencias coincidan con el código
RUN go mod download

COPY . .
# Forzar validación de módulos antes de compilar
RUN go mod tidy
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
