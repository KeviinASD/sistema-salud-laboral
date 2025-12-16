# Etapa 1: Build
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para Prisma y compilación
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias (incluyendo devDependencies para build)
RUN npm ci

# Copiar el código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Etapa 2: Production
FROM node:20-alpine

# Instalar openssl para Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos compilados desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Crear directorio para uploads
RUN mkdir -p uploads && chmod 755 uploads

# Exponer puerto (ajusta según tu configuración)
EXPOSE 3000

# Variables de entorno por defecto (sobrescribir con .env o en Easypanel)
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]
