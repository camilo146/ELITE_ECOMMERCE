# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias primero (capa cacheada, solo se invalida si cambia package*.json)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copiar código fuente
COPY . .

# VITE_API_URL en Docker siempre es /api (Nginx hace el proxy al backend)
# En dev local sin Docker se usa el proxy de Vite (vite.config.js)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Runtime stage (Nginx) ─────────────────────────────────────────────────────
FROM nginx:1.25-alpine

# Copiar build de React
COPY --from=build /app/dist /usr/share/nginx/html

# Config de Nginx (se puede sobrescribir con volume mount en compose)
COPY nginx.dev.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
