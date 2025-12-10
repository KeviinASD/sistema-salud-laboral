# Plan de Implementación Completa - Sistema Inteligente de Salud Laboral

## Estado Actual
- ✅ Base de datos SQL actualizada con tablas principales
- ✅ Schema Prisma básico creado
- ✅ Docker Compose configurado
- ⚠️ Backend API parcial (usa modelos antiguos)
- ⚠️ Frontend básico (React simple)
- ⚠️ Workflows n8n básicos

## Orden de Implementación según doc.md

### FASE 1: Base de Datos Completa ✅
1. ✅ Tablas principales (usuarios, empresas, pacientes, admisiones)
2. ✅ Tablas de historia clínica
3. ✅ Tablas de facturación
4. ✅ Tablas de inventario
5. ✅ Tablas adicionales (config_turnos, tipos_examen, etc.)

### FASE 2: Backend API Completo
**Prioridad: ALTA**

#### 2.1 Módulo de Admisiones
- [ ] `/api/admissions` - CRUD completo
- [ ] `/api/admissions/calendar/*` - Calendario y horarios
- [ ] `/api/admissions/companies/*` - Gestión de empresas
- [ ] `/api/admissions/documents/*` - Carga de documentos

#### 2.2 Módulo de Historia Clínica
- [ ] `/api/medical/clinical-history/*` - CRUD historia clínica
- [ ] `/api/medical/exams/*` - Exámenes especializados
- [ ] `/api/medical/vitals/*` - Signos vitales

#### 2.3 Módulo de Laboratorio
- [ ] `/api/laboratory/samples/*` - Recepción de muestras
- [ ] `/api/laboratory/tests/*` - Resultados de exámenes
- [ ] `/api/laboratory/equipment/*` - Integración con equipos

#### 2.4 Módulo de Concepto de Aptitud
- [ ] `/api/concepto-aptitud/*` - CRUD conceptos
- [ ] `/api/concepto-aptitud/generate-pdf` - Generación PDF

#### 2.5 Módulo de Facturación
- [ ] `/api/facturacion/facturas/*` - CRUD facturas
- [ ] `/api/facturacion/pagos/*` - Gestión de pagos
- [ ] `/api/facturacion/sunat/*` - Integración SUNAT
- [ ] `/api/facturacion/caja/*` - Control de caja

#### 2.6 Módulo de Inventario
- [ ] `/api/inventario/items/*` - Gestión de inventario
- [ ] `/api/inventario/movimientos/*` - Movimientos
- [ ] `/api/logistica/*` - Seguimiento logístico

#### 2.7 Módulo de Biométrico
- [ ] `/api/biometric/register` - Registro biométrico
- [ ] `/api/biometric/verify` - Verificación
- [ ] `/api/biometric/devices/*` - Gestión de dispositivos

#### 2.8 Módulo de Analytics
- [ ] `/api/analytics/reports` - Generación de reportes
- [ ] `/api/analytics/dashboards` - Dashboards
- [ ] `/api/analytics/exports` - Exportación de datos

### FASE 3: Frontend Completo
**Prioridad: ALTA**

#### 3.1 Layouts y Componentes Base
- [ ] `components/Layout/AppHeader.vue`
- [ ] `components/Layout/AppSidebar.vue`
- [ ] Componentes reutilizables (tables, forms, modals)

#### 3.2 Páginas Principales
- [ ] `pages/index.vue` - Dashboard principal
- [ ] `pages/dashboard.vue` - Dashboard con estadísticas
- [ ] `pages/login.vue` - Login mejorado

#### 3.3 Módulo de Administración
- [ ] `pages/admin/index.vue` - Dashboard admin
- [ ] `pages/admin/users.vue` - Gestión de usuarios
- [ ] `pages/admin/clinic-settings.vue` - Configuración clínica
- [ ] `pages/admin/integrations.vue` - Integraciones
- [ ] `pages/admin/templates.vue` - Plantillas

#### 3.4 Módulo de Admisiones
- [ ] `pages/admissions/index.vue` - Lista de admisiones
- [ ] `pages/admissions/new.vue` - Nueva admisión
- [ ] `pages/admissions/[id].vue` - Detalle admisión
- [ ] `pages/admissions/calendar.vue` - Calendario
- [ ] `pages/admissions/companies/*` - Gestión empresas

