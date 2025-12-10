# Script para actualizar .env con las credenciales de PostgreSQL
Write-Host "Actualizando archivo .env con las credenciales de PostgreSQL..." -ForegroundColor Cyan

$envContent = @"
# Base de Datos PostgreSQL
DATABASE_URL=postgresql://viajesdb:viajesdb@217.216.64.28:6969/viajesdb?schema=public
DATABASE_CLIENT=postgres
DATABASE_HOST=217.216.64.28
DATABASE_PORT=6969
DATABASE_NAME=viajesdb
DATABASE_USERNAME=viajesdb
DATABASE_PASSWORD=viajesdb
DATABASE_SSL=false

# API
API_PORT=4001
JWT_SECRET=dev_secret_key_change_in_production_12345

# n8n
N8N_ADMISSION_WEBHOOK=https://santos-n8n.siu9f2.easypanel.host/webhook/admission-webhook
N8N_INVENTARIO_AGOTADO=https://santos-n8n.siu9f2.easypanel.host/webhook/inventarioagotado
N8N_FACTURA=https://santos-n8n.siu9f2.easypanel.host/webhook/factura

# Email (opcional - modo simulación si no está configurado)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@saludlaboral.pe

# SMS (opcional - modo simulación si no está configurado)
SMS_API_URL=
SMS_API_TOKEN=
SMS_API_KEY=
SMS_PROVIDER=twilio

# SUNAT - Facturación Electrónica (opcional)
# Configura estas variables si quieres validar DNI/RUC y enviar facturas a SUNAT
# Proveedores recomendados:
#   - APISUNAT: https://apisunat.com (requiere personaId y token)
#   - APIsPERU: https://apisperu.pe (formato: https://apisperu.pe)
#   - Mifact: https://mifact.net
#   - FactureSoft: https://facturesoft.com
#   - MiAPI Cloud: https://miapi.cloud
# Ejemplo para APISUNAT:
#   SUNAT_API_URL=https://apisunat.com
#   SUNAT_PERSONA_ID=693820f0dde8b20015acbeef
#   SUNAT_API_TOKEN=DEV_s3Y4Eo13E93vN3hzkw3pWQ7iROtLKyzDWSNDxb5GqadIxHHP7wRrybWiHYyEiCeY
# Ejemplo para APIsPERU:
#   SUNAT_API_URL=https://apisperu.pe
#   SUNAT_API_TOKEN=tu_token_aqui
SUNAT_API_URL=
SUNAT_PERSONA_ID=
SUNAT_API_TOKEN=

# Pagos - Pasarela de Pagos (opcional)
# Para usar Stripe, configura STRIPE_SECRET_KEY y STRIPE_PUBLISHABLE_KEY
# Obtén tus claves en: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
# Otras pasarelas (si no usas Stripe):
PAYMENT_GATEWAY=stripe
PAYMENTS_API_URL=
PAYMENTS_API_TOKEN=
"@

$envPath = Join-Path $PSScriptRoot "api\.env"
$envContent | Out-File -FilePath $envPath -Encoding utf8 -Force

Write-Host "Archivo .env actualizado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales configuradas:" -ForegroundColor Cyan
Write-Host "   Host: 217.216.64.28" -ForegroundColor White
Write-Host "   Port: 6969" -ForegroundColor White
Write-Host "   Database: viajesdb" -ForegroundColor White
Write-Host "   User: viajesdb" -ForegroundColor White
Write-Host ""
