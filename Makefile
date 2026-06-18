# ──────────────────────────────────────────────────────────────────────────────
#  ELITE — Comandos Docker
#  Uso: make <comando>
# ──────────────────────────────────────────────────────────────────────────────

.PHONY: dev dev-build dev-stop dev-logs dev-clean \
        prod prod-build prod-stop prod-logs \
        backend-logs frontend-logs \
        ps clean help

# ── Desarrollo ────────────────────────────────────────────────────────────────

dev:          ## Levantar en dev HTTP puerto 80 (sin rebuild)
	docker compose up

dev-build:    ## Levantar en dev HTTP puerto 80 con rebuild
	docker compose up --build

dev-https:    ## Levantar en dev HTTPS puerto 443 (requiere: make ssl-dev primero)
	docker compose -f docker-compose.yml -f docker-compose.https.yml up --build

dev-stop:     ## Detener dev
	docker compose down

dev-logs:     ## Ver logs de dev en tiempo real
	docker compose logs -f

dev-clean:    ## Borrar contenedores + volúmenes dev (pierde datos SQLite)
	docker compose down -v --remove-orphans

# ── Producción ────────────────────────────────────────────────────────────────

prod:         ## Levantar en producción (sin rebuild)
	docker compose -f docker-compose.prod.yml up -d

prod-build:   ## Levantar en producción con rebuild
	docker compose -f docker-compose.prod.yml up --build -d

prod-stop:    ## Detener producción
	docker compose -f docker-compose.prod.yml down

prod-logs:    ## Ver logs de producción
	docker compose -f docker-compose.prod.yml logs -f

# ── Utilidades ────────────────────────────────────────────────────────────────

backend-logs: ## Ver logs del backend solamente
	docker compose logs -f backend

frontend-logs: ## Ver logs del frontend solamente
	docker compose logs -f frontend

ssl-dev:      ## Generar certificados autofirmados para HTTPS local
	bash scripts/ssl-dev.sh

ssl-prod:     ## Obtener certificado Let's Encrypt (uso: make ssl-prod D=midominio.com E=email@x.com)
	bash scripts/ssl-certbot.sh $(D) $(E)

ps:           ## Ver estado de los contenedores
	docker compose ps

clean:        ## Limpiar imágenes y cache de Docker
	docker system prune -f

help:         ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
