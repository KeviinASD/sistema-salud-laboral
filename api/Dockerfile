# ---------- Etapa 1: Build ----------
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar archivos de dependencias (desde la raíz del contexto que es api/)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Copiar el código fuente completo
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript a JavaScript
RUN npm run build

# ---------- Etapa 2: Production ----------
FROM node:20-alpine

# Instalar openssl para Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos compilados desde la etapa builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Crear directorio para uploads con permisos correctos
RUN mkdir -p uploads && chmod 755 uploads

# Exponer el puerto de la aplicación
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Comando para ejecutar la aplicación
CMD ["node", "dist/index.js"]
