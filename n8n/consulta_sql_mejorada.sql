-- Consulta SQL mejorada para obtener todos los datos necesarios para el correo
-- Esta consulta obtiene información completa del paciente, admisión, empresa, médico y factura

SELECT 
  -- Datos del paciente
  p.id as paciente_id,
  u.dni,
  u.nombres,
  u.apellidos,
  u.email,
  u.telefono,
  
  -- Datos de la empresa
  e.id as empresa_id,
  e.razon_social as empresa_nombre,
  e.ruc as empresa_ruc,
  e.nombre_comercial as empresa_nombre_comercial,
  e.direccion as empresa_direccion,
  e.telefono as empresa_telefono,
  
  -- Datos de la admisión
  a.id as admission_id,
  a.tipo_examen,
  a.fecha_programada,
  a.estado as admission_estado,
  a.motivo_consulta,
  a.observaciones_admision,
  a.created_at as admission_created_at,
  
  -- Datos del tipo de examen
  te.id as tipo_examen_id,
  te.nombre as tipo_examen_nombre,
  te.descripcion as tipo_examen_descripcion,
  te.duracion_minutos,
  te.precio_base,
  te.requiere_laboratorio,
  te.requiere_radiografia,
  
  -- Datos del médico
  m.id as medico_id,
  m.nombres as medico_nombres,
  m.apellidos as medico_apellidos,
  m.email as medico_email,
  m.telefono as medico_telefono,
  m.especialidad as medico_especialidad,
  m.colegiatura as medico_colegiatura,
  
  -- Datos de facturación
  f.id as factura_id,
  f.subtotal,
  f.igv,
  f.total as factura_total,
  f.tipo_comprobante,
  f.metodo_pago,
  f.estado as factura_estado,
  f.fecha_emision as factura_fecha_emision

FROM pacientes p
JOIN usuarios u ON p.usuario_id = u.id
LEFT JOIN empresas e ON p.empresa_id = e.id OR p.empresa_id = e.id
LEFT JOIN admisiones a ON a.paciente_id = p.id AND a.id = $1  -- Usar admission_id del webhook
LEFT JOIN tipos_examen te ON te.codigo = a.tipo_examen
LEFT JOIN usuarios m ON a.medico_id = m.id
LEFT JOIN facturas f ON f.admision_id = a.id
WHERE u.dni = $2  -- Usar dni del webhook (paciente_dni o dni)
ORDER BY a.fecha_programada DESC
LIMIT 1;

-- Parámetros esperados:
-- $1 = admission_id (del webhook)
-- $2 = dni (paciente_dni o dni del webhook)

