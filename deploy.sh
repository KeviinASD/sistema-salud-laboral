#!/bin/bash

# Script de despliegue automático para VPS
# Uso: ./deploy.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue del Sistema de Salud Laboral..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: No se encontró package.json. Ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Directorio correcto${NC}"

# Obtener últimos cambios
echo -e "${YELLOW}📥 Obteniendo últimos cambios de Git...${NC}"
git pull origin main || echo -e "${YELLOW}⚠ No se pudo hacer pull (puede ser normal en primera ejecución)${NC}"

# Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm install

# Backend
echo -e "${YELLOW}🔧 Configurando backend...${NC}"
cd api

# Verificar que existe .env
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠ Error: No se encontró api/.env${NC}"
    echo -e "${YELLOW}Por favor, crea el archivo api/.env con las variables necesarias${NC}"
    exit 1
fi

# Generar Prisma Client
echo -e "${YELLOW}🗄️ Generando Prisma Client...${NC}"
npm run prisma:generate

# Ejecutar migraciones
echo -e "${YELLOW}🔄 Ejecutando migraciones de base de datos...${NC}"
npm run db:push || echo -e "${YELLOW}⚠ Error en migraciones (puede ser normal si ya están aplicadas)${NC}"

# Construir backend
echo -e "${YELLOW}🏗️ Construyendo backend...${NC}"
npm run build

cd ..

# Frontend
echo -e "${YELLOW}🎨 Configurando frontend...${NC}"
cd web

# Verificar que existe .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ No se encontró web/.env, creando uno básico...${NC}"
    echo "VITE_API_URL=https://tu-dominio.com/api" > .env
fi

# Construir frontend
echo -e "${YELLOW}🏗️ Construyendo frontend...${NC}"
npm run build

cd ..

# Reiniciar PM2 si está instalado
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 Reiniciando aplicación con PM2...${NC}"
    pm2 restart salud-laboral-api || echo -e "${YELLOW}⚠ PM2 no está corriendo o la app no existe${NC}"
else
    echo -e "${YELLOW}⚠ PM2 no está instalado. Instala con: npm install -g pm2${NC}"
fi

# Recargar Nginx si está instalado
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}🔄 Recargando Nginx...${NC}"
    sudo nginx -t && sudo systemctl reload nginx || echo -e "${YELLOW}⚠ Error al recargar Nginx${NC}"
fi

echo -e "${GREEN}✅ Despliegue completado exitosamente!${NC}"
echo -e "${GREEN}📊 Verifica el estado con: pm2 status${NC}"

