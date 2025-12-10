# Dockerfile para Backend (API) - Easypanel
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY api/package*.json ./api/

# Instalar dependencias
RUN npm install
RUN cd api && npm install

# Copiar código fuente
COPY api ./api

# Generar Prisma Client
RUN cd api && npm run prisma:generate

# Construir aplicación
RUN cd api && npm run build

# Crear directorio para uploads
RUN mkdir -p /app/api/uploads

# Exponer puerto
EXPOSE 4001

# Comando de inicio
WORKDIR /app/api
CMD ["npm", "start"]

