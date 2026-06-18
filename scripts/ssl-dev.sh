#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
#  Genera certificados AUTOFIRMADOS para desarrollo local con HTTPS.
#
#  Uso: bash scripts/ssl-dev.sh
#
#  Resultado:
#    ssl/certs/fullchain.pem
#    ssl/certs/privkey.pem
#    ssl/dhparam.pem
#
#  El navegador mostrará "Conexión no segura" — es normal con autofirmados.
#  Haz clic en "Avanzado → Continuar" para acceder.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

mkdir -p ssl/certs

echo "Generando certificado autofirmado para localhost..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/certs/privkey.pem \
  -out ssl/certs/fullchain.pem \
  -subj "/C=CO/ST=Cundinamarca/L=Bogota/O=ELITE Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null

echo "Generando parámetros DH (puede tardar ~30 segundos)..."
openssl dhparam -out ssl/dhparam.pem 2048 2>/dev/null

echo ""
echo "Listo. Certificados en ssl/"
echo ""
echo "Siguiente paso:"
echo "  docker compose -f docker-compose.yml -f docker-compose.https.yml up --build"
