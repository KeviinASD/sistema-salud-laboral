import express, { Request, Response } from "express";
import { prisma } from "../utils/database";

const router = express.Router();

// GET /api/inventario/items - Listar items de inventario
router.get("/items", async (req: Request, res: Response) => {
  try {
    const { categoria, stock_bajo } = req.query;
    
    const where: any = {};
    if (categoria) where.categoria = categoria;
    if (stock_bajo === "true") {
      // Obtener items con stock bajo
      const items = await prisma.inventario.findMany();
      const itemsBajoStock = items.filter(item => item.stock_actual <= item.stock_minimo);
      where.id = { in: itemsBajoStock.map(i => i.id) };
    }

    const items = await prisma.inventario.findMany({
      where,
      include: {
        movimientos: {
          take: 10,
          orderBy: { created_at: "desc" }
        }
      },
      orderBy: { nombre: "asc" }
    });

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventario/items - Crear item
router.post("/items", async (req: Request, res: Response) => {
  try {
    const {
      codigo,
      nombre,
      categoria,
      stock_actual,
      stock_minimo,
      unidad_medida,
      precio_unitario,
      proveedor,
      ubicacion
    } = req.body;

    const item = await prisma.inventario.create({
      data: {
        codigo,
        nombre,
        categoria,
        stock_actual: stock_actual || 0,
        stock_minimo: stock_minimo || 5,
        unidad_medida,
        precio_unitario: precio_unitario ? parseFloat(precio_unitario) : null,
        proveedor,
        ubicacion
      }
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventario/items/:id - Actualizar item
router.put("/items/:id", async (req: Request, res: Response) => {
  try {
    const updateData: any = {};
    const fields = ["nombre", "categoria", "stock_minimo", "unidad_medida", "precio_unitario", "proveedor", "ubicacion"];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const item = await prisma.inventario.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventario/movimientos - Crear movimiento
router.post("/movimientos", async (req: Request, res: Response) => {
  try {
    const { item_id, tipo_movimiento, cantidad, motivo, referencia } = req.body;

    const item = await prisma.inventario.findUnique({
      where: { id: item_id }
    });

    if (!item) {
      return res.status(404).json({ error: "Item no encontrado" });
    }

    // Crear movimiento
    const movimiento = await prisma.movimientoInventario.create({
      data: {
        item_id,
        tipo_movimiento,
        cantidad,
        motivo,
        referencia,
        usuario_id: req.user?.id
      }
    });

    // Actualizar stock
    const delta = tipo_movimiento === "entrada" ? cantidad : -cantidad;
    const nuevoStock = item.stock_actual + delta;
    
    const itemActualizado = await prisma.inventario.update({
      where: { id: item_id },
      data: {
        stock_actual: nuevoStock
      }
    });

    // Verificar si el stock está bajo después del movimiento
    if (nuevoStock <= item.stock_minimo) {
      const inventoryWebhook = process.env.N8N_INVENTARIO_AGOTADO;
      if (inventoryWebhook) {
        try {
          console.log("🔔 [INVENTARIO] Stock bajo detectado, enviando alerta al webhook:", inventoryWebhook);
          
          const webhookPayload = {
            // Datos del item
            item_id: itemActualizado.id,
            codigo: itemActualizado.codigo,
            nombre: itemActualizado.nombre,
            categoria: itemActualizado.categoria,
            stock_actual: nuevoStock,
            stock_minimo: itemActualizado.stock_minimo,
            diferencia_stock: itemActualizado.stock_minimo - nuevoStock,
            unidad_medida: itemActualizado.unidad_medida || "unidad",
            precio_unitario: itemActualizado.precio_unitario ? Number(itemActualizado.precio_unitario) : null,
            proveedor: itemActualizado.proveedor || null,
            ubicacion: itemActualizado.ubicacion || null,
            
            // Datos del movimiento
            movimiento_id: movimiento.id,
            tipo_movimiento: tipo_movimiento,
            cantidad: cantidad,
            motivo: motivo || null,
            referencia: referencia || null,
            stock_anterior: item.stock_actual,
            stock_nuevo: nuevoStock,
            
            // Metadata
            usuario_id: req.user?.id || null,
            fecha_movimiento: movimiento.created_at.toISOString(),
            alerta_tipo: nuevoStock === 0 ? "agotado" : "stock_bajo"
          };

          console.log("📦 [INVENTARIO] Payload:", JSON.stringify(webhookPayload, null, 2));

          const response = await (globalThis as any).fetch(inventoryWebhook, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(webhookPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ [INVENTARIO] Error en respuesta del webhook:", response.status, errorText);
          } else {
            const responseData = await response.json().catch(() => null);
            console.log("✅ [INVENTARIO] Webhook respondió exitosamente:", responseData);
          }
        } catch (webhookError: any) {
          console.error("❌ [INVENTARIO] Error disparando webhook n8n:", webhookError.message);
          console.error("Stack:", webhookError.stack);
          // No lanzamos el error para que el movimiento se registre aunque falle el webhook
        }
      } else {
        console.warn("⚠️ [INVENTARIO] N8N_INVENTARIO_AGOTADO no está configurado en las variables de entorno");
      }
    }

    res.status(201).json(movimiento);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventario/alerts - Alertas de stock bajo
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const allItems = await prisma.inventario.findMany();
    const items = allItems.filter(item => item.stock_actual <= item.stock_minimo)
      .sort((a, b) => a.stock_actual - b.stock_actual);

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/logistica/seguimiento - Crear seguimiento logístico
router.post("/logistica/seguimiento", async (req: Request, res: Response) => {
  try {
    const { admision_id, estado, ubicacion, mensaje } = req.body;

    const seguimiento = await prisma.seguimientoLogistico.create({
      data: {
        admision_id,
        estado,
        ubicacion,
        mensaje,
        usuario_id: req.user?.id
      },
      include: {
        admision: {
          include: {
            paciente: {
              include: { usuario: true }
            }
          }
        }
      }
    });

    res.status(201).json(seguimiento);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logistica/seguimiento/:admision_id - Obtener seguimiento
router.get("/logistica/seguimiento/:admision_id", async (req: Request, res: Response) => {
  try {
    const seguimientos = await prisma.seguimientoLogistico.findMany({
      where: { admision_id: req.params.admision_id },
      include: {
        usuario: true
      },
      orderBy: { created_at: "desc" }
    });

    res.json(seguimientos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

