import express from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
// @ts-ignore - pdfkit types issue
import PDFDocument from "pdfkit";
const router = express.Router();
const prisma = new PrismaClient();
// POST /api/concepto-aptitud - Crear concepto de aptitud
router.post("/", async (req, res) => {
    try {
        const { admision_id, resultado, restricciones, recomendaciones, fecha_vigencia } = req.body;
        // Validar que la admisión existe
        const admision = await prisma.admision.findUnique({
            where: { id: admision_id },
            include: {
                paciente: {
                    include: { usuario: true }
                },
                historia_clinica: true
            }
        });
        if (!admision) {
            return res.status(404).json({ error: "Admisión no encontrada" });
        }
        // Crear hash de verificación
        const base = `${admision_id}|${resultado}|${restricciones || ""}|${recomendaciones || ""}|${fecha_vigencia || ""}`;
        const hash = crypto.createHash("sha256").update(base).digest("hex");
        const concepto = await prisma.conceptoAptitud.create({
            data: {
                admision_id,
                resultado,
                restricciones,
                recomendaciones,
                fecha_vigencia: fecha_vigencia ? new Date(fecha_vigencia) : null,
                hash_verificacion: hash,
                created_by: req.user?.id
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
        // Disparar workflow n8n para generar PDF
        const n8nUrl = process.env.N8N_URL;
        const serviceToken = process.env.SERVICE_TOKEN || "";
        if (n8nUrl) {
            try {
                await globalThis.fetch(`${n8nUrl.replace(/\/$/, "")}/webhook/concept-finalized`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        concept_id: concepto.id,
                        token: serviceToken
                    })
                });
            }
            catch (error) {
                console.error("Error disparando workflow n8n:", error);
            }
        }
        res.status(201).json(concepto);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/concepto-aptitud - Listar conceptos (con filtro opcional)
router.get("/", async (req, res) => {
    try {
        const { admission_id } = req.query;
        const where = {};
        if (admission_id)
            where.admision_id = admission_id;
        const conceptos = await prisma.conceptoAptitud.findMany({
            where,
            include: {
                admision: {
                    include: {
                        paciente: {
                            include: { usuario: true, empresa: true }
                        },
                        medico: true
                    }
                },
                creador: true
            },
            orderBy: { created_at: "desc" }
        });
        res.json(conceptos[0] || null);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/concepto-aptitud/:id - Obtener concepto
router.get("/:id", async (req, res) => {
    try {
        const concepto = await prisma.conceptoAptitud.findUnique({
            where: { id: req.params.id },
            include: {
                admision: {
                    include: {
                        paciente: {
                            include: { usuario: true, empresa: true }
                        },
                        medico: true
                    }
                },
                creador: true
            }
        });
        if (!concepto) {
            return res.status(404).json({ error: "Concepto no encontrado" });
        }
        res.json(concepto);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/concepto-aptitud/generate-pdf - Generar PDF
router.post("/generate-pdf", async (req, res) => {
    try {
        const { concept_id } = req.body;
        const concepto = await prisma.conceptoAptitud.findUnique({
            where: { id: concept_id },
            include: {
                admision: {
                    include: {
                        paciente: {
                            include: { usuario: true, empresa: true }
                        },
                        medico: true
                    }
                },
                creador: true
            }
        });
        if (!concepto) {
            return res.status(404).json({ error: "Concepto no encontrado" });
        }
        // Generar PDF
        const doc = new PDFDocument();
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", async () => {
            const pdfBuffer = Buffer.concat(chunks);
            const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
            // Actualizar concepto con PDF
            await prisma.conceptoAptitud.update({
                where: { id: concept_id },
                data: {
                    pdf_generado: pdfBuffer,
                    hash_verificacion: hash
                }
            });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="concepto_${concept_id}.pdf"`);
            res.send(pdfBuffer);
        });
        // Contenido del PDF
        doc.fontSize(16).text("CONCEPTO DE APTITUD OCUPACIONAL", { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Ley N° 29783 - Seguridad y Salud en el Trabajo`, { align: "center" });
        doc.moveDown(2);
        doc.text(`Paciente: ${concepto.admision.paciente.usuario?.nombres} ${concepto.admision.paciente.usuario?.apellidos}`);
        doc.text(`DNI: ${concepto.admision.paciente.usuario?.dni}`);
        if (concepto.admision.paciente.empresa) {
            doc.text(`Empresa: ${concepto.admision.paciente.empresa.razon_social}`);
        }
        doc.moveDown();
        doc.text(`Resultado: ${concepto.resultado.toUpperCase()}`);
        if (concepto.restricciones) {
            doc.moveDown();
            doc.text(`Restricciones: ${concepto.restricciones}`);
        }
        if (concepto.recomendaciones) {
            doc.moveDown();
            doc.text(`Recomendaciones: ${concepto.recomendaciones}`);
        }
        doc.moveDown(3);
        doc.text(`Médico: ${concepto.creador?.nombres} ${concepto.creador?.apellidos}`);
        if (concepto.creador?.colegiatura) {
            doc.text(`Colegiatura: ${concepto.creador.colegiatura}`);
        }
        doc.moveDown(2);
        doc.fontSize(8).text(`Hash de verificación: ${concepto.hash_verificacion}`, { align: "center" });
        doc.text(`Documento emitido electrónicamente según Ley N° 29783`, { align: "center" });
        doc.end();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
