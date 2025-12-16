import express, { Request, Response } from "express";
import { prisma } from "../utils/database";
import PDFDocument from "pdfkit";

const router = express.Router();

// GET /api/analytics/dashboards - Dashboard principal
router.get("/dashboards", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalPacientes,
      totalAdmisiones,
      admisionesMes,
      conceptosEmitidos,
      facturasMes,
      ingresosMes,
      examenesPendientes
    ] = await Promise.all([
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/reports/exams-monthly - Reporte mensual de exámenes
router.get("/reports/exams-monthly", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const months: any[] = [];
    
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/dashboard/charts - Datos para gráficos del dashboard
router.get("/dashboard/charts", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    // 1. Admisiones mensuales (últimos 6 meses)
    const admisionesMensuales: any[] = [];
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
    
    const empresasConNombres = await Promise.all(
      pacientesPorEmpresa.map(async (p) => {
        const empresa = p.empresa_id ? await prisma.empresa.findUnique({
          where: { id: p.empresa_id }
        }) : null;
        return {
          empresa: empresa?.razon_social || "Sin empresa",
          cantidad: p._count.empresa_id
        };
      })
    );
    
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
    const ingresosMensuales: any[] = [];
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
    const conceptosMensuales: any[] = [];
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/reports - Generar reporte
router.post("/reports", async (req: Request, res: Response) => {
  try {
    const { tipo, fecha_desde, fecha_hasta, filtros } = req.body;

    let reportData: any = {};

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analytics/exports - Exportar datos
router.post("/exports", async (req: Request, res: Response) => {
  try {
    const { tipo, formato, fecha_desde, fecha_hasta } = req.body;

    let data: any[] = [];

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function generateMonthlyAdmissionsReport(fecha_desde?: string, fecha_hasta?: string) {
  const start = fecha_desde ? new Date(fecha_desde) : new Date(new Date().getFullYear(), 0, 1);
  const end = fecha_hasta ? new Date(fecha_hasta) : new Date();

  const admisiones = await prisma.admision.findMany({
    where: {
      fecha_programada: { gte: start, lte: end }
    },
    include: {
      paciente: {
        include: {
          empresa: true
        }
      }
    }
  });

  const monthlyData: { [key: string]: number } = {};
  const weeklyData: { [key: string]: number } = {};
  const byCompany: { [key: string]: number } = {};
  const byDayOfWeek: { [key: string]: number } = {};
  
  admisiones.forEach(adm => {
    // Por mes
    const month = `${adm.fecha_programada.getFullYear()}-${String(adm.fecha_programada.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[month] = (monthlyData[month] || 0) + 1;
    
    // Por semana
    const week = `${adm.fecha_programada.getFullYear()}-W${String(Math.ceil((adm.fecha_programada.getDate() + new Date(adm.fecha_programada.getFullYear(), adm.fecha_programada.getMonth(), 0).getDay()) / 7)).padStart(2, "0")}`;
    weeklyData[week] = (weeklyData[week] || 0) + 1;
    
    // Por empresa
    const empresaNombre = adm.paciente?.empresa?.razon_social || "Sin empresa";
    byCompany[empresaNombre] = (byCompany[empresaNombre] || 0) + 1;
    
    // Por día de la semana
    const dayOfWeek = adm.fecha_programada.getDay();
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    byDayOfWeek[dayNames[dayOfWeek]] = (byDayOfWeek[dayNames[dayOfWeek]] || 0) + 1;
  });

  return {
    tipo: "admisiones_mensual",
    periodo: { desde: start, hasta: end },
    datos: monthlyData,
    datosSemanales: weeklyData,
    porEmpresa: byCompany,
    porDiaSemana: byDayOfWeek,
    totalAdmisiones: admisiones.length
  };
}

async function generateAptitudeConceptsReport(fecha_desde?: string, fecha_hasta?: string, filtros?: any) {
  const where: any = {};
  if (fecha_desde || fecha_hasta) {
    where.created_at = {};
    if (fecha_desde) where.created_at.gte = new Date(fecha_desde);
    if (fecha_hasta) where.created_at.lte = new Date(fecha_hasta);
  }
  if (filtros?.resultado) where.resultado = filtros.resultado;

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

  const porResultado = conceptos.reduce((acc: any, c) => {
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

async function generateIncomeReport(fecha_desde?: string, fecha_hasta?: string) {
  const where: any = {
    estado: "pagado"
  };
  if (fecha_desde || fecha_hasta) {
    where.fecha_emision = {};
    if (fecha_desde) where.fecha_emision.gte = new Date(fecha_desde);
    if (fecha_hasta) where.fecha_emision.lte = new Date(fecha_hasta);
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
  const porMetodo = facturas.reduce((acc: any, f) => {
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

async function generateLabExamsReport(fecha_desde?: string, fecha_hasta?: string) {
  const where: any = {};
  if (fecha_desde || fecha_hasta) {
    where.fecha_resultado = {};
    if (fecha_desde) where.fecha_resultado.gte = new Date(fecha_desde);
    if (fecha_hasta) where.fecha_resultado.lte = new Date(fecha_hasta);
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

  const porTipo = examenes.reduce((acc: any, e) => {
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

// POST /api/analytics/reports/pdf - Generar reporte PDF profesional y completo
router.post("/reports/pdf", async (req: Request, res: Response) => {
  try {
    const { tipo, fecha_desde, fecha_hasta, filtros } = req.body;

    if (!tipo) {
      return res.status(400).json({ error: "Tipo de reporte es requerido" });
    }

    let reportData: any = {};

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

    // Validar que hay datos
    if (!reportData || Object.keys(reportData).length === 0) {
      return res.status(404).json({ error: "No se encontraron datos para el reporte" });
    }

    // Obtener configuración de la clínica
    let configClinica: any = null;
    try {
      const configClinicaRows = await (prisma as any).configClinica.findMany({
        take: 1,
        orderBy: { updated_at: "desc" }
      });
      if (configClinicaRows && configClinicaRows.length > 0) {
        configClinica = configClinicaRows[0];
      } else {
        const clinicConfigRows = await prisma.clinicConfig.findMany({ take: 1 });
        if (clinicConfigRows && clinicConfigRows.length > 0) {
          configClinica = {
            nombre: clinicConfigRows[0].name,
            ruc: clinicConfigRows[0].ruc,
            direccion: clinicConfigRows[0].address,
            telefono: clinicConfigRows[0].phone,
            email: clinicConfigRows[0].email
          };
        }
      }
    } catch (error) {
      console.error("Error obteniendo configuración de clínica:", error);
    }

    // Generar PDF profesional con colores vibrantes
    const doc = new PDFDocument({ 
      margin: 40,
      size: "A4",
      info: {
        Title: `Reporte Estadístico - ${getReportTypeName(tipo)}`,
        Author: configClinica?.nombre || "Sistema de Salud Laboral",
        Subject: "Reporte Analítico y Estadístico",
        Creator: "Sistema de Salud Laboral"
      }
    });
    
    doc.on("error", (err: Error) => {
      console.error("Error en PDF stream:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al generar PDF" });
      }
    });
    
    res.on("error", (err: Error) => {
      console.error("Error en response stream:", err);
    });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte_${tipo}_${Date.now()}.pdf"`);
    
    doc.pipe(res);

    // HEADER MODERNO CON GRADIENTE
    const nombreClinica = configClinica?.nombre || "CLÍNICA / CENTRO MÉDICO";
    const rucClinica = configClinica?.ruc || "—";
    const direccionClinica = configClinica?.direccion || "—";
    
    // Fondo degradado azul a morado (simulado con rectángulos)
    const gradientSteps = 8;
    const headerHeight = 80;
    const headerWidth = 515;
    for (let i = 0; i < gradientSteps; i++) {
      const r = Math.round(30 + (88 - 30) * (i / gradientSteps));
      const g = Math.round(64 + (28 - 64) * (i / gradientSteps));
      const b = Math.round(175 + (183 - 175) * (i / gradientSteps));
      doc.rect(40, 40 + (headerHeight / gradientSteps) * i, headerWidth, headerHeight / gradientSteps)
         .fillColor([r, g, b])
         .fill();
    }
    
    // Texto del header
    doc.fillColor("#FFFFFF")
       .fontSize(22)
       .font("Helvetica-Bold")
       .text(nombreClinica, 40, 55, { width: headerWidth, align: "center" });
    doc.fontSize(10)
       .font("Helvetica")
       .text(`RUC: ${rucClinica}`, 40, 85, { width: headerWidth, align: "center" });
    doc.fontSize(9)
       .text(direccionClinica, 40, 100, { width: headerWidth, align: "center" });
    
    doc.fillColor("#000000");
    doc.moveDown(3);

    // Título del reporte con caja colorida
    const titleY = 140;
    doc.roundedRect(60, titleY, 475, 70, 10)
       .fillAndStroke("#F3F4F6", "#E5E7EB");
    
    doc.fillColor("#1F2937")
       .fontSize(24)
       .font("Helvetica-Bold")
       .text("REPORTE ESTADÍSTICO", 70, titleY + 12, { width: 455, align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(18)
       .fillColor("#4F46E5")
       .text(getReportTypeName(tipo), { width: 455, align: "center" });
    
    // Información del período en badges
    const fechaInicio = fecha_desde ? new Date(fecha_desde).toLocaleDateString("es-PE") : "Inicio";
    const fechaFin = fecha_hasta ? new Date(fecha_hasta).toLocaleDateString("es-PE") : new Date().toLocaleDateString("es-PE");
    
    doc.moveDown(2);
    const badgeY = doc.y;
    
    // Badge de período
    doc.roundedRect(120, badgeY, 180, 25, 5)
       .fillAndStroke("#DBEAFE", "#3B82F6");
    doc.fillColor("#1E40AF")
       .fontSize(9)
       .font("Helvetica-Bold")
       .text(`Período: ${fechaInicio} - ${fechaFin}`, 125, badgeY + 8, { width: 170, align: "center" });
    
    // Badge de fecha de generación
    doc.roundedRect(315, badgeY, 140, 25, 5)
       .fillAndStroke("#FEF3C7", "#F59E0B");
    doc.fillColor("#92400E")
       .text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, 320, badgeY + 8, { width: 130, align: "center" });
    
    doc.fillColor("#000000").font("Helvetica");
    doc.moveDown(2);

    // Línea separadora con degradado
    for (let i = 0; i < 495; i += 2) {
      const opacity = Math.sin((i / 495) * Math.PI);
      const grayValue = Math.round(200 * opacity);
      doc.moveTo(50 + i, doc.y)
         .lineTo(50 + i + 2, doc.y)
         .strokeColor([grayValue, grayValue, grayValue])
         .lineWidth(2)
         .stroke();
    }
    doc.moveDown(1.5);

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

    // Footer moderno
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      
      // Línea superior del footer
      doc.moveTo(40, pageHeight - 50)
         .lineTo(pageWidth - 40, pageHeight - 50)
         .strokeColor("#E5E7EB")
         .lineWidth(1)
         .stroke();
      
      doc.fontSize(8)
         .fillColor("#6B7280")
         .text(
           `Generado por Sistema de Salud Laboral | Página ${i + 1} de ${range.count}`,
           40,
           pageHeight - 35,
           { width: pageWidth - 80, align: "center" }
         );
    }

    doc.end();
  } catch (error: any) {
    console.error("Error generando PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Error al generar PDF" });
    }
  }
});

function getReportTypeName(tipo: string): string {
  const names: { [key: string]: string } = {
    "admisiones_mensual": "Admisiones Mensuales",
    "conceptos_aptitud": "Conceptos de Aptitud",
    "ingresos": "Ingresos",
    "examenes_laboratorio": "Exámenes de Laboratorio"
  };
  return names[tipo] || tipo;
}

// Función auxiliar para convertir hex a RGB (para PDFKit)
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "black";
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// Función auxiliar para convertir datos a CSV
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const rows = data.map(item => 
    headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    }).map(v => `"${v}"`).join(",")
  );

  return [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
}

function generateAdmissionsPDF(doc: any, data: any) {
  try {
    const datos = data.datos || {};
    const meses = Object.keys(datos).sort();
    const valores = meses.map(m => datos[m]);

    if (valores.length === 0 || valores.every(v => v === 0)) {
      doc.fontSize(12).text("No hay datos disponibles para mostrar.", { align: "center" });
      return;
    }
    
    const total = valores.reduce((a: number, b: number) => a + b, 0);
    const promedio = total / (meses.length || 1);
    const maximo = Math.max(...valores);
    const minimo = Math.min(...valores);
    const mesMaximo = meses[valores.indexOf(maximo)];
    const mesMinimo = meses[valores.indexOf(minimo)];
    
    // Cálculos estadísticos
    const valoresOrdenados = [...valores].sort((a, b) => a - b);
    const mediana = valoresOrdenados.length % 2 === 0
      ? (valoresOrdenados[valoresOrdenados.length / 2 - 1] + valoresOrdenados[valoresOrdenados.length / 2]) / 2
      : valoresOrdenados[Math.floor(valoresOrdenados.length / 2)];
    
    const varianza = valores.reduce((acc, val) => acc + Math.pow(val - promedio, 2), 0) / valores.length;
    const desviacionEstandar = Math.sqrt(varianza);
    const coeficienteVariacion = promedio > 0 ? (desviacionEstandar / promedio * 100).toFixed(2) : "0.00";
    
    // Cálculo de tendencia (regresión lineal simple)
    let pendiente = 0;
    let tasaCrecimiento = "0.0";
    if (valores.length > 1) {
      const n = valores.length;
      const sumX = (n * (n - 1)) / 2; // suma de índices 0,1,2,...,n-1
      const sumY = valores.reduce((a, b) => a + b, 0);
      const sumXY = valores.reduce((acc, val, idx) => acc + idx * val, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // suma de cuadrados de índices
      
      pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      tasaCrecimiento = pendiente.toFixed(1);
    }

    // SECCIÓN 1: RESUMEN EJECUTIVO CON CARDS COLORIDAS
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1F2937");
    doc.text("RESUMEN EJECUTIVO", 60, doc.y, { width: 475, underline: true, align: "center" });
    doc.moveDown(0.8);
    
    const cardStartY = doc.y;
    const cardWidth = 115;
    const cardHeight = 75;
    const gap = 10;
    
    // Card 1: Total (Azul)
    doc.roundedRect(60, cardStartY, cardWidth, cardHeight, 8)
       .fillAndStroke("#DBEAFE", "#3B82F6");
    doc.fillColor("#1E40AF").fontSize(9).font("Helvetica-Bold")
       .text("TOTAL", 65, cardStartY + 10, { width: cardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(24)
       .text(total.toString(), 65, cardStartY + 30, { width: cardWidth - 10 });
    doc.fillColor("#6B7280").fontSize(8).font("Helvetica")
       .text("admisiones", 65, cardStartY + 60, { width: cardWidth - 10 });
    
    // Card 2: Promedio (Verde)
    doc.roundedRect(60 + cardWidth + gap, cardStartY, cardWidth, cardHeight, 8)
       .fillAndStroke("#D1FAE5", "#10B981");
    doc.fillColor("#065F46").fontSize(9).font("Helvetica-Bold")
       .text("PROMEDIO", 65 + cardWidth + gap, cardStartY + 10, { width: cardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(24)
       .text(promedio.toFixed(1), 65 + cardWidth + gap, cardStartY + 30, { width: cardWidth - 10 });
    doc.fillColor("#6B7280").fontSize(8).font("Helvetica")
       .text("por mes", 65 + cardWidth + gap, cardStartY + 60, { width: cardWidth - 10 });
    
    // Card 3: Máximo (Naranja)
    doc.roundedRect(60 + (cardWidth + gap) * 2, cardStartY, cardWidth, cardHeight, 8)
       .fillAndStroke("#FEF3C7", "#F59E0B");
    doc.fillColor("#92400E").fontSize(9).font("Helvetica-Bold")
       .text("MÁXIMO", 65 + (cardWidth + gap) * 2, cardStartY + 10, { width: cardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(24)
       .text(maximo.toString(), 65 + (cardWidth + gap) * 2, cardStartY + 30, { width: cardWidth - 10 });
    doc.fillColor("#6B7280").fontSize(8).font("Helvetica")
       .text(mesMaximo.substring(0, 8), 65 + (cardWidth + gap) * 2, cardStartY + 60, { width: cardWidth - 10 });
    
    // Card 4: Mediana (Morado)
    doc.roundedRect(60 + (cardWidth + gap) * 3, cardStartY, cardWidth, cardHeight, 8)
       .fillAndStroke("#EDE9FE", "#8B5CF6");
    doc.fillColor("#5B21B6").fontSize(9).font("Helvetica-Bold")
       .text("MEDIANA", 65 + (cardWidth + gap) * 3, cardStartY + 10, { width: cardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(24)
       .text(mediana.toFixed(1), 65 + (cardWidth + gap) * 3, cardStartY + 30, { width: cardWidth - 10 });
    doc.fillColor("#6B7280").fontSize(8).font("Helvetica")
       .text("valor central", 65 + (cardWidth + gap) * 3, cardStartY + 60, { width: cardWidth - 10 });
    
    doc.y = cardStartY + cardHeight + 20;

    // SECCIÓN 2: GRÁFICO DE BARRAS COLORIDO
    if (doc.y > 650) doc.addPage();
    
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1F2937");
    doc.text("GRÁFICO DE ADMISIONES MENSUALES", 60, doc.y, { width: 475, underline: true, align: "center" });
    doc.moveDown(0.8);
    
    const chartStartY = doc.y;
    const chartHeight = 180;
    const chartWidth = 480;
    const chartStartX = 60;
    const barWidth = Math.min(50, chartWidth / (meses.length * 1.3));
    const maxValue = Math.max(...valores, 1);
    
    // Fondo del gráfico
    doc.rect(chartStartX, chartStartY, chartWidth, chartHeight)
       .fillAndStroke("#F9FAFB", "#E5E7EB");
    
    // Líneas de guía horizontales
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = Math.round((maxValue / ySteps) * i);
      const yPos = chartStartY + chartHeight - (chartHeight / ySteps) * i;
      
      // Etiqueta
      doc.fontSize(8).fillColor("#6B7280")
         .text(value.toString(), chartStartX - 25, yPos - 3, { align: "right", width: 20 });
      
      // Línea guía
      if (i < ySteps) {
        doc.strokeColor("#E5E7EB").lineWidth(0.5)
           .moveTo(chartStartX, yPos)
           .lineTo(chartStartX + chartWidth, yPos)
           .stroke();
      }
    }
    
    // Dibujar barras coloridas
    const barColors = [
      [59, 130, 246],   // Azul
      [16, 185, 129],   // Verde
      [245, 158, 11],   // Naranja
      [239, 68, 68],    // Rojo
      [139, 92, 246],   // Morado
      [236, 72, 153],   // Rosa
      [14, 165, 233],   // Cyan
      [34, 197, 94]     // Verde claro
    ];
    
    meses.forEach((mes, index) => {
      const valor = valores[index];
      const barHeight = (valor / maxValue) * (chartHeight - 10);
      const xPos = chartStartX + 15 + (index * (barWidth + 15));
      const yPos = chartStartY + chartHeight - barHeight - 5;
      const color = barColors[index % barColors.length];
      
      // Barra con gradiente simulado
      for (let i = 0; i < barHeight; i += 2) {
        const opacity = 0.7 + (0.3 * (i / barHeight));
        const r = Math.round(color[0] * opacity);
        const g = Math.round(color[1] * opacity);
        const b = Math.round(color[2] * opacity);
        doc.rect(xPos, yPos + i, barWidth, 2)
           .fillColor([r, g, b])
           .fill();
      }
      
      // Valor encima de la barra
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1F2937")
         .text(valor.toString(), xPos, yPos - 12, { width: barWidth, align: "center" });
      
      // Etiqueta del mes (rotada)
      doc.save();
      doc.translate(xPos + barWidth / 2, chartStartY + chartHeight + 10);
      doc.rotate(-45);
      doc.fontSize(7).fillColor("#4B5563")
         .text(mes.substring(0, 8), 0, 0);
      doc.restore();
    });
    
    doc.y = chartStartY + chartHeight + 45;

    // SECCIÓN 3: TABLA DETALLADA CON COLORES
    if (doc.y > 650) doc.addPage();
    
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1F2937");
    doc.text("DETALLE POR MES", 60, doc.y, { width: 475, underline: true, align: "center" });
    doc.moveDown(0.8);
    
    // Encabezado de tabla
    const tableTop = doc.y;
    doc.rect(60, tableTop, 480, 25)
       .fillAndStroke("#4F46E5", "#4338CA");
    
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");
    doc.text("MES", 70, tableTop + 8, { width: 150 });
    doc.text("CANTIDAD", 250, tableTop + 8, { width: 80, align: "center" });
    doc.text("PORCENTAJE", 350, tableTop + 8, { width: 80, align: "center" });
    doc.text("TREND", 450, tableTop + 8, { width: 80, align: "center" });
    
    // Filas de datos
    let currentY = tableTop + 30;
    doc.font("Helvetica").fontSize(9);
    
    meses.forEach((mes, index) => {
      const valor = valores[index];
      const porcentaje = total > 0 ? ((valor / total) * 100).toFixed(1) : "0.0";
      const tendencia = index > 0 ? (valor > valores[index - 1] ? "↑" : valor < valores[index - 1] ? "↓" : "→") : "—";
      
      // Fila alternada
      if (index % 2 === 0) {
        doc.rect(60, currentY - 3, 480, 20).fillColor("#F9FAFB").fill();
      }
      
      doc.fillColor("#1F2937");
      doc.text(mes, 70, currentY, { width: 150 });
      doc.text(valor.toString(), 250, currentY, { width: 80, align: "center" });
      doc.text(`${porcentaje}%`, 350, currentY, { width: 80, align: "center" });
      
      // Tendencia con color
      const trendColor = tendencia === "↑" ? "#10B981" : tendencia === "↓" ? "#EF4444" : "#6B7280";
      doc.fillColor(trendColor).font("Helvetica-Bold");
      doc.text(tendencia, 450, currentY, { width: 80, align: "center" });
      doc.font("Helvetica");
      
      currentY += 20;
      
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
    });
    
    // Fila de totales
    currentY += 5;
    doc.rect(60, currentY - 3, 480, 25).fillAndStroke("#EDE9FE", "#8B5CF6");
    doc.font("Helvetica-Bold").fillColor("#5B21B6");
    doc.text("TOTAL", 70, currentY + 5, { width: 150 });
    doc.text(total.toString(), 250, currentY + 5, { width: 80, align: "center" });
    doc.text("100.0%", 350, currentY + 5, { width: 80, align: "center" });
    
    doc.y = currentY + 40;

    // SECCIÓN 4: ESTADÍSTICAS AVANZADAS
    if (doc.y > 700) doc.addPage();
    
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1F2937");
    doc.text("ANÁLISIS ESTADÍSTICO", 60, doc.y, { width: 475, underline: true, align: "center" });
    doc.moveDown(0.8);
    
    const statsY = doc.y;
    const statsCardWidth = 150;
    const statsCardHeight = 60;
    
    // Card: Desviación Estándar
    doc.roundedRect(60, statsY, statsCardWidth, statsCardHeight, 8)
       .fillAndStroke("#FEE2E2", "#EF4444");
    doc.fillColor("#991B1B").fontSize(8).font("Helvetica-Bold")
       .text("DESVIACIÓN ESTÁNDAR", 65, statsY + 10, { width: statsCardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(18)
       .text(desviacionEstandar.toFixed(2), 65, statsY + 28, { width: statsCardWidth - 10 });
    
    // Card: Coef. Variación
    doc.roundedRect(220, statsY, statsCardWidth, statsCardHeight, 8)
       .fillAndStroke("#DBEAFE", "#3B82F6");
    doc.fillColor("#1E40AF").fontSize(8).font("Helvetica-Bold")
       .text("COEF. VARIACIÓN", 225, statsY + 10, { width: statsCardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(18)
       .text(`${coeficienteVariacion}%`, 225, statsY + 28, { width: statsCardWidth - 10 });
    
    // Card: Rango
    doc.roundedRect(380, statsY, statsCardWidth, statsCardHeight, 8)
       .fillAndStroke("#D1FAE5", "#10B981");
    doc.fillColor("#065F46").fontSize(8).font("Helvetica-Bold")
       .text("RANGO", 385, statsY + 10, { width: statsCardWidth - 10 });
    doc.fillColor("#1F2937").fontSize(18)
       .text((maximo - minimo).toString(), 385, statsY + 28, { width: statsCardWidth - 10 });
    
    doc.fillColor("#000000").font("Helvetica");
    
    // SECCIÓN 4: INTERPRETACIÓN Y CONCLUSIONES
    doc.moveDown(3);
    if (doc.y > 650) doc.addPage();
    
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1F2937");
    doc.text("INTERPRETACIÓN Y CONCLUSIONES", 60, doc.y, { width: 475, underline: true, align: "center" });
    doc.moveDown(1);
    
    // Análisis de tendencia
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#3B82F6");
    doc.text("Tendencia General:", 60, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    
    let tendenciaTexto = "";
    if (Number(pendiente) > 0.5) {
      tendenciaTexto = `Se observa una tendencia CRECIENTE con un incremento promedio de ${tasaCrecimiento} admisiones por mes. Esto indica un aumento sostenido en la demanda de servicios de salud ocupacional.`;
    } else if (Number(pendiente) < -0.5) {
      tendenciaTexto = `Se observa una tendencia DECRECIENTE con una reducción promedio de ${Math.abs(Number(tasaCrecimiento))} admisiones por mes. Esto podría indicar una disminución en la actividad o mejoras en la prevención.`;
    } else {
      tendenciaTexto = `Se observa una tendencia ESTABLE con variaciones mínimas mes a mes (${tasaCrecimiento} admisiones/mes). El flujo de admisiones se mantiene relativamente constante.`;
    }
    doc.text(tendenciaTexto, 60, doc.y, { width: 475, align: "justify" });
    doc.moveDown(1);
    
    // Análisis de variabilidad
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#10B981");
    doc.text("Variabilidad:", 60, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    
    let variabilidadTexto = "";
    if (Number(coeficienteVariacion) < 15) {
      variabilidadTexto = `La variabilidad es BAJA (${coeficienteVariacion}%), lo que indica un comportamiento muy predecible y estable en el número de admisiones. Esto facilita la planificación de recursos.`;
    } else if (Number(coeficienteVariacion) < 35) {
      variabilidadTexto = `La variabilidad es MODERADA (${coeficienteVariacion}%), sugiriendo fluctuaciones regulares que requieren cierta flexibilidad en la asignación de recursos.`;
    } else {
      variabilidadTexto = `La variabilidad es ALTA (${coeficienteVariacion}%), indicando fluctuaciones significativas que requieren una gestión dinámica de recursos y personal.`;
    }
    doc.text(variabilidadTexto, 60, doc.y, { width: 475, align: "justify" });
    doc.moveDown(1);
    
    // Comparación con promedio
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#F59E0B");
    doc.text("Análisis del Período Actual:", 60, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    
    const ultimoValor = valores[valores.length - 1];
    const diferenciaPromedio = ((ultimoValor - promedio) / promedio * 100).toFixed(1);
    let comparacionTexto = "";
    
    if (ultimoValor > promedio * 1.1) {
      comparacionTexto = `El último mes registrado (${ultimoValor} admisiones) está ${diferenciaPromedio}% POR ENCIMA del promedio histórico (${promedio.toFixed(1)} admisiones). Esto representa un incremento significativo que requiere atención.`;
    } else if (ultimoValor < promedio * 0.9) {
      comparacionTexto = `El último mes registrado (${ultimoValor} admisiones) está ${Math.abs(Number(diferenciaPromedio))}% POR DEBAJO del promedio histórico (${promedio.toFixed(1)} admisiones). Esto podría indicar una disminución temporal o estacional.`;
    } else {
      comparacionTexto = `El último mes registrado (${ultimoValor} admisiones) se encuentra dentro del rango normal, cerca del promedio histórico (${promedio.toFixed(1)} admisiones).`;
    }
    doc.text(comparacionTexto, 60, doc.y, { width: 475, align: "justify" });
    doc.moveDown(1);
    
    // Recomendaciones
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#8B5CF6");
    doc.text("Recomendaciones:", 60, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#374151");
    
    const recomendaciones = [];
    
    if (Number(pendiente) > 0.5) {
      recomendaciones.push("• Considerar ampliar la capacidad de atención para el incremento proyectado");
      recomendaciones.push("• Revisar y optimizar los procesos de admisión para manejar mayor volumen");
    } else if (Number(pendiente) < -0.5) {
      recomendaciones.push("• Investigar las causas de la disminución en admisiones");
      recomendaciones.push("• Evaluar estrategias de promoción de servicios de salud ocupacional");
    }
    
    if (Number(coeficienteVariacion) > 35) {
      recomendaciones.push("• Implementar un sistema de gestión flexible de recursos humanos");
      recomendaciones.push("• Establecer protocolos para picos y valles de demanda");
    }
    
    if (ultimoValor > promedio * 1.2) {
      recomendaciones.push("• Monitorear de cerca el incremento reciente y sus causas");
      recomendaciones.push("• Asegurar disponibilidad de personal y materiales adicionales");
    }
    
    if (recomendaciones.length === 0) {
      recomendaciones.push("• Mantener el nivel actual de recursos y servicios");
      recomendaciones.push("• Continuar monitoreando las métricas periódicamente");
    }
    
    recomendaciones.forEach(rec => {
      doc.text(rec, 70, doc.y, { width: 465, align: "left" });
      doc.moveDown(0.4);
    });
    
    doc.fillColor("#000000").font("Helvetica");
    
  } catch (error) {
    console.error("Error en generateAdmissionsPDF:", error);
    doc.fontSize(12).text("Error al generar el reporte.", { align: "center" });
  }
}

function generateAptitudePDF(doc: any, data: any) {
  const total = data.total || 0;
  const porResultado = data.porResultado || {};
  const resultados = Object.entries(porResultado).sort((a: any, b: any) => b[1] - a[1]);

  // Resumen ejecutivo
  doc.fontSize(14).font("Helvetica-Bold").text("RESUMEN EJECUTIVO", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");
  doc.text(`Total de Conceptos Emitidos:`, 60, doc.y, { continued: false, width: 200 });
  doc.font("Helvetica-Bold").text(`${total}`, { continued: false });
  doc.font("Helvetica");
  doc.moveDown(1);

  // Tabla de distribución
  doc.fontSize(14).font("Helvetica-Bold").text("DISTRIBUCIÓN POR RESULTADO", { underline: true });
  doc.moveDown(0.5);
  
  const tableTop = doc.y;
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Resultado", 60, tableTop);
  doc.text("Cantidad", 300, tableTop);
  doc.text("Porcentaje", 420, tableTop);
  doc.text("Proporción", 500, tableTop);
  
  doc.moveTo(60, tableTop + 15)
     .lineTo(545, tableTop + 15)
     .strokeColor("black")
     .lineWidth(0.5)
     .stroke();
  
  let currentY = tableTop + 20;
  doc.font("Helvetica").fontSize(10);
  
  resultados.forEach(([resultado, count]: [string, any]) => {
    const porcentaje = total > 0 ? ((count / total) * 100).toFixed(2) : "0.00";
    const proporcion = total > 0 ? `${count}:${total - count}` : "0:0";
    
    doc.text(resultado, 60, currentY);
    doc.text(`${count}`, 300, currentY);
    doc.text(`${porcentaje}%`, 420, currentY);
    doc.text(proporcion, 500, currentY);
    
    doc.moveTo(60, currentY + 12)
       .lineTo(545, currentY + 12)
       .strokeColor("lightgray")
       .lineWidth(0.3)
       .stroke();
    
    currentY += 15;
    
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }
  });
  
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold");
  doc.moveTo(60, doc.y)
     .lineTo(545, doc.y)
     .strokeColor("black")
     .lineWidth(1)
     .stroke();
  doc.moveDown(0.3);
  doc.text("TOTAL", 60, doc.y);
  doc.text(`${total}`, 300, doc.y);
  doc.text("100.00%", 420, doc.y);
  
  doc.moveDown(1);
  
  // Gráfico de barras horizontales para distribución
  if (resultados.length > 0) {
    doc.fontSize(14).font("Helvetica-Bold").text("GRÁFICO DE DISTRIBUCIÓN", { underline: true });
    doc.moveDown(0.5);
    
    const chartStartY = doc.y;
    const chartHeight = resultados.length * 25;
    const chartWidth = 400;
    const chartStartX = 100;
    const maxValue = Math.max(...resultados.map((r: any) => r[1]));
    
    if (maxValue === 0) {
      doc.fontSize(10).text("No hay datos para graficar.");
      doc.moveDown(1);
    } else {
    // Ejes
    doc.strokeColor("black")
       .lineWidth(1)
       .moveTo(chartStartX, chartStartY)
       .lineTo(chartStartX, chartStartY + chartHeight)
       .lineTo(chartStartX + chartWidth, chartStartY + chartHeight)
       .stroke();
    
    // Barras horizontales
    resultados.forEach(([resultado, count]: [string, any], index) => {
      const barWidth = (count / maxValue) * chartWidth;
      const yPos = chartStartY + (index * 25) + 5;
      
      const colors = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];
      const colorHex = colors[index % colors.length];
      const colorRgb = hexToRgb(colorHex);
      
      // Barra
      doc.rect(chartStartX, yPos, barWidth, 15)
         .fillColor(colorRgb)
         .fill()
         .strokeColor("black")
         .lineWidth(0.5)
         .stroke();
      
      // Etiquetas
      doc.fontSize(9)
         .fillColor("black")
         .text(resultado, 60, yPos + 3, { width: 35, align: "right" });
      
      doc.fontSize(8)
         .fillColor("gray")
         .text(`${count} (${((count / total) * 100).toFixed(1)}%)`, chartStartX + barWidth + 5, yPos + 3);
    });
    
      doc.moveDown(3);
    }
  }
  
  // Análisis
  doc.fontSize(12).font("Helvetica-Bold").text("ANÁLISIS", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica");
  
  if (resultados.length > 0) {
    const [resultadoMayor, countMayor]: [string, any] = resultados[0];
    const porcentajeMayor = total > 0 ? ((countMayor / total) * 100).toFixed(2) : "0.00";
    doc.text(`• Resultado más frecuente: ${resultadoMayor} (${porcentajeMayor}% del total)`);
    
    if (resultados.length > 1) {
      const [resultadoMenor, countMenor]: [string, any] = resultados[resultados.length - 1];
      const porcentajeMenor = total > 0 ? ((countMenor / total) * 100).toFixed(2) : "0.00";
      doc.text(`• Resultado menos frecuente: ${resultadoMenor} (${porcentajeMenor}% del total)`);
    }
    
    const aptos = porResultado["APTO"] || 0;
    const noAptos = (porResultado["NO APTO"] || 0) + (porResultado["APTO CON RESTRICCIONES"] || 0);
    if (aptos + noAptos > 0) {
      const tasaAptitud = ((aptos / (aptos + noAptos)) * 100).toFixed(2);
      doc.text(`• Tasa de aptitud: ${tasaAptitud}%`);
    }
  }
}

function generateIncomePDF(doc: any, data: any) {
  const total = Number(data.total || 0);
  const facturas = data.facturas || 0;
  const promedioFactura = facturas > 0 ? total / facturas : 0;
  const porMetodoPago = data.porMetodoPago || {};
  const metodos = Object.entries(porMetodoPago).sort((a: any, b: any) => b[1] - a[1]);

  // Resumen ejecutivo
  doc.fontSize(14).font("Helvetica-Bold").text("RESUMEN EJECUTIVO", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");
  
  const startY = doc.y;
  doc.text(`Total de Ingresos:`, 60, startY, { continued: false, width: 200 });
  doc.font("Helvetica-Bold").text(`S/ ${total.toFixed(2)}`, { continued: false });
  doc.font("Helvetica");
  
  doc.text(`Total de Facturas:`, 60, doc.y + 5, { continued: false, width: 200 });
  doc.font("Helvetica-Bold").text(`${facturas}`, { continued: false });
  doc.font("Helvetica");
  
  doc.text(`Ticket Promedio:`, 60, doc.y + 5, { continued: false, width: 200 });
  doc.font("Helvetica-Bold").text(`S/ ${promedioFactura.toFixed(2)}`, { continued: false });
  doc.font("Helvetica");
  
  doc.moveDown(1.5);

  // Tabla de ingresos por método de pago
  if (metodos.length > 0) {
    doc.fontSize(14).font("Helvetica-Bold").text("INGRESOS POR MÉTODO DE PAGO", { underline: true });
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Método de Pago", 60, tableTop);
    doc.text("Monto (S/)", 300, tableTop);
    doc.text("Porcentaje", 420, tableTop);
    doc.text("Facturas", 500, tableTop);
    
    doc.moveTo(60, tableTop + 15)
       .lineTo(545, tableTop + 15)
       .strokeColor("black")
       .lineWidth(0.5)
       .stroke();
    
    let currentY = tableTop + 20;
    doc.font("Helvetica").fontSize(10);
    
    metodos.forEach(([metodo, monto]: [string, any]) => {
      const porcentaje = total > 0 ? ((Number(monto) / total) * 100).toFixed(2) : "0.00";
      
      doc.text(metodo, 60, currentY);
      doc.text(`S/ ${Number(monto).toFixed(2)}`, 300, currentY);
      doc.text(`${porcentaje}%`, 420, currentY);
      doc.text("—", 500, currentY); // Se podría calcular si tenemos los datos
      
      doc.moveTo(60, currentY + 12)
         .lineTo(545, currentY + 12)
         .strokeColor("lightgray")
         .lineWidth(0.3)
         .stroke();
      
      currentY += 15;
      
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
    });
    
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    doc.moveTo(60, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("black")
       .lineWidth(1)
       .stroke();
    doc.moveDown(0.3);
    doc.text("TOTAL", 60, doc.y);
    doc.text(`S/ ${total.toFixed(2)}`, 300, doc.y);
    doc.text("100.00%", 420, doc.y);
    
    doc.moveDown(1);
    
    // Gráfico de barras para ingresos por método
    if (metodos.length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("GRÁFICO DE INGRESOS POR MÉTODO", { underline: true });
      doc.moveDown(0.5);
      
      const chartStartY = doc.y;
      const chartHeight = 150;
      const chartWidth = 450;
      const chartStartX = 60;
      const barWidth = chartWidth / (metodos.length * 1.5);
      const maxValue = Math.max(...metodos.map((m: any) => Number(m[1])));
      
      if (maxValue === 0) {
        doc.fontSize(10).text("No hay ingresos para graficar.");
        doc.moveDown(1);
      } else {
      // Ejes
      doc.strokeColor("black")
         .lineWidth(1)
         .moveTo(chartStartX, chartStartY)
         .lineTo(chartStartX, chartStartY + chartHeight)
         .lineTo(chartStartX + chartWidth, chartStartY + chartHeight)
         .stroke();
      
      // Etiquetas del eje Y
      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const value = Math.round((maxValue / ySteps) * i);
        const yPos = chartStartY + chartHeight - (chartHeight / ySteps) * i;
        doc.fontSize(8)
           .fillColor("gray")
           .text(`S/ ${value.toLocaleString("es-PE")}`, chartStartX - 25, yPos - 5, { align: "right", width: 20 });
        
        if (i < ySteps) {
          doc.strokeColor("lightgray")
             .lineWidth(0.3)
             .moveTo(chartStartX, yPos)
             .lineTo(chartStartX + chartWidth, yPos)
             .stroke();
        }
      }
      
      // Barras
      metodos.forEach(([metodo, monto]: [string, any], index) => {
        const valor = Number(monto);
        const barHeight = (valor / maxValue) * chartHeight;
        const xPos = chartStartX + (index * barWidth * 1.5) + 10;
        const yPos = chartStartY + chartHeight - barHeight;
        
        const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];
        const colorHex = colors[index % colors.length];
        const colorRgb = hexToRgb(colorHex);
        
        doc.rect(xPos, yPos, barWidth - 5, barHeight)
           .fillColor(colorRgb)
           .fill()
           .strokeColor("black")
           .lineWidth(0.5)
           .stroke();
        
        doc.fontSize(7)
           .fillColor("black")
           .text(`S/ ${valor.toFixed(0)}`, xPos, yPos - 12, { width: barWidth - 5, align: "center" });
        
        const metodoLabel = metodo.length > 10 ? metodo.substring(0, 8) + "..." : metodo;
        doc.fontSize(7)
           .fillColor("gray")
           .text(metodoLabel, xPos, chartStartY + chartHeight + 5, { width: barWidth - 5, align: "center" });
      });
      
      doc.moveDown(3);
      }
    }
    
    // Análisis
    doc.fontSize(12).font("Helvetica-Bold").text("ANÁLISIS FINANCIERO", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica");
    
    if (metodos.length > 0) {
      const [metodoMayor, montoMayor]: [string, any] = metodos[0];
      const porcentajeMayor = total > 0 ? ((Number(montoMayor) / total) * 100).toFixed(2) : "0.00";
      doc.text(`• Método de pago más utilizado: ${metodoMayor} (${porcentajeMayor}% del total)`);
      
      if (metodos.length > 1) {
        const [metodoMenor, montoMenor]: [string, any] = metodos[metodos.length - 1];
        const porcentajeMenor = total > 0 ? ((Number(montoMenor) / total) * 100).toFixed(2) : "0.00";
        doc.text(`• Método de pago menos utilizado: ${metodoMenor} (${porcentajeMenor}% del total)`);
      }
    }
    
    doc.text(`• Valor promedio por factura: S/ ${promedioFactura.toFixed(2)}`);
    
    if (facturas > 0) {
      const proyeccionMensual = total;
      const proyeccionAnual = proyeccionMensual * 12;
      doc.text(`• Proyección anual (basada en período): S/ ${proyeccionAnual.toFixed(2)}`);
    }
  }
}

function generateLabPDF(doc: any, data: any) {
  const total = data.total || 0;
  const porTipo = data.porTipo || {};
  const tipos = Object.entries(porTipo).sort((a: any, b: any) => b[1] - a[1]);

  // Resumen ejecutivo
  doc.fontSize(14).font("Helvetica-Bold").text("RESUMEN EJECUTIVO", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");
  doc.text(`Total de Exámenes Realizados:`, 60, doc.y, { continued: false, width: 200 });
  doc.font("Helvetica-Bold").text(`${total}`, { continued: false });
  doc.font("Helvetica");
  doc.moveDown(1);

  // Tabla de distribución
  if (tipos.length > 0) {
    doc.fontSize(14).font("Helvetica-Bold").text("DISTRIBUCIÓN POR TIPO DE EXAMEN", { underline: true });
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Tipo de Examen", 60, tableTop);
    doc.text("Cantidad", 300, tableTop);
    doc.text("Porcentaje", 420, tableTop);
    doc.text("Frecuencia", 500, tableTop);
    
    doc.moveTo(60, tableTop + 15)
       .lineTo(545, tableTop + 15)
       .strokeColor("black")
       .lineWidth(0.5)
       .stroke();
    
    let currentY = tableTop + 20;
    doc.font("Helvetica").fontSize(10);
    
    tipos.forEach(([tipo, count]: [string, any]) => {
      const porcentaje = total > 0 ? ((count / total) * 100).toFixed(2) : "0.00";
      const frecuencia = total > 0 ? `1 cada ${Math.round(total / count)}` : "—";
      
      doc.text(tipo.length > 30 ? tipo.substring(0, 30) + "..." : tipo, 60, currentY);
      doc.text(`${count}`, 300, currentY);
      doc.text(`${porcentaje}%`, 420, currentY);
      doc.text(frecuencia, 500, currentY);
      
      doc.moveTo(60, currentY + 12)
         .lineTo(545, currentY + 12)
         .strokeColor("lightgray")
         .lineWidth(0.3)
         .stroke();
      
      currentY += 15;
      
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
    });
    
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold");
    doc.moveTo(60, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("black")
       .lineWidth(1)
       .stroke();
    doc.moveDown(0.3);
    doc.text("TOTAL", 60, doc.y);
    doc.text(`${total}`, 300, doc.y);
    doc.text("100.00%", 420, doc.y);
    
    doc.moveDown(1.5);
    
    // Gráfico de barras horizontales con mejor formato
    if (tipos.length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("POR TIPO", { underline: true });
      doc.moveDown(0.8);
      
      const chartStartY = doc.y;
      const chartHeight = Math.min(tipos.length * 25, 250);
      const chartWidth = 350;
      const chartStartX = 120;
      const maxValue = Math.max(...tipos.map((t: any) => t[1]));
      
      if (maxValue === 0) {
        doc.fontSize(10).text("No hay datos para graficar.");
        doc.moveDown(1);
      } else {
        // Ejes con mejor formato
        doc.strokeColor("black")
           .lineWidth(1.5)
           .moveTo(chartStartX, chartStartY)
           .lineTo(chartStartX, chartStartY + chartHeight)
           .lineTo(chartStartX + chartWidth, chartStartY + chartHeight)
           .stroke();
        
        // Barras horizontales mejoradas
        tipos.slice(0, Math.floor(chartHeight / 25)).forEach(([tipo, count]: [string, any], index) => {
          const barWidth = (count / maxValue) * chartWidth;
          const yPos = chartStartY + (index * 25) + 5;
          
          // Colores alternados para mejor visualización
          const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
          const colorHex = colors[index % colors.length];
          const colorRgb = hexToRgb(colorHex);
          
          // Barra con mejor altura
          doc.rect(chartStartX, yPos, barWidth, 18)
             .fillColor(colorRgb)
             .fill()
             .strokeColor("black")
             .lineWidth(0.8)
             .stroke();
          
          // Etiqueta del tipo (mejor formato)
          const tipoLabel = tipo.length > 20 ? tipo.substring(0, 18) + "..." : tipo;
          doc.fontSize(9)
             .fillColor("black")
             .font("Helvetica")
             .text(tipoLabel, 60, yPos + 4, { width: 55, align: "right" });
          
          // Valor y porcentaje (mejor formato)
          doc.fontSize(8)
             .fillColor("black")
             .font("Helvetica-Bold")
             .text(`${count} (${((count / total) * 100).toFixed(1)}%)`, chartStartX + barWidth + 8, yPos + 5);
        });
        
        doc.moveDown(2);
      }
    }
    
    // Análisis mejorado
    doc.moveDown(1);
    doc.fontSize(12).font("Helvetica-Bold").text("ANÁLISIS", { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(10).font("Helvetica");
    
    if (tipos.length > 0) {
      const [tipoMayor, countMayor]: [string, any] = tipos[0];
      const porcentajeMayor = total > 0 ? ((countMayor / total) * 100).toFixed(2) : "0.00";
      
      // Solo mostrar "más solicitado" y "menos solicitado" si hay diferencia
      if (tipos.length > 1) {
        const [tipoMenor, countMenor]: [string, any] = tipos[tipos.length - 1];
        const porcentajeMenor = total > 0 ? ((countMenor / total) * 100).toFixed(2) : "0.00";
        
        // Si los porcentajes son diferentes, mostrar ambos
        if (porcentajeMayor !== porcentajeMenor) {
          doc.text(`• Tipo de examen más solicitado: ${tipoMayor} (${porcentajeMayor}% del total)`);
          doc.moveDown(0.3);
          doc.text(`• Tipo de examen menos solicitado: ${tipoMenor} (${porcentajeMenor}% del total)`);
        } else {
          // Si todos tienen el mismo porcentaje, indicarlo
          doc.text(`• Todos los tipos tienen la misma distribución (${porcentajeMayor}% cada uno)`);
        }
      } else {
        // Solo hay un tipo
        doc.text(`• Tipo de examen: ${tipoMayor} (${porcentajeMayor}% del total)`);
      }
      
      doc.moveDown(0.3);
      doc.text(`• Diversidad de exámenes: ${tipos.length} tipo${tipos.length > 1 ? 's' : ''} diferente${tipos.length > 1 ? 's' : ''}`);
    }
  }
}

export default router;

