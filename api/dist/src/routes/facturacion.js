import express from "express";
import { PrismaClient } from "@prisma/client";
import { submitInvoiceSunat, validateDocument } from "../services/sunat";
import { createPaymentIntent } from "../services/payments";
const router = express.Router();
const prisma = new PrismaClient();
// GET /api/facturacion/facturas - Listar facturas
router.get("/facturas", async (req, res) => {
    try {
        const { page = "1", limit = "10", estado, fecha_desde, fecha_hasta } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (estado)
            where.estado = estado;
        if (fecha_desde || fecha_hasta) {
            where.fecha_emision = {};
            if (fecha_desde)
                where.fecha_emision.gte = new Date(fecha_desde);
            if (fecha_hasta)
                where.fecha_emision.lte = new Date(fecha_hasta);
        }
        const [facturas, total] = await Promise.all([
            prisma.factura.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    admision: {
                        include: {
                            paciente: {
                                include: { usuario: true }
                            }
                        }
                    }
                },
                orderBy: { created_at: "desc" }
            }),
            prisma.factura.count({ where })
        ]);
        res.json({
            data: facturas,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/facturacion/facturas - Crear factura
router.post("/facturas", async (req, res) => {
    try {
        const { admision_id, tipo_comprobante, subtotal, igv, total, metodo_pago, fecha_vencimiento } = req.body;
        // Obtener último correlativo
        const lastInvoice = await prisma.factura.findFirst({
            where: { tipo_comprobante },
            orderBy: { numero_correlativo: "desc" }
        });
        const numero_correlativo = lastInvoice ? (lastInvoice.numero_correlativo || 0) + 1 : 1;
        const factura = await prisma.factura.create({
            data: {
                admision_id,
                tipo_comprobante: tipo_comprobante || "03",
                numero_correlativo,
                estado: "pendiente",
                subtotal: subtotal ? parseFloat(subtotal) : null,
                igv: igv ? parseFloat(igv) : null,
                total: total ? parseFloat(total) : null,
                fecha_emision: new Date(),
                fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
                metodo_pago
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
        res.status(201).json(factura);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/facturacion/pagos - Registrar pago
router.post("/pagos", async (req, res) => {
    try {
        const { factura_id, monto, metodo_pago, transaccion_id } = req.body;
        const factura = await prisma.factura.findUnique({
            where: { id: factura_id }
        });
        if (!factura) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }
        // Si hay pasarela de pago, procesar pago
        if (metodo_pago === "tarjeta" || metodo_pago === "yape" || metodo_pago === "plin") {
            try {
                const totalAmount = factura.total ? Number(factura.total) : 0;
                const paymentIntent = await createPaymentIntent(Math.round(totalAmount * 100), "PEN", `Factura ${factura.numero_correlativo}`, { factura_id });
                const facturaActualizada = await prisma.factura.update({
                    where: { id: factura_id },
                    data: {
                        estado: "pagado",
                        metodo_pago,
                        transaccion_id: paymentIntent.id || transaccion_id
                    }
                });
                return res.json(facturaActualizada);
            }
            catch (paymentError) {
                console.error("Error procesando pago:", paymentError);
            }
        }
        // Pago directo (efectivo, transferencia)
        const facturaActualizada = await prisma.factura.update({
            where: { id: factura_id },
            data: {
                estado: "pagado",
                metodo_pago,
                transaccion_id
            }
        });
        res.json(facturaActualizada);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/facturacion/caja/diaria - Caja diaria
router.get("/caja/diaria", async (req, res) => {
    try {
        const { fecha } = req.query;
        const fechaConsulta = fecha ? new Date(fecha) : new Date();
        fechaConsulta.setHours(0, 0, 0, 0);
        const fechaFin = new Date(fechaConsulta);
        fechaFin.setHours(23, 59, 59, 999);
        const facturas = await prisma.factura.findMany({
            where: {
                fecha_emision: {
                    gte: fechaConsulta,
                    lte: fechaFin
                },
                estado: "pagado"
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
        const resumen = {
            fecha: fechaConsulta.toISOString().split("T")[0],
            total_facturas: facturas.length,
            total_ingresos: facturas.reduce((sum, f) => sum + Number(f.total || 0), 0),
            por_metodo_pago: facturas.reduce((acc, f) => {
                const metodo = f.metodo_pago || "efectivo";
                acc[metodo] = (acc[metodo] || 0) + Number(f.total || 0);
                return acc;
            }, {}),
            facturas
        };
        res.json(resumen);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/facturacion/sunat/enviar - Enviar a SUNAT
router.post("/sunat/enviar", async (req, res) => {
    try {
        const { factura_id } = req.body;
        const factura = await prisma.factura.findUnique({
            where: { id: factura_id },
            include: {
                admision: {
                    include: {
                        paciente: {
                            include: { usuario: true, empresa: true }
                        }
                    }
                }
            }
        });
        if (!factura) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }
        // Generar XML según formato SUNAT
        const xmlSunat = generateSunatXML(factura);
        // Enviar a SUNAT
        const sunatResponse = await submitInvoiceSunat({
            id: factura_id,
            xml: xmlSunat
        });
        // Actualizar factura con respuesta SUNAT
        const facturaActualizada = await prisma.factura.update({
            where: { id: factura_id },
            data: {
                xml_sunat: Buffer.from(xmlSunat),
                cdr_sunat: sunatResponse.cdr ? Buffer.from(sunatResponse.cdr) : null,
                estado: sunatResponse.status === "accepted" ? "pagado" : factura.estado
            }
        });
        res.json(facturaActualizada);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/facturacion/sunat/validate - Validar documento SUNAT
router.post("/sunat/validate", async (req, res) => {
    try {
        const { type, value } = req.body;
        const data = await validateDocument(type, value);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
function generateSunatXML(factura) {
    // Generación simplificada de XML SUNAT
    // En producción usar librería especializada
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${factura.numero_correlativo}</ID>
  <IssueDate>${new Date(factura.fecha_emision).toISOString().split("T")[0]}</IssueDate>
  <InvoiceTypeCode>${factura.tipo_comprobante === "01" ? "01" : "03"}</InvoiceTypeCode>
  <LegalMonetaryTotal>
    <LineExtensionAmount>${factura.subtotal || 0}</LineExtensionAmount>
    <TaxInclusiveAmount>${factura.total || 0}</TaxInclusiveAmount>
  </LegalMonetaryTotal>
</Invoice>`;
}
export default router;
