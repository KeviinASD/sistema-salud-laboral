import express from "express";
import { PrismaClient } from "@prisma/client";
const router = express.Router();
const prisma = new PrismaClient();
// GET /api/inventario/items - Listar items de inventario
router.get("/items", async (req, res) => {
    try {
        const { categoria, stock_bajo } = req.query;
        const where = {};
        if (categoria)
            where.categoria = categoria;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/inventario/items - Crear item
router.post("/items", async (req, res) => {
    try {
        const { codigo, nombre, categoria, stock_actual, stock_minimo, unidad_medida, precio_unitario, proveedor, ubicacion } = req.body;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/inventario/items/:id - Actualizar item
router.put("/items/:id", async (req, res) => {
    try {
        const updateData = {};
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/inventario/movimientos - Crear movimiento
router.post("/movimientos", async (req, res) => {
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
        await prisma.inventario.update({
            where: { id: item_id },
            data: {
                stock_actual: item.stock_actual + delta
            }
        });
        res.status(201).json(movimiento);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/inventario/alerts - Alertas de stock bajo
router.get("/alerts", async (req, res) => {
    try {
        const allItems = await prisma.inventario.findMany();
        const items = allItems.filter(item => item.stock_actual <= item.stock_minimo)
            .sort((a, b) => a.stock_actual - b.stock_actual);
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/logistica/seguimiento - Crear seguimiento logístico
router.post("/logistica/seguimiento", async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/logistica/seguimiento/:admision_id - Obtener seguimiento
router.get("/logistica/seguimiento/:admision_id", async (req, res) => {
    try {
        const seguimientos = await prisma.seguimientoLogistico.findMany({
            where: { admision_id: req.params.admision_id },
            include: {
                usuario: true
            },
            orderBy: { created_at: "desc" }
        });
        res.json(seguimientos);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
