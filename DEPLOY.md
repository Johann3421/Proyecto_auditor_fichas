# Guía Maestra de Despliegue en Dokploy (Arquitectura Go + Next.js)

Esta guía detalla el despliegue del monorepo CEAM Auditor en un servidor VPS gestionado con Dokploy tras haber realizado la reescritura de alta concurrencia del motor backend en Go 1.22+.

---

## 🚀 PASO 1: Subir el código a tu repositorio Git
Dado que Dokploy se alimenta de tu repositorio de control de versiones, este debe estar subido en tu proveedor de Git (ej. GitHub, GitLab, Bitbucket).

Si aún no lo has subido, en tu terminal ejecuta:
```bash
git commit -m "feat: backend go 1.22 e inicializacion del monorepo"
git branch -M main
git remote add origin https://github.com/TuUsuario/TuRepositorio.git
git push -u origin main
```
*(Nota: Asegúrate de **NUNCA** empujar tus contraseñas reales. Todos los `.env` ya están en el `.gitignore` y tienes versiones seguras en tus `.env.example`).*

---

## 🐳 PASO 2: Crear el Proyecto Dokploy (Compose App)
Dokploy desplegará todo conectando una instancia `docker-compose`.

1. Entra a tu panel Dokploy web.
2. Navega al apartado **Applications -> Compose** y presiona **Add Compose**.
3. Nombra tu stack (ej: `ceam-auditor`).
4. Selecciona Git como **Source** y enlaza el repositorio que acabas de subir al repositorio de tu plataforma.
5. Fija la rama (`main`).
6. **Compose Path:** Asegúrate de escribir allí `docker-compose.prod.yml` (esto evitará que se crucen dependencias de desarrollo local y montará Traefik correctamente).
7. **No des clic a Deploy todavía**, necesitamos vincular de inmediato tus variables de entorno para que el build del Stage 1 cargue adecuadamente la metadata.

---

## 🔑 PASO 3: Inyección Local de Variables
Para no requerir configuración hardcodeada, configuraremos el panel "Environment" en Dokploy para el entorno del Dokploy y que la asigne automáticamente a los tres contenedores.
Copia y pega este bloque y **edita todos los valores sensibles**.

```env
# ==========================================
# 1. BASE DE DATOS POSTGRES MÍNIMA
# ==========================================
POSTGRES_USER=ceam_admin
POSTGRES_PASSWORD=elige_un_password_alfanumerico_seguro
POSTGRES_DB=ceam_db

# ==========================================
# 2. ENDPOINTS INTERNOS DE BACKEND GO
# ==========================================
DATABASE_URL=postgres://ceam_admin:elige_un_password_alfanumerico_seguro@ceam-postgres:5432/ceam_db?sslmode=disable
SECRET_KEY=GeneraUnaClaveMuyLargaYSeguraAquíParaTusJWT
N8N_WEBHOOK_URL=https://n8n.tuempresa.com/webhook/ceam-semanal
CEAM_DATA_URL=https://api-ceam.gob.pe/endpoint-oficial
# URLs separadas por coma en las que permitirás conexiones web puras. Importante registrar la final HTTPS
CORS_ORIGINS=https://auditor.tudominio.com

# Para el reverse proxy automático (Traefik) incrustado en el Dokploy host:
BACKEND_DOMAIN=api-auditor.tudominio.com
FRONTEND_DOMAIN=auditor.tudominio.com

# ==========================================
# 3. ENDPOINTS INTERNOS NEXT.JS 14
# ==========================================
NEXTAUTH_SECRET=HashSeguroParaSesionNextJS
NEXTAUTH_URL=https://auditor.tudominio.com
# Conexión nativa Container-To-Container dentro del servidor SSR
NEXT_PUBLIC_API_URL=http://ceam-backend:8080
```
Guarda estas variables antes de continuar.

---

## 🏗 PASO 4: Iniciar el Despliegue 
1. Vuelve a la pestaña **Deployments** y haz clic en el botón azul de **Deploy**.
2. Dale unos minutos (2-4 min). Dokploy bajará el motor de `golang:1.22-alpine` pesado en Stage 1, compilará un microbinary, y lo exportará en `alpine:3.19` (Stage 2) que solo pesará ~15mb. Hará el build de producción equivalente de Next.js.
3. El estado de la aplicación debe brillar en **Running**. Revisa los **Logs** del `ceam-backend` y asegúrate de que muestre que el HTTP Service corrió en el puerto 8080.

---

## 🛠 PASO 5: Base de Datos y Migraciones de Go
A diferencia de Python o entornos locales, en Dokploy **no tienes que hacer NADA** para correr la migración.
El diseño implementado en este backend con `golang-migrate` asegura que siempre que inicie el contenedor de Go verifique y ejecute `RunMigrations("file://migrations")` creando todas las tablas, enums, triggers, índices nativos bajo validación transaccional ANTES de subir las APIs.

**Verificación:** 
Si los logs de Dokploy dentro de tu `ceam-backend` dicen `"Database migrations applied successfully"`, significa que el esquema y PGX han hecho paridad correctamente.

---

## 🌐 PASO 6: Dominios, DNS y Seguridad de Red (TLS/SSL)

Dado que Dokploy te muestra una pestaña llamada **Domains** (como viste en tu panel), debes configurar ahí tus dominios reales:

1. Entra a tu proveedor de DNS (Cloudflare, GoDaddy, Hostinger).
2. Crea **dos registros tipo A** y apúntalos a la **IP de tu servidor Dokploy**:
   - `auditor.tudominio.com` -> `IP Pública`
   - `api-auditor.tudominio.com` -> `IP Pública`
3. Ve a Dokploy -> Tu Aplicación -> Pestaña **Domains**.
4. Dale a **Add Domain** (Backend):
   - **Service:** `ceam-backend`
   - **Port:** `8080` (Usa siempre el puerto interno aquí).
   - **Domain:** `api-auditor.tudominio.com`
5. Dale a **Add Domain** (Frontend):
   - **Service:** `ceam-frontend`
   - **Port:** `3000`
   - **Domain:** `auditor.tudominio.com`

---

## 🤔 RESOLUTOR FRECUENTE (TROUBLESHOOTING DOKPLOY)

- **Falla Next-Auth SignIn y devuelve URL con http o localhost:** Verifica estrictamente haber guardado `NEXTAUTH_URL` correcta antes de buildear Next.js y en los settings base. 
- **Error Cors desde la URL del Frontend:** `ceam-backend` está rechazando la lectura. Verifica no haber puesto `/` al final de tus `CORS_ORIGINS`. Ejemplo correcto: `https://auditor.tudominio.com`. Next.js corre bajo servidor interno de docker así que desde el server rutea por `http://ceam-backend:8080` (Ocupado de `NEXT_PUBLIC_API_URL`).
- **Cannot connect to Postgres:** Corrobora no usar IPs host en tu DATABASE_URL. Estás adentro del Dokploy interno, debes apuntar al host docker `ceam-postgres:5432` como lo describe este archivo.
