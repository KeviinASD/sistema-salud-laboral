# ---------- Etapa 1: Build ----------
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copiar dependencias
COPY api/package*.json ./
COPY api/prisma ./prisma/

RUN npm ci

# Copiar el código fuente
COPY api ./

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# ---------- Etapa 2: Production ----------
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY api/package*.json ./

RUN npm ci --only=production && npm cache clean --force

# Copiar build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p uploads && chmod 755 uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
