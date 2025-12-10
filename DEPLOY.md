# Guía de Despliegue en VPS

Esta guía te ayudará a desplegar el Sistema de Salud Laboral en una VPS (Ubuntu/Debian).

## 📋 Requisitos Previos

- VPS con Ubuntu 20.04+ o Debian 11+
- Acceso SSH a la VPS
- Dominio configurado apuntando a la IP de la VPS (opcional pero recomendado)
- Al menos 2GB de RAM y 20GB de almacenamiento

## 🚀 Pasos de Despliegue

### 1. Conectarse a la VPS

```bash
ssh usuario@tu-vps-ip
```

### 2. Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Instalar dependencias básicas

```bash
sudo apt install -y curl wget git build-essential
```

### 4. Instalar Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verificar instalación (debe ser v20.x)
```

### 5. Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear usuario y base de datos
sudo -u postgres psql << EOF
CREATE USER saludlaboral WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE saludlaboral OWNER saludlaboral;
GRANT ALL PRIVILEGES ON DATABASE saludlaboral TO saludlaboral;
\q
EOF
```

### 6. Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7. Instalar PM2 (Gestor de procesos)

```bash
sudo npm install -g pm2
```

### 8. Clonar el repositorio

```bash
cd /var/www
sudo git clone https://github.com/ivanfernandeze/sistema-salud-laboral.git
sudo chown -R $USER:$USER sistema-salud-laboral
cd sistema-salud-laboral
```

### 9. Configurar variables de entorno

```bash
# Backend
cd api
cp .env.example .env  # Si existe, o crear uno nuevo
nano .env
```

Configura las siguientes variables en `api/.env`:

```env
# Base de datos
DATABASE_URL="postgresql://saludlaboral:tu_password_seguro@localhost:5432/saludlaboral?schema=public"

# JWT
JWT_SECRET="tu_jwt_secret_muy_seguro_y_largo"

# Servidor
PORT=4001
NODE_ENV=production

# API URLs
VITE_API_URL=https://tu-dominio.com

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

# n8n Webhooks
N8N_ADMISSION_WEBHOOK=https://tu-n8n-instance.com/webhook/admission-webhook
N8N_INVENTARIO_AGOTADO=https://tu-n8n-instance.com/webhook/inventarioagotado
N8N_FACTURA=https://tu-n8n-instance.com/webhook/factura
```

```bash
# Frontend
cd ../web
cp .env.example .env  # Si existe, o crear uno nuevo
nano .env
```

Configura en `web/.env`:

```env
VITE_API_URL=https://tu-dominio.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Si usas Stripe
```

### 10. Instalar dependencias y construir

```bash
# Desde la raíz del proyecto
cd /var/www/sistema-salud-laboral

# Instalar dependencias
npm install

# Generar Prisma Client
cd api
npm run prisma:generate

# Ejecutar migraciones
npm run db:push

# (Opcional) Poblar base de datos con datos de prueba
npm run seed

# Construir backend
npm run build

# Construir frontend
cd ../web
npm run build
```

### 11. Configurar PM2 para el backend

```bash
cd /var/www/sistema-salud-laboral/api

# Crear archivo de configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'salud-laboral-api',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Crear directorio de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema
pm2 startup
# Ejecutar el comando que te muestre
```

### 12. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/salud-laboral
```

Agrega la siguiente configuración:

```nginx
# Redirección HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (se configurarán con Certbot)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Tamaño máximo de archivo
    client_max_body_size 50M;

    # Frontend (React)
    location / {
        root /var/www/sistema-salud-laboral/web/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Archivos estáticos de la API
    location /api/public {
        alias /var/www/sistema-salud-laboral/api/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Habilita el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/salud-laboral /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl reload nginx
```

### 13. Configurar SSL con Let's Encrypt (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Certbot configurará automáticamente los certificados y renovará cada 90 días.

### 14. Configurar firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 15. Verificar que todo funciona

```bash
# Verificar PM2
pm2 status
pm2 logs salud-laboral-api

# Verificar Nginx
sudo systemctl status nginx

# Verificar PostgreSQL
sudo systemctl status postgresql

# Probar la API
curl http://localhost:4001/api/health
```

## 🔄 Actualizar el Proyecto

Para actualizar el proyecto después de hacer cambios:

```bash
cd /var/www/sistema-salud-laboral

# Obtener últimos cambios
git pull origin main

# Reinstalar dependencias si hay cambios
npm install
cd api && npm install && cd ..
cd web && npm install && cd ..

# Regenerar Prisma si hay cambios en el schema
cd api
npm run prisma:generate
npm run db:push

# Reconstruir
cd api && npm run build && cd ..
cd web && npm run build && cd ..

# Reiniciar PM2
pm2 restart salud-laboral-api

# Recargar Nginx
sudo systemctl reload nginx
```

## 📊 Monitoreo

### Ver logs de PM2

```bash
pm2 logs salud-laboral-api
pm2 monit
```

### Ver logs de Nginx

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## 🐳 Alternativa: Despliegue con Docker

Si prefieres usar Docker, puedes usar el `docker-compose.yml` existente:

```bash
# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clonar repositorio
cd /var/www
git clone https://github.com/ivanfernandeze/sistema-salud-laboral.git
cd sistema-salud-laboral

# Configurar variables de entorno
# Editar docker-compose.yml y archivos .env

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 🔒 Seguridad Adicional

1. **Cambiar puerto SSH**: Editar `/etc/ssh/sshd_config`
2. **Deshabilitar login root**: `sudo passwd -l root`
3. **Configurar fail2ban**: `sudo apt install fail2ban`
4. **Backups automáticos**: Configurar cron jobs para backups de BD

## 📝 Notas Importantes

- Asegúrate de cambiar todas las contraseñas por defecto
- Configura backups regulares de la base de datos
- Monitorea el uso de recursos (CPU, RAM, disco)
- Mantén el sistema actualizado regularmente
- Revisa los logs periódicamente

## 🆘 Solución de Problemas

### La API no inicia
```bash
pm2 logs salud-laboral-api
cd api && npm run build
```

### Error de conexión a la base de datos
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

### Nginx no sirve el frontend
```bash
sudo nginx -t
sudo systemctl status nginx
ls -la /var/www/sistema-salud-laboral/web/dist
```

## 📞 Soporte

Para más ayuda, consulta los logs o revisa la documentación del proyecto.

