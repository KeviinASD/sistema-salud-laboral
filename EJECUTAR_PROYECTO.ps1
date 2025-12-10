# Script para ejecutar el proyecto completo
Write-Host "🚀 Iniciando Sistema de Salud Laboral..." -ForegroundColor Green

# Verificar si existe .env
if (-not (Test-Path "api\.env")) {
    Write-Host "⚠️  Creando archivo .env..." -ForegroundColor Yellow
    @"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saludlaboral?schema=public
API_PORT=4001
JWT_SECRET=dev_secret_key_change_in_production_12345
N8N_URL=http://localhost:5678
SERVICE_TOKEN=dev_service_token_12345
"@ | Out-File -FilePath "api\.env" -Encoding utf8
}

# Verificar Prisma Client
Write-Host "📦 Generando Prisma Client..." -ForegroundColor Cyan
Set-Location api
npm run prisma:generate
Set-Location ..

# Iniciar servidores
Write-Host "✨ Iniciando servidores..." -ForegroundColor Green
Write-Host "   Backend: http://localhost:4001" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener los servidores" -ForegroundColor Yellow
Write-Host ""

npm run dev

