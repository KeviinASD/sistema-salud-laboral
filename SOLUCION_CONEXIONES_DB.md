# Solución: Too Many Database Connections

## Problema Resuelto
Error: `FATAL: sorry, too many clients already` al usar Prisma con PostgreSQL.

## Cambios Implementados

### 1. Connection Pooling en DATABASE_URL (`.env`)
```env
DATABASE_URL=postgresql://user:pass@host:port/db?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10
```

**Parámetros:**
- `connection_limit=10`: Máximo 10 conexiones simultáneas (ajustable según necesidad)
- `pool_timeout=20`: Espera máx. 20seg para obtener una conexión del pool
- `connect_timeout=10`: Timeout de 10seg para conectar inicialmente

### 2. Singleton Pattern en `database.ts`
- Evita crear múltiples instancias de PrismaClient
- Usa patrón singleton para reutilizar la misma conexión
- Manejo correcto de señales de cierre (SIGINT, SIGTERM)

### 3. Graceful Shutdown en `index.ts`
- Cierra el servidor HTTP correctamente antes de terminar
- Permite que las conexiones activas terminen antes de cerrar

## Mejores Prácticas

### ✅ DO (Hacer)
1. **Usar una sola instancia de PrismaClient** por aplicación
2. **Reutilizar la conexión** en toda la app (importar desde `database.ts`)
3. **Ajustar `connection_limit`** según límite de tu BD:
   - PostgreSQL por defecto: 100 conexiones
   - Usa 30-50% del límite si tienes múltiples apps
4. **Cerrar conexiones** al detener el servidor (Ctrl+C)
5. **Monitorear conexiones activas** en producción

### ❌ DON'T (No hacer)
1. ❌ Crear `new PrismaClient()` en múltiples archivos
2. ❌ Dejar procesos Node corriendo sin cerrar
3. ❌ Usar `connection_limit` muy alto sin necesidad
4. ❌ Ignorar errores de conexión en logs
5. ❌ Reiniciar sin matar procesos anteriores

## Comandos Útiles

### Verificar procesos Node corriendo
```powershell
Get-Process node | Select-Object Id, ProcessName, Path | Format-Table
```

### Matar todos los procesos Node
```powershell
Stop-Process -Name node -Force
```

### Verificar conexiones en PostgreSQL
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE datname = 'viajesdb';
```

### Reiniciar backend correctamente
```powershell
# Detener procesos
Stop-Process -Name node -Force

# Iniciar backend
cd api
npm run dev
```

## Si el Error Persiste

1. **Aumentar límite de conexiones en PostgreSQL:**
   ```sql
   ALTER SYSTEM SET max_connections = 200;
   -- Reiniciar PostgreSQL después
   ```

2. **Reducir `connection_limit` si tienes múltiples apps:**
   - Con 2 apps: `connection_limit=5` cada una
   - Con 3 apps: `connection_limit=3` cada una

3. **Verificar conexiones zombies:**
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'viajesdb' 
   AND state = 'idle' 
   AND state_change < NOW() - INTERVAL '10 minutes';
   ```

4. **Considerar usar PgBouncer** (connection pooler externo) en producción

## Logs a Monitorear
- `Prisma desconectado correctamente` ✅
- `API escuchando en http://localhost:4001` ✅
- `Too many database connections` ❌
- `FATAL: sorry, too many clients` ❌

---
**Fecha de implementación:** 10 de Diciembre, 2025
