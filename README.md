# Sistema Inteligente de Salud Laboral

Sistema integral para clínicas, hospitales y empresas que brindan servicios de salud ocupacional en Perú, cumpliendo con la Ley N° 29783 de Seguridad y Salud en el Trabajo.

## 🏗️ Arquitectura

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Express + TypeScript + Prisma ORM
- **Base de Datos**: PostgreSQL
- **Automatización**: n8n
- **Servicios Externos**: SUNAT, SMS, Email, Pagos, Biométrico

## 📋 Módulos del Sistema

1. **Módulo de Configuración y Administración**
   - Gestión de usuarios y roles (RBAC)
   - Configuración de la clínica
   - Integraciones externas
   - Plantillas de documentos

2. **Módulo de Admisiones y Gestión de Turnos**
   - Registro de pacientes y empresas
   - Programación de citas
   - Carga de documentos
   - Calendario integrado

3. **Módulo de Historia Clínica Ocupacional**
   - Repositorio central de información médica
   - Exámenes y evolución del paciente
   - Antecedentes laborales y médicos

4. **Módulo de Laboratorio Clínico**
   - Recepción de muestras
   - Registro de resultados
   - Notificaciones automáticas

5. **Módulo de Concepto de Aptitud**
   - Generación de informes
   - PDF con firma digital
   - Cumplimiento normativo Ley 29783

6. **Módulo de Facturación y Tesorería**
   - Facturación electrónica SUNAT
   - Gestión de pagos
   - Control de caja
   - Reportes financieros

7. **Módulo de Inventario y Logística**
   - Gestión de insumos médicos
   - Alertas de stock
   - Seguimiento de servicios

8. **Módulo de Identificación Biométrica**
   - Integración con lectores de huella
   - Identificación rápida de pacientes

9. **Módulo de Informes y Analítica**
   - Dashboards
   - Reportes personalizables
   - Exportación de datos

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- PostgreSQL 16+ (o usar Docker)

### Pasos de Instalación

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd semana15
```

2. **Configurar variables de entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saludlaboral?schema=public"

# API
API_PORT=4001
JWT_SECRET=tu_secret_jwt_aqui
N8N_URL=http://localhost:5678
SERVICE_TOKEN=tu_token_servicio

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password

# SMS
SMS_API_KEY=tu_api_key
SMS_PROVIDER=twilio

# SUNAT
SUNAT_USER=tu_usuario
SUNAT_PASS=tu_password
SUNAT_ENV=beta

# Pagos
PAYMENT_GATEWAY=stripe
PAYMENT_API_KEY=tu_api_key
```

3. **Iniciar servicios con Docker**

```bash
docker-compose up -d
```

Esto iniciará:
- PostgreSQL en el puerto 5432
- n8n en el puerto 5678

4. **Instalar dependencias**

```bash
npm install
npm run prisma:generate
```

5. **Configurar base de datos**

```bash
# Opción 1: Usar Prisma Migrate
npm run db:push

# Opción 2: Ejecutar SQL directamente
psql -U postgres -d saludlaboral -f db/postgres.sql
```

6. **Crear usuario administrador**

```bash
npm run seed
```

7. **Iniciar servidores de desarrollo**

```bash
npm run dev
```

Esto iniciará:
- API Backend en http://localhost:4001
- Frontend Web en http://localhost:5173

## 📦 Estructura del Proyecto

```
semana15/
├── api/                    # Backend API
│   ├── src/
│   │   ├── index.ts        # Servidor Express
│   │   ├── services/       # Servicios externos
│   │   └── utils/           # Utilidades
│   ├── prisma/
│   │   ├── schema.prisma   # Schema de base de datos
│   │   └── seed.ts         # Datos iniciales
│   └── package.json
├── web/                    # Frontend React
│   ├── src/
│   │   ├── pages/          # Páginas
│   │   ├── components/     # Componentes
│   │   └── api.ts          # Cliente API
│   └── package.json
├── n8n/                    # Workflows de n8n
│   ├── admission_workflow.json
│   └── aptitude_workflow.json
├── db/                     # Scripts SQL
│   └── postgres.sql
├── docker-compose.yml      # Configuración Docker
└── README.md
```

## 🔧 Configuración de n8n

1. Acceder a n8n: http://localhost:5678
2. Credenciales por defecto:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. Importar workflows desde la carpeta `n8n/`
4. Configurar credenciales de:
   - PostgreSQL (conectar a la base de datos)
   - Email (SMTP)
   - SMS (proveedor)

## 👥 Roles de Usuario

- **admin**: Administrador del sistema
- **admissions**: Personal de admisiones
- **doctor**: Médico ocupacional / Especialista
- **lab**: Personal de laboratorio
- **patient**: Paciente / Trabajador

## 📝 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/me` - Obtener usuario actual

### Admisiones
- `GET /api/admissions` - Listar admisiones
- `POST /api/admissions` - Crear admisión
- `GET /api/admissions/:id` - Obtener admisión
- `PUT /api/admissions/:id` - Actualizar admisión

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Crear paciente
- `GET /api/patients?dni=12345678` - Buscar por DNI

### Historia Clínica
- `GET /api/medical-records` - Listar registros
- `POST /api/medical-records` - Crear registro

### Laboratorio
- `GET /api/lab-results` - Listar resultados
- `POST /api/lab-results` - Crear resultado

### Concepto de Aptitud
- `POST /api/concepts` - Crear concepto
- `GET /api/concepts` - Listar conceptos

### Facturación
- `GET /api/invoices` - Listar facturas
- `POST /api/invoices` - Crear factura
- `POST /api/invoices/:id/sendSunat` - Enviar a SUNAT

### Administración
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/settings` - Obtener configuración
- `PUT /api/settings` - Actualizar configuración

## 🔒 Seguridad

- Autenticación JWT
- Encriptación de contraseñas (bcrypt)
- RBAC (Role-Based Access Control)
- Logs de auditoría
- Validación de datos según Ley 29783

## 📄 Licencia

Este proyecto es privado y confidencial.

## 🤝 Contribución

Para contribuir al proyecto, por favor contactar al equipo de desarrollo.

## 🚀 Despliegue en VPS

### Easypanel (Recomendado)

Para desplegar en una VPS con Easypanel, consulta la [Guía de Despliegue en Easypanel](DEPLOY_EASYPANEL.md).

### Despliegue Manual

Para desplegar manualmente en una VPS, consulta la [Guía de Despliegue Manual](DEPLOY.md).

### Despliegue Rápido

1. Clona el repositorio en tu VPS
2. Sigue los pasos detallados según tu método de despliegue
3. Usa el script `deploy.sh` para actualizaciones futuras (solo despliegue manual)

## 📞 Soporte

Para soporte técnico, contactar al administrador del sistema.