#### 3.5 Módulo de Historia Clínica
- [ ] `pages/medical/clinical-history/index.vue`
- [ ] `pages/medical/clinical-history/[id].vue`
- [ ] `pages/medical/clinical-history/admission/[admissionId].vue`
- [ ] `pages/medical/exams/*` - Exámenes especializados

#### 3.6 Módulo de Laboratorio
- [ ] `pages/laboratory/index.vue` - Dashboard laboratorio
- [ ] `pages/laboratory/samples/*` - Recepción muestras
- [ ] `pages/laboratory/results/*` - Resultados

#### 3.7 Módulo de Concepto de Aptitud
- [ ] `pages/concepto-aptitud/*` - Gestión conceptos

#### 3.8 Módulo de Facturación
- [ ] `pages/facturacion/index.vue` - Dashboard facturación
- [ ] `pages/facturacion/facturas/*` - Gestión facturas
- [ ] `pages/facturacion/caja/*` - Control de caja

#### 3.9 Módulo de Inventario
- [ ] `pages/inventario-logistica/index.vue`
- [ ] `pages/inventario-logistica/inventario/*`
- [ ] `pages/inventario-logistica/logistica/*`

#### 3.10 Módulo de Biométrico
- [ ] `pages/biometric/register.vue`
- [ ] `pages/biometric/checkin.vue`

#### 3.11 Módulo de Analytics
- [ ] `pages/analytics/index.vue` - Dashboard analytics
- [ ] `pages/analytics/reports.vue` - Generador reportes

### FASE 4: Workflows n8n
**Prioridad: MEDIA**

- [ ] Workflow de confirmación de admisión (ya existe, mejorar)
- [ ] Workflow de recordatorios de citas
- [ ] Workflow de generación de concepto de aptitud (ya existe, mejorar)
- [ ] Workflow de alertas de inventario
- [ ] Workflow de notificaciones SMS
- [ ] Workflow de reportes automáticos

### FASE 5: Servicios Externos
**Prioridad: MEDIA**

- [ ] Servicio SUNAT completo
- [ ] Servicio SMS (Twilio/otro)
- [ ] Servicio Email (SMTP)
- [ ] Servicio Pagos (Stripe/Culqi)
- [ ] Servicio Biométrico

## Archivos a Crear (Resumen)

### Backend (api/src/)
- `routes/admissions.ts` - Rutas de admisiones
- `routes/medical.ts` - Rutas de historia clínica
- `routes/laboratory.ts` - Rutas de laboratorio
- `routes/concepto-aptitud.ts` - Rutas de concepto
- `routes/facturacion.ts` - Rutas de facturación
- `routes/inventario.ts` - Rutas de inventario
- `routes/biometric.ts` - Rutas biométricas
- `routes/analytics.ts` - Rutas de analytics
- `services/sunat.ts` - Servicio SUNAT (mejorar)
- `services/sms.ts` - Servicio SMS (mejorar)
- `services/mailer.ts` - Servicio Email (mejorar)
- `services/payments.ts` - Servicio Pagos (mejorar)
- `services/biometric.ts` - Servicio Biométrico (mejorar)

### Frontend (web/src/)
- `pages/` - Todas las páginas según estructura
- `components/` - Todos los componentes
- `layouts/` - Layouts principales
- `composables/` - Composables reutilizables
- `utils/` - Utilidades

### n8n (n8n/)
- `admission_workflow.json` - Mejorar existente
- `aptitude_workflow.json` - Mejorar existente
- `reminder_workflow.json` - Nuevo
- `inventory_alert_workflow.json` - Nuevo

## Notas Importantes

1. **Migración de Modelos**: El backend actual usa modelos antiguos. Necesita migración completa a nuevos modelos.

2. **Frontend**: El frontend actual es React básico. Necesita convertirse a estructura completa según doc.md (parece que doc.md usa Nuxt/Vue, pero el proyecto actual es React).

3. **Compatibilidad**: Asegurar que todo funcione con la estructura actual (React + Express) o migrar a Nuxt según doc.md.

4. **Testing**: Agregar tests después de implementación básica.

5. **Documentación**: Mantener documentación actualizada.

## Próximos Pasos Inmediatos

1. ✅ Actualizar SQL con todas las tablas
2. ⏳ Actualizar schema Prisma con todas las tablas
3. ⏳ Crear estructura de rutas del backend
4. ⏳ Implementar endpoints principales
5. ⏳ Crear estructura de frontend
6. ⏳ Implementar páginas principales

