# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY web/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar archivos de configuración
COPY web/tsconfig.json ./
COPY web/vite.config.ts ./
COPY web/tailwind.config.ts ./
COPY web/postcss.config.js ./
COPY web/index.html ./

# Copiar el código fuente
COPY web/src ./src

# Copiar archivo .env si existe
COPY web/.env* ./

# Build de producción
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copiar archivos build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx personalizada (opcional)
# COPY web/nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
