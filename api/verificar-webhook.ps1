# Script para verificar la configuración del webhook
Write-Host "=== Verificación de Configuración del Webhook n8n ===" -ForegroundColor Cyan
Write-Host ""

$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "✅ Archivo .env encontrado: $envPath" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -match "N8N_ADMISSION_WEBHOOK") {
        $webhookLine = ($envContent -split "`n" | Where-Object { $_ -match "N8N_ADMISSION_WEBHOOK" })[0]
        Write-Host "✅ Variable N8N_ADMISSION_WEBHOOK encontrada:" -ForegroundColor Green
        Write-Host "   $webhookLine" -ForegroundColor White
        
        if ($webhookLine -match "https?://") {
            $webhookUrl = ($webhookLine -split "=")[1].Trim()
            Write-Host "✅ URL del webhook: $webhookUrl" -ForegroundColor Green
            
            # Intentar hacer una petición de prueba
            Write-Host ""
            Write-Host "🔍 Probando conectividad con el webhook..." -ForegroundColor Yellow
            try {
                $testResponse = Invoke-WebRequest -Uri $webhookUrl -Method POST -Body '{"test":true}' -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
                Write-Host "✅ El webhook responde (Status: $($testResponse.StatusCode))" -ForegroundColor Green
            } catch {
                Write-Host "⚠️ No se pudo conectar al webhook:" -ForegroundColor Yellow
                Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
                Write-Host ""
                Write-Host "💡 Esto puede ser normal si el webhook requiere datos específicos." -ForegroundColor Cyan
            }
        } else {
            Write-Host "❌ La URL del webhook no parece ser válida" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Variable N8N_ADMISSION_WEBHOOK NO encontrada en .env" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Ejecuta el script actualizar_env.ps1 para configurarla" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Archivo .env NO encontrado en: $envPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Ejecuta el script actualizar_env.ps1 para crearlo" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Verificación completada ===" -ForegroundColor Cyan


