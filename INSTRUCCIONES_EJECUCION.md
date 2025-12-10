# 🚀 Instrucciones para Ejecutar el Proyecto

## Estado Actual
✅ Todos los errores de compilación han sido corregidos
✅ El proyecto compila correctamente
⚠️ Los servidores necesitan configuración de base de datos

## Pasos para Ejecutar

### 1. Configurar Base de Datos PostgreSQL

**Opción A: Usar Docker (Recomendado)**
```bash
docker-compose up -d
```

**Opción B: PostgreSQL Local**
- Asegúrate de que PostgreSQL esté corriendo
- Crea la base de datos: `saludlaboral`
- Ejecuta el script SQL: `psql -U postgres -d saludlaboral -f db/postgres.sql`

### 2. Configurar Variables de Entorno

Crea el archivo `api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saludlaboral?schema=public"
API_PORT=4001
JWT_SECRET=dev_secret_key_change_in_production_12345
N8N_URL=http://localhost:5678
SERVICE_TOKEN=dev_service_token_12345
```

### 3. Generar Prisma Client
```bash
cd api
npm run prisma:generate
```

### 4. Inicializar Base de Datos (Primera vez)
```bash
cd api
npm run db:push
```

### 5. Crear Usuario Administrador (Opcional)
```bash
cd api
npm run seed
```

### 6. Ejecutar el Proyecto

**Desde la raíz del proyecto:**
```bash
npm run dev
```

Esto iniciará:
- **Backend API**: http://localhost:4001
- **Frontend Web**: http://localhost:5173

## Verificar que Funciona

1. Abre tu navegador en: http://localhost:5173
2. Deberías ver la página de login
3. Si creaste un usuario con seed, usa esas credenciales
4. Si no, crea un usuario desde la base de datos o el endpoint de registro

## Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Verifica la URL en `DATABASE_URL`
- Asegúrate de que la base de datos `saludlaboral` exista

### Error: "Port already in use"
- Cambia el puerto en `.env` (API_PORT)
- O detén el proceso que está usando el puerto

### Error: "Prisma Client not generated"
```bash
cd api
npm run prisma:generate
```

## URLs del Sistema

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4001
- **n8n** (si usas Docker): http://localhost:5678

## Credenciales por Defecto (si usas seed)

- Email: `admin@saludlaboral.pe`
- Password: `Admin123!`

