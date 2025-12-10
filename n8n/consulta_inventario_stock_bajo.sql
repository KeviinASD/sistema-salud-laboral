-- Consulta para obtener items con stock bajo
-- Retorna items donde el stock actual es menor o igual al stock mínimo

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
  ubicacion,
  created_at,
  updated_at,
  (stock_minimo - stock_actual) as diferencia_stock
FROM inventario 
WHERE stock_actual <= stock_minimo
ORDER BY stock_actual ASC;

-- NOTA: Si no retorna datos, puede ser porque:
-- 1. No hay items en la tabla (verifica con: SELECT COUNT(*) FROM inventario;)
-- 2. Todos los items tienen stock_actual > stock_minimo
-- 3. La tabla está vacía

