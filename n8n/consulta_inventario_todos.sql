-- CONSULTA ALTERNATIVA: Ver todos los items para diagnosticar
-- Usa esta para ver qué datos hay en la tabla

SELECT 
  id,
  codigo,
  nombre,
  categoria,
  stock_actual,
  stock_minimo,
  unidad_medida,
  precio_unitario,
  proveedor,
  ubicacion
FROM inventario 
ORDER BY nombre ASC;

