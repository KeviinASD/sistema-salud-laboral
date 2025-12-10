import express from "express";
import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
const router = express.Router();
const prisma = new PrismaClient();
// GET /api/analytics/dashboards - Dashboard principal
router.get("/dashboards", async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const [totalPacientes, totalAdmisiones, admisionesMes, conceptosEmitidos, facturasMes, ingresosMes, examenesPendientes] = await Promise.all([
            prisma.paciente.count(),
            prisma.admision.count(),
            prisma.admision.count({
                where: {
                    fecha_programada: { gte: startOfMonth }
                }
            }),
            prisma.conceptoAptitud.count({
                where: {
                    created_at: { gte: startOfMonth }
                }
            }),
            prisma.factura.count({
                where: {
                    fecha_emision: { gte: startOfMonth },
                    estado: "pagado"
                }
            }),
            prisma.factura.aggregate({
                where: {
                    fecha_emision: { gte: startOfMonth },
                    estado: "pagado"
                },
                _sum: { total: true }
            }),
            prisma.examenLaboratorio.count({
                where: {
                    estado: "pendiente"
                }
            })
        ]);
        res.json({
            totalPacientes,
            totalAdmisiones,
            admisionesMes,
            conceptosEmitidos,
            facturasMes,
            ingresosMes: ingresosMes._sum.total || 0,
            examenesPendientes
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/analytics/reports/exams-monthly - Reporte mensual de exámenes
router.get("/reports/exams-monthly", async (req, res) => {
    try {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
            const count = await prisma.admision.count({
                where: {
                    fecha_programada: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            });
            months.push({
                mes: date.toLocaleString("es-PE", { month: "long", year: "numeric" }),
                label: date.toLocaleString("es-PE", { month: "short", year: "numeric" }),
                count,
                cantidad: count
            });
        }
        res.json(months);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/analytics/dashboard/charts - Datos para gráficos del dashboard
router.get("/dashboard/charts", async (req, res) => {
    try {
        const now = new Date();
        // 1. Admisiones mensuales (últimos 6 meses)
        const admisionesMensuales = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
            const count = await prisma.admision.count({
                where: {
                    fecha_programada: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            });
            admisionesMensuales.push({
                mes: date.toLocaleString("es-PE", { month: "short", year: "numeric" }),
                cantidad: count
            });
        }
        // 2. Pacientes por empresa (top 5)
        const pacientesPorEmpresa = await prisma.paciente.groupBy({
            by: ["empresa_id"],
            _count: { empresa_id: true },
            orderBy: { _count: { empresa_id: "desc" } },
            take: 5
        });
        const empresasConNombres = await Promise.all(pacientesPorEmpresa.map(async (p) => {
            const empresa = p.empresa_id ? await prisma.empresa.findUnique({
                where: { id: p.empresa_id }
            }) : null;
            return {
                empresa: empresa?.nombre || "Sin empresa",
                cantidad: p._count.empresa_id
            };
        }));
        // 3. Conceptos de aptitud por resultado
        const conceptosPorResultado = await prisma.conceptoAptitud.groupBy({
            by: ["resultado"],
            _count: { resultado: true }
        });
        const conceptosData = conceptosPorResultado.map(c => ({
            resultado: c.resultado || "Sin resultado",
            cantidad: c._count.resultado
        }));
        // 4. Ingresos mensuales (últimos 6 meses)
        const ingresosMensuales = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
            const facturas = await prisma.factura.aggregate({
                where: {
                    fecha_emision: {
                        gte: monthStart,
                        lte: monthEnd
                    },
                    estado: "pagado"
                },
                _sum: { total: true }
            });
            ingresosMensuales.push({
                mes: date.toLocaleString("es-PE", { month: "short", year: "numeric" }),
                monto: Number(facturas._sum.total || 0)
            });
        }
        // 5. Exámenes de laboratorio por estado
        const examenesPendientes = await prisma.examenLaboratorio.count({
            where: { estado: "pendiente" }
        });
        const examenesCompletados = await prisma.examenLaboratorio.count({
            where: { estado: "completado" }
        });
        const examenesPorEstado = [
            { estado: "Pendientes", cantidad: examenesPendientes },
            { estado: "Completados", cantidad: examenesCompletados }
        ];
        // 6. Conceptos emitidos mensuales (últimos 6 meses)
        const conceptosMensuales = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
            const count = await prisma.conceptoAptitud.count({
                where: {
                    created_at: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            });
            conceptosMensuales.push({
                mes: date.toLocaleString("es-PE", { month: "short", year: "numeric" }),
                cantidad: count
            });
        }
        res.json({
            admisionesMensuales,
            pacientesPorEmpresa: empresasConNombres,
            conceptosPorResultado: conceptosData,
            ingresosMensuales,
            examenesPorEstado,
            conceptosMensuales
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/analytics/reports - Generar reporte
router.post("/reports", async (req, res) => {
    try {
        const { tipo, fecha_desde, fecha_hasta, filtros } = req.body;
        let reportData = {};
        switch (tipo) {
            case "admisiones_mensual":
                reportData = await generateMonthlyAdmissionsReport(fecha_desde, fecha_hasta);
                break;
            case "conceptos_aptitud":
                reportData = await generateAptitudeConceptsReport(fecha_desde, fecha_hasta, filtros);
                break;
            case "ingresos":
                reportData = await generateIncomeReport(fecha_desde, fecha_hasta);
                break;
            case "examenes_laboratorio":
                reportData = await generateLabExamsReport(fecha_desde, fecha_hasta);
                break;
            default:
                return res.status(400).json({ error: "Tipo de reporte no válido" });
        }
        res.json(reportData);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/analytics/exports - Exportar datos
router.post("/exports", async (req, res) => {
    try {
        const { tipo, formato, fecha_desde, fecha_hasta } = req.body;
        let data = [];
        switch (tipo) {
            case "admisiones":
                data = await prisma.admision.findMany({
                    where: {
                        fecha_programada: {
                            gte: fecha_desde ? new Date(fecha_desde) : undefined,
                            lte: fecha_hasta ? new Date(fecha_hasta) : undefined
                        }
                    },
                    include: {
                        paciente: {
                            include: { usuario: true }
                        }
                    }
                });
                break;
            case "facturas":
                data = await prisma.factura.findMany({
                    where: {
                        fecha_emision: {
                            gte: fecha_desde ? new Date(fecha_desde) : undefined,
                            lte: fecha_hasta ? new Date(fecha_hasta) : undefined
                        }
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
                break;
        }
        if (formato === "csv") {
            const csv = convertToCSV(data);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="${tipo}_${Date.now()}.csv"`);
            return res.send(csv);
        }
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
async function generateMonthlyAdmissionsReport(fecha_desde, fecha_hasta) {
    const start = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), 0, 1);
    const end = fecha_hasta ? new Date(fecha_hasta) : new Date();
    const admisiones = await prisma.admision.findMany({
        where: {
            fecha_programada: { gte: start, lte: end }
        }
    });
    const monthlyData = {};
    admisiones.forEach(adm => {
        const month = `${adm.fecha_programada.getFullYear()}-${String(adm.fecha_programada.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    return {
        tipo: "admisiones_mensual",
        periodo: { desde: start, hasta: end },
        datos: monthlyData
    };
}
async function generateAptitudeConceptsReport(fecha_desde, fecha_hasta, filtros) {
    const where = {};
    if (fecha_desde || fecha_hasta) {
        where.created_at = {};
        if (fecha_desde)
            where.created_at.gte = new Date(fecha_desde);
        if (fecha_hasta)
            where.created_at.lte = new Date(fecha_hasta);
    }
    if (filtros?.resultado)
        where.resultado = filtros.resultado;
    const conceptos = await prisma.conceptoAptitud.findMany({
        where,
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
    const porResultado = conceptos.reduce((acc, c) => {
        acc[c.resultado] = (acc[c.resultado] || 0) + 1;
        return acc;
    }, {});
    return {
        tipo: "conceptos_aptitud",
        total: conceptos.length,
        porResultado,
        conceptos
    };
}
async function generateIncomeReport(fecha_desde, fecha_hasta) {
    const where = {
        estado: "pagado"
    };
    if (fecha_desde || fecha_hasta) {
        where.fecha_emision = {};
        if (fecha_desde)
            where.fecha_emision.gte = new Date(fecha_desde);
        if (fecha_hasta)
            where.fecha_emision.lte = new Date(fecha_hasta);
    }
    const facturas = await prisma.factura.findMany({
        where,
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
    const total = facturas.reduce((sum, f) => sum + Number(f.total || 0), 0);
    const porMetodo = facturas.reduce((acc, f) => {
        const metodo = f.metodo_pago || "efectivo";
        acc[metodo] = (acc[metodo] || 0) + Number(f.total || 0);
        return acc;
    }, {});
    return {
        tipo: "ingresos",
        total,
        porMetodoPago: porMetodo,
        facturas: facturas.length
    };
}
async function generateLabExamsReport(fecha_desde, fecha_hasta) {
    const where = {};
    if (fecha_desde || fecha_hasta) {
        where.fecha_resultado = {};
        if (fecha_desde)
            where.fecha_resultado.gte = new Date(fecha_desde);
        if (fecha_hasta)
            where.fecha_resultado.lte = new Date(fecha_hasta);
    }
    const examenes = await prisma.examenLaboratorio.findMany({
        where,
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
    const porTipo = examenes.reduce((acc, e) => {
        acc[e.tipo_examen] = (acc[e.tipo_examen] || 0) + 1;
        return acc;
    }, {});
    return {
        tipo: "examenes_laboratorio",
        total: examenes.length,
        porTipo,
        examenes
    };
}
// POST /api/analytics/reports/pdf - Generar reporte PDF con gráficas
router.post("/reports/pdf", async (req, res) => {
    try {
        const { tipo, fecha_desde, fecha_hasta, filtros } = req.body;
        let reportData = {};
        switch (tipo) {
            case "admisiones_mensual":
                reportData = await generateMonthlyAdmissionsReport(fecha_desde, fecha_hasta);
                break;
            case "conceptos_aptitud":
                reportData = await generateAptitudeConceptsReport(fecha_desde, fecha_hasta, filtros);
                break;
            case "ingresos":
                reportData = await generateIncomeReport(fecha_desde, fecha_hasta);
                break;
            case "examenes_laboratorio":
                reportData = await generateLabExamsReport(fecha_desde, fecha_hasta);
                break;
            default:
                return res.status(400).json({ error: "Tipo de reporte no válido" });
        }
        // Generar PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="reporte_${tipo}_${Date.now()}.pdf"`);
        doc.pipe(res);
        // Título
        doc.fontSize(20).text("Reporte Analítico", { align: "center" });
        doc.moveDown();
        doc.fontSize(14).text(`Tipo: ${getReportTypeName(tipo)}`, { align: "center" });
        if (fecha_desde || fecha_hasta) {
            doc.text(`Período: ${fecha_desde || "Inicio"} - ${fecha_hasta || "Fin"}`, { align: "center" });
        }
        doc.moveDown(2);
        // Contenido según tipo
        switch (tipo) {
            case "admisiones_mensual":
                generateAdmissionsPDF(doc, reportData);
                break;
            case "conceptos_aptitud":
                generateAptitudePDF(doc, reportData);
                break;
            case "ingresos":
                generateIncomePDF(doc, reportData);
                break;
            case "examenes_laboratorio":
                generateLabPDF(doc, reportData);
                break;
        }
        doc.end();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
function getReportTypeName(tipo) {
    const names = {
        "admisiones_mensual": "Admisiones Mensuales",
        "conceptos_aptitud": "Conceptos de Aptitud",
        "ingresos": "Ingresos",
        "examenes_laboratorio": "Exámenes de Laboratorio"
    };
    return names[tipo] || tipo;
}
function generateAdmissionsPDF(doc, data) {
    doc.fontSize(16).text("Admisiones por Mes", { underline: true });
    doc.moveDown();
    const datos = data.datos || {};
    const meses = Object.keys(datos).sort();
    const valores = meses.map(m => datos[m]);
    doc.fontSize(12);
    meses.forEach((mes, index) => {
        doc.text(`${mes}: ${valores[index]} admisiones`);
    });
    doc.moveDown();
    doc.fontSize(14).text(`Total: ${valores.reduce((a, b) => a + b, 0)} admisiones`);
}
function generateAptitudePDF(doc, data) {
    doc.fontSize(16).text("Conceptos de Aptitud", { underline: true });
    doc.moveDown();
    doc.fontSize(14).text(`Total de Conceptos: ${data.total || 0}`);
    doc.moveDown();
    if (data.porResultado) {
        doc.fontSize(14).text("Distribución por Resultado:", { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        Object.entries(data.porResultado).forEach(([resultado, count]) => {
            doc.text(`${resultado}: ${count}`);
        });
    }
}
function generateIncomePDF(doc, data) {
    doc.fontSize(16).text("Reporte de Ingresos", { underline: true });
    doc.moveDown();
    doc.fontSize(14).text(`Total de Ingresos: S/ ${(data.total || 0).toFixed(2)}`);
    doc.text(`Total de Facturas: ${data.facturas || 0}`);
    doc.moveDown();
    if (data.porMetodoPago) {
        doc.fontSize(14).text("Ingresos por Método de Pago:", { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        Object.entries(data.porMetodoPago).forEach(([metodo, monto]) => {
            doc.text(`${metodo}: S/ ${Number(monto).toFixed(2)}`);
        });
    }
}
function generateLabPDF(doc, data) {
    doc.fontSize(16).text("Exámenes de Laboratorio", { underline: true });
    doc.moveDown();
    doc.fontSize(14).text(`Total de Exámenes: ${data.total || 0}`);
    doc.moveDown();
    if (data.porTipo) {
        doc.fontSize(14).text("Distribución por Tipo:", { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        Object.entries(data.porTipo).forEach(([tipo, count]) => {
            doc.text(`${tipo}: ${count}`);
        });
    }
}
function convertToCSV(data) {
    if (data.length === 0)
        return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined)
            return "";
        if (typeof value === "object")
            return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
    }).map(v => `"${v}"`).join(","));
    return [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
}
export default router;
