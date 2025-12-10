# Guía de Despliegue en Easypanel

Esta guía te ayudará a desplegar el Sistema de Salud Laboral en una VPS usando Easypanel.

## 📋 Requisitos Previos

- VPS con Easypanel instalado
- Acceso a la interfaz web de Easypanel
- Repositorio en GitHub (ya configurado: https://github.com/ivanfernandeze/sistema-salud-laboral)
- Dominio configurado (opcional pero recomendado)

## 🚀 Pasos de Despliegue

### 1. Acceder a Easypanel

1. Abre tu navegador y accede a la URL de tu Easypanel (generalmente `http://tu-vps-ip:3000` o tu dominio)
2. Inicia sesión con tus credenciales

### 2. Crear Proyecto

1. Haz clic en **"New Project"** o **"Crear Proyecto"**
2. Nombra el proyecto: `sistema-salud-laboral`
3. Haz clic en **"Create"**

### 3. Configurar Base de Datos PostgreSQL

1. En el proyecto, haz clic en **"Add Service"** o **"Agregar Servicio"**
2. Selecciona **"PostgreSQL"**
3. Configura:
   - **Name**: `postgres-db`
   - **Database**: `saludlaboral`
   - **User**: `saludlaboral` (o el que prefieras)
   - **Password**: Genera una contraseña segura (guárdala)
   - **Version**: `16` (o la última disponible)
4. Haz clic en **"Deploy"**
5. Espera a que se despliegue completamente
6. Anota la **Internal URL** (algo como `postgres://saludlaboral:password@postgres-db:5432/saludlaboral`)

### 4. Desplegar Backend (API)

1. En el mismo proyecto, haz clic en **"Add Service"**
2. Selecciona **"App"** o **"Aplicación"**
3. Configura la conexión al repositorio:
   - **Source**: GitHub
   - **Repository**: `ivanfernandeze/sistema-salud-laboral`
   - **Branch**: `main`
   - **Build Command**: 
     ```bash
     cd api && npm install && npm run prisma:generate && npm run build
     ```
   - **Start Command**: 
     ```bash
     cd api && npm start
     ```
   - **Root Directory**: `/api`
   - **Port**: `4001`

4. En **Environment Variables**, agrega:

   ```env
   # Base de datos (usa la Internal URL de PostgreSQL)
   DATABASE_URL=postgresql://saludlaboral:password@postgres-db:5432/saludlaboral?schema=public
   
   # JWT
   JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo_minimo_32_caracteres
   
   # Servidor
   PORT=4001
   NODE_ENV=production
   
   # API URL (ajusta con tu dominio)
   VITE_API_URL=https://tu-dominio.com/api
   
   # Email (configurar según tu proveedor)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-email@gmail.com
   SMTP_PASS=tu-app-password
   EMAIL_FROM=tu-email@gmail.com
   
   # SMS (opcional)
   SMS_API_KEY=tu-api-key
   SMS_API_URL=https://api.sms-provider.com
   
   # SUNAT (opcional)
   SUNAT_API_URL=https://api.sunat.com
   SUNAT_API_KEY=tu-api-key
   
   # Stripe (opcional)
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   
   # n8n Webhooks (ajusta con tus URLs)
   N8N_ADMISSION_WEBHOOK=https://tu-n8n-instance.com/webhook/admission-webhook
   N8N_INVENTARIO_AGOTADO=https://tu-n8n-instance.com/webhook/inventarioagotado
   N8N_FACTURA=https://tu-n8n-instance.com/webhook/factura
   ```

5. En **Volumes**, agrega un volumen para los uploads:
   - **Path**: `/api/uploads`
   - **Mount Path**: `/app/uploads`

6. Haz clic en **"Deploy"**

### 5. Ejecutar Migraciones de Base de Datos

Una vez que el backend esté desplegado:

1. Ve a la sección **"Terminal"** o **"Shell"** de tu servicio de backend
2. Ejecuta:
   ```bash
   cd api
   npm run db:push
   ```
3. (Opcional) Para poblar con datos de prueba:
   ```bash
   npm run seed
   ```

### 6. Desplegar Frontend (Web)

1. En el mismo proyecto, haz clic en **"Add Service"**
2. Selecciona **"App"** o **"Aplicación"**
3. Configura:
   - **Source**: GitHub
   - **Repository**: `ivanfernandeze/sistema-salud-laboral`
   - **Branch**: `main`
   - **Build Command**: 
     ```bash
     cd web && npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     cd web && npm run preview -- --port 3000 --host
     ```
   - **Root Directory**: `/web`
   - **Port**: `3000`

4. En **Environment Variables**, agrega:

   ```env
   # API URL (ajusta con la URL de tu backend)
   VITE_API_URL=https://api.tu-dominio.com/api
   
   # Stripe (si usas pagos)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

5. Haz clic en **"Deploy"**

### 7. Configurar Dominios y SSL

#### Para el Backend (API):

1. En el servicio del backend, ve a **"Domains"** o **"Dominios"**
2. Agrega un dominio: `api.tu-dominio.com`
3. Easypanel configurará automáticamente SSL con Let's Encrypt
4. Espera a que se active el certificado SSL

#### Para el Frontend (Web):

1. En el servicio del frontend, ve a **"Domains"**
2. Agrega tu dominio principal: `tu-dominio.com` (y `www.tu-dominio.com` si lo deseas)
3. Easypanel configurará automáticamente SSL

### 8. Configurar Proxy Reverso (Opcional pero Recomendado)

Si prefieres tener todo en un solo dominio:

1. Crea un nuevo servicio **"Nginx"** o **"Proxy"**
2. Configura las rutas:
   - `/api/*` → Backend (puerto 4001)
   - `/*` → Frontend (puerto 3000)
3. Agrega tu dominio principal a este servicio

O usa la configuración de Nginx personalizada en Easypanel:

```nginx
location /api {
    proxy_pass http://backend-service:4001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://frontend-service:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 9. Actualizar Variables de Entorno

Después de configurar los dominios, actualiza las variables de entorno:

**Backend:**
```env
VITE_API_URL=https://api.tu-dominio.com/api
```

**Frontend:**
```env
VITE_API_URL=https://api.tu-dominio.com/api
```

Reinicia ambos servicios después de actualizar.

### 10. Verificar el Despliegue

1. **Backend**: Visita `https://api.tu-dominio.com/api/health` (o la ruta de health que tengas)
2. **Frontend**: Visita `https://tu-dominio.com`
3. Verifica que puedas iniciar sesión

## 🔄 Actualizar el Proyecto

Para actualizar después de hacer cambios en GitHub:

1. Ve a cada servicio (backend y frontend)
2. Haz clic en **"Redeploy"** o **"Redesplegar"**
3. Easypanel automáticamente:
   - Obtendrá los últimos cambios de GitHub
   - Ejecutará el build command
   - Reiniciará el servicio

O configura **Auto Deploy** en la configuración del servicio para que se actualice automáticamente cuando hagas push a `main`.

## 📊 Monitoreo y Logs

### Ver Logs

1. En cada servicio, haz clic en **"Logs"**
2. Puedes ver logs en tiempo real
3. Filtra por nivel (info, error, etc.)

### Métricas

Easypanel muestra automáticamente:
- Uso de CPU
- Uso de RAM
- Tráfico de red
- Uso de disco

## 🔒 Seguridad

### Variables de Entorno Sensibles

- Nunca commitees archivos `.env` al repositorio
- Usa siempre las variables de entorno de Easypanel
- Rota las contraseñas regularmente

### Backups

1. Configura backups automáticos de la base de datos en Easypanel
2. O usa el servicio de backups integrado si está disponible

## 🐳 Alternativa: Despliegue con Docker Compose

Si prefieres usar Docker Compose directamente en Easypanel:

1. Crea un servicio **"Docker Compose"**
2. Usa el archivo `docker-compose.yml` del repositorio
3. Ajusta las variables de entorno según sea necesario

## 📝 Notas Importantes

- **Base de Datos**: Asegúrate de que la Internal URL de PostgreSQL esté correctamente configurada
- **Puertos**: Verifica que los puertos no entren en conflicto
- **Volúmenes**: Los uploads se guardan en volúmenes persistentes
- **SSL**: Easypanel maneja automáticamente los certificados SSL
- **Dominios**: Configura los DNS de tu dominio para apuntar a la IP de tu VPS

## 🆘 Solución de Problemas

### El backend no inicia

1. Revisa los logs en Easypanel
2. Verifica que `DATABASE_URL` esté correcta
3. Asegúrate de que las migraciones se hayan ejecutado

### El frontend no se conecta al backend

1. Verifica que `VITE_API_URL` apunte a la URL correcta del backend
2. Revisa la configuración CORS en el backend
3. Verifica que el backend esté accesible

### Error de conexión a la base de datos

1. Verifica que el servicio de PostgreSQL esté corriendo
2. Confirma que la Internal URL sea correcta
3. Revisa que el usuario y contraseña sean correctos

### SSL no funciona

1. Espera unos minutos (Let's Encrypt puede tardar)
2. Verifica que los DNS estén configurados correctamente
3. Revisa los logs de Easypanel para errores de certificado

## 📞 Recursos Adicionales

- [Documentación de Easypanel](https://easypanel.io/docs)
- [Guía de Docker](https://docs.docker.com/)
- [Documentación de Prisma](https://www.prisma.io/docs)

## ✅ Checklist de Despliegue

- [ ] PostgreSQL desplegado y funcionando
- [ ] Backend desplegado con todas las variables de entorno
- [ ] Migraciones de base de datos ejecutadas
- [ ] Frontend desplegado
- [ ] Dominios configurados
- [ ] SSL activo en todos los dominios
- [ ] Variables de entorno actualizadas con URLs correctas
- [ ] Servicios reiniciados
- [ ] Aplicación accesible y funcionando
- [ ] Logs verificados sin errores críticos

