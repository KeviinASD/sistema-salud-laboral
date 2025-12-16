# ========================
# Etapa 1: Build
# ========================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copiar SOLO lo necesario desde /api
COPY api/package*.json ./
COPY api/prisma ./prisma/

RUN npm ci

# Copiar el resto del código de la API
COPY api .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# ========================
# Etapa 2: Production
# ========================
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copiar package.json para prod
COPY api/package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Copiar build y Prisma desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Crear carpeta uploads
RUN mkdir -p uploads && chmod 755 uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
