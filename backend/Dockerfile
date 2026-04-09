# Stage 1: compilar
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Instalar git (requerido por go mod para algunos módulos)
RUN apk add --no-cache git

COPY go.mod ./
# go mod tidy genera el go.sum correcto descargando las dependencias
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /ceam-server ./cmd/server

# Stage 2: imagen final mínima
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /ceam-server /ceam-server
EXPOSE 8080
CMD ["/ceam-server"]
