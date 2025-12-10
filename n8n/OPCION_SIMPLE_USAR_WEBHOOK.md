# Opción Simple: Usar Datos del Webhook Directamente

## ✅ Ventaja
El backend **YA está enviando todos los datos** necesarios en el webhook, por lo que **NO necesitas consultar la base de datos**.

## 📋 Datos que el Backend Envía

El backend envía un payload completo con:

### Datos de la Admisión
- `admission_id`
- `tipo_examen`
- `fecha_programada` (ISO string)
- `estado`
- `motivo_consulta`
- `observaciones_admision`

### Datos del Paciente
- `paciente_id`
- `paciente_dni` / `dni`
- `paciente_nombres` / `nombres`
- `paciente_apellidos` / `apellidos`
- `paciente_email` / `email`
- `paciente_telefono` / `telefono`
- `paciente_nombre` (nombre completo)

### Datos de la Empresa
- `empresa_id`
- `empresa_razon_social`
- `empresa_ruc`
- `empresa_nombre_comercial`

### Datos del Médico
- `medico_id`
- `medico_nombre`
- `medico_email`

### Datos de Facturación
- `factura_id`
- `subtotal`
- `igv`
- `total`
- `tipo_comprobante`
- `metodo_pago`

## 🔧 Cómo Usar en n8n

### Opción 1: Usar directamente los datos del webhook

1. **Webhook Trigger** → Recibe los datos
2. **Format Email Data** (Function Node) → Formatea los datos para el correo
3. **Send Confirmation Email** → Envía el correo

**Código del Function Node "Format Email Data":**

```javascript
const data = $input.first().json;

// Formatear fecha
const fechaProgramada = new Date(data.fecha_programada);
const fechaFormateada = fechaProgramada.toLocaleString('es-PE', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const horaCita = fechaProgramada.toLocaleTimeString('es-PE', {
  hour: '2-digit',
  minute: '2-digit'
});

const fechaCita = fechaProgramada.toLocaleDateString('es-PE', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

return {
  // Datos del paciente
  paciente_nombre: data.paciente_nombre || `${data.paciente_nombres || data.nombres} ${data.paciente_apellidos || data.apellidos}`,
  paciente_dni: data.paciente_dni || data.dni,
  paciente_email: data.paciente_email || data.email,
  paciente_telefono: data.paciente_telefono || data.telefono || 'No proporcionado',
  
  // Datos de la empresa
  empresa_nombre: data.empresa_razon_social || 'No especificada',
  empresa_ruc: data.empresa_ruc || '',
  
  // Datos de la admisión
  admission_id: data.admission_id,
  tipo_examen: data.tipo_examen,
  fecha_programada: fechaFormateada,
  fecha_cita: fechaCita,
  hora_cita: horaCita,
  motivo_consulta: data.motivo_consulta || 'No especificado',
  observaciones: data.observaciones_admision || '',
  
  // Datos del médico
  medico_nombre: data.medico_nombre || 'Por asignar',
  medico_email: data.medico_email || '',
  
  // Datos de facturación
  subtotal: data.subtotal || 0,
  igv: data.igv || 0,
  total: data.total || 0,
  metodo_pago: data.metodo_pago || 'No especificado'
};
```

### Opción 2: Consultar solo el tipo de examen para obtener más detalles

Si necesitas información adicional del tipo de examen (duración, descripción, etc.), puedes hacer una consulta simple:

```sql
SELECT 
  nombre,
  descripcion,
  duracion_minutos,
  precio_base,
  requiere_laboratorio,
  requiere_radiografia
FROM tipos_examen
WHERE codigo = $1;
```

Y usar `{{$json.tipo_examen}}` como parámetro.

## 📧 Ejemplo de Template de Email

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
  </style>
</head>
<body>
  <div class='container'>
    <div class='header'>
      <h1>Confirmación de Cita</h1>
      <p>Clínica de Salud Ocupacional</p>
    </div>
    
    <div class='content'>
      <p>Estimado(a) <strong>{{$json.paciente_nombre}}</strong>,</p>
      
      <div class='info-box'>
        <h3>📅 Información de la Cita</h3>
        <p><strong>Fecha:</strong> {{$json.fecha_cita}}</p>
        <p><strong>Hora:</strong> {{$json.hora_cita}}</p>
        <p><strong>Tipo de Examen:</strong> {{$json.tipo_examen}}</p>
      </div>
      
      <div class='info-box'>
        <h3>👨‍⚕️ Médico Asignado</h3>
        <p>{{$json.medico_nombre}}</p>
      </div>
      
      <div class='info-box'>
        <h3>🏢 Empresa</h3>
        <p>{{$json.empresa_nombre}}</p>
        <p>RUC: {{$json.empresa_ruc}}</p>
      </div>
      
      {{#if $json.total}}
      <div class='info-box'>
        <h3>💰 Facturación</h3>
        <p><strong>Total:</strong> S/ {{$json.total}}</p>
        <p><strong>Método de pago:</strong> {{$json.metodo_pago}}</p>
      </div>
      {{/if}}
      
      <p><strong>Instrucciones:</strong></p>
      <ul>
        <li>Presente su DNI al llegar</li>
        <li>Llegue 15 minutos antes</li>
      </ul>
      
      <p>ID de Admisión: {{$json.admission_id}}</p>
    </div>
  </div>
</body>
</html>
```

## ✅ Recomendación

**Usa la Opción 1** (datos del webhook directamente) porque:
- ✅ Más rápido (no hay consulta a BD)
- ✅ Menos carga en la base de datos
- ✅ Todos los datos ya están disponibles
- ✅ Más simple de mantener

Solo usa la consulta SQL si necesitas datos que NO están en el webhook (como descripción detallada del tipo de examen).


