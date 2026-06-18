#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  Obtiene certificados REALES de Let's Encrypt para producción.
#
#  Uso: bash scripts/ssl-certbot.sh tudominio.com tu@email.com
#
#  Requisitos:
#    - El dominio ya debe apuntar a este servidor (DNS configurado)
#    - Puerto 80 libre (Certbot lo usa brevemente para el challenge)
#    - Docker instalado
#
#  Resultado: ssl/certs/fullchain.pem  y  ssl/certs/privkey.pem
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DOMAIN="${1:?Uso: ssl-certbot.sh <dominio> <email>  Ej: ssl-certbot.sh mitienda.com admin@mitienda.com}"
EMAIL="${2:?Uso: ssl-certbot.sh <dominio> <email>}"

mkdir -p ssl/certs ssl/letsencrypt

echo "Obteniendo certificado para ${DOMAIN}..."
echo "Certbot usará el puerto 80 brevemente. Asegúrate de que esté libre."
echo ""

# Detener contenedores que usen el puerto 80 si están corriendo
docker compose down 2>/dev/null || true

# Obtener certificado
docker run --rm \
  -p 80:80 \
  -v "$(pwd)/ssl/letsencrypt:/etc/letsencrypt" \
  certbot/certbot certonly \
  --standalone \
  --agree-tos \
  --no-eff-email \
  --email "${EMAIL}" \
  -d "${DOMAIN}"

# Copiar certificados a la ruta que usa nginx.conf
cp "ssl/letsencrypt/live/${DOMAIN}/fullchain.pem" ssl/certs/fullchain.pem
cp "ssl/letsencrypt/live/${DOMAIN}/privkey.pem"   ssl/certs/privkey.pem
chmod 644 ssl/certs/fullchain.pem
chmod 600 ssl/certs/privkey.pem

# Generar DH params si no existen
if [ ! -f ssl/dhparam.pem ]; then
  echo "Generando parámetros DH (puede tardar varios minutos)..."
  openssl dhparam -out ssl/dhparam.pem 4096 2>/dev/null
fi

echo ""
echo "Certificados instalados en ssl/certs/"
echo ""
echo "Ahora levanta producción con:"
echo "  docker compose -f docker-compose.prod.yml up --build -d"
