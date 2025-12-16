# Guía de Despliegue en Easypanel

## Pasos para desplegar la API en Easypanel

### 1. Preparar el repositorio
Asegúrate de que tu código esté en un repositorio Git (GitHub, GitLab, etc.)

### 2. Crear la aplicación en Easypanel

1. Accede a tu panel de Easypanel
2. Crea un nuevo proyecto
3. Selecciona "Deploy from GitHub" (o tu proveedor Git)
4. Conecta tu repositorio
5. Configura la ruta del Dockerfile: `api/Dockerfile`
6. Configura el contexto de build: `api/`

### 3. Variables de entorno necesarias

Configura estas variables de entorno en Easypanel:

```bash
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/nombre_db?schema=public

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro

# Puerto (Easypanel lo configura automáticamente)
PORT=3000

# Node
NODE_ENV=production

# CORS (ajusta según tu dominio frontend)
CORS_ORIGIN=https://tu-dominio-frontend.com

# Email (si usas nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password

# Stripe (si aplica)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (si aplica)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_key_publica
```

### 4. Configuración de Base de Datos

Si no tienes una base de datos PostgreSQL:

1. En Easypanel, crea un nuevo servicio de PostgreSQL
2. Copia la URL de conexión
3. Añádela como variable `DATABASE_URL`

### 5. Ejecutar migraciones de Prisma

Después del primer despliegue, ejecuta:

```bash
# Opción 1: En el contenedor (desde Easypanel terminal)
npx prisma db push

# Opción 2: Agrega un comando de inicio personalizado en Easypanel
# CMD: sh -c "npx prisma db push && node dist/index.js"
```

### 6. Verificar el despliegue

1. Revisa los logs en Easypanel
2. Accede a la URL asignada
3. Prueba los endpoints principales

## Comandos útiles

### Build local (opcional para testing)
```bash
cd api
docker build -t api-salud-laboral .
docker run -p 3000:3000 --env-file .env api-salud-laboral
```

### Verificar que el contenedor funciona
```bash
docker ps
docker logs <container_id>
```

## Troubleshooting

### Error de Prisma Client
Si ves errores relacionados con Prisma Client:
- Asegúrate de que `npx prisma generate` se ejecute en el build
- Verifica que `node_modules/.prisma` se copie correctamente

### Error de conexión a base de datos
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos sea accesible desde el contenedor
- Revisa los parámetros de conexión (SSL, timeouts, etc.)

### Archivos uploads no persisten
- Configura un volumen persistente en Easypanel para `/app/uploads`
- Alternativamente, usa almacenamiento en la nube (S3, Cloudinary, etc.)

## Optimizaciones recomendadas

1. **Multi-stage build**: El Dockerfile ya usa multi-stage para reducir el tamaño
2. **Health checks**: Añade un endpoint `/health` en tu API
3. **Logs**: Usa un logger como Winston o Pino
4. **Monitoring**: Configura alertas en Easypanel
5. **Backups**: Configura backups automáticos de la base de datos

## Comandos de inicio personalizados

Si necesitas ejecutar comandos antes de iniciar la app:

```dockerfile
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
```

O crea un script `start.sh`:

```bash
#!/bin/sh
npx prisma db push
node dist/index.js
```

Luego en Dockerfile:
```dockerfile
COPY start.sh .
RUN chmod +x start.sh
CMD ["./start.sh"]
```
