import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";

const router = express.Router();
const prisma = new PrismaClient();

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

    // Generar PDF profesional
    const doc = new PDFDocument({ 
      margin: 50,
      size: "A4",
      info: {
        Title: `Reporte Estadístico - ${getReportTypeName(tipo)}`,
        Author: configClinica?.nombre || "Sistema de Salud Laboral",
        Subject: "Reporte Analítico y Estadístico",
        Creator: "Sistema de Salud Laboral"
      }
    });
    
    // Manejar errores del stream
    doc.on("error", (err: Error) => {
      console.error("Error en PDF stream:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al generar PDF" });
      }
    });
    
    res.on("error", (err: Error) => {
      console.error("Error en response stream:", err);
      // El stream se cerrará automáticamente
    });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte_${tipo}_${Date.now()}.pdf"`);
    
    doc.pipe(res);

    // Encabezado profesional
    const nombreClinica = configClinica?.nombre || "CLÍNICA / CENTRO MÉDICO";
    const rucClinica = configClinica?.ruc || "—";
    const direccionClinica = configClinica?.direccion || "—";
    
    // Línea superior decorativa
    doc.rect(50, 50, 495, 60)
       .fillColor(hexToRgb("#1e40af"))
       .fill();
    
    doc.fillColor("white")
       .fontSize(18)
       .font("Helvetica-Bold")
       .text(nombreClinica, 50, 65, { width: 495, align: "center" });
    doc.fontSize(10)
       .text(`RUC: ${rucClinica} | ${direccionClinica}`, 50, 90, { width: 495, align: "center" });
    
    doc.fillColor("black");
    doc.moveDown(2);

    // Título del reporte
    doc.fontSize(20)
       .font("Helvetica-Bold")
       .text("REPORTE ESTADÍSTICO Y ANALÍTICO", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(16)
       .font("Helvetica")
       .text(getReportTypeName(tipo), { align: "center" });
    
    // Información del período
    const fechaInicio = fecha_desde ? new Date(fecha_desde).toLocaleDateString("es-PE") : "Inicio";
    const fechaFin = fecha_hasta ? new Date(fecha_hasta).toLocaleDateString("es-PE") : new Date().toLocaleDateString("es-PE");
    doc.moveDown(0.5);
    doc.fontSize(11)
       .fillColor("gray")
       .text(`Período: ${fechaInicio} - ${fechaFin}`, { align: "center" });
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString("es-PE", { 
      day: "2-digit", 
      month: "long", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })}`, { align: "center" });
    
    doc.fillColor("black");
    doc.moveDown(1.5);

    // Línea separadora
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor("gray")
       .lineWidth(1)
       .stroke();
    doc.moveDown(1);

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

    // Pie de página simple - agregar al final para evitar problemas de recursión
    // No usamos pageAdded para evitar problemas con bufferedPageRange()
    const addSimpleFooter = (pageNum: number) => {
      try {
        const pageHeight = doc.page.height;
        const pageWidth = doc.page.width;
        const savedY = doc.y;
        const savedX = doc.x;
        
        doc.fontSize(8)
           .fillColor("gray")
           .text(
             `Generado por Sistema de Salud Laboral`,
             50,
             pageHeight - 30,
             { width: pageWidth - 100, align: "center" }
           );
        
        // Restaurar posición
        doc.y = savedY;
        doc.x = savedX;
      } catch (err) {
        // Silenciar errores
      }
    };
    
    // Agregar footer solo al final, no en cada página para evitar recursión
    // El footer se agregará manualmente si es necesario

    // Finalizar el PDF
    try {
    doc.end();
    } catch (err: any) {
      console.error("Error finalizando PDF:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al finalizar PDF" });
      }
    }
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
    const datosSemanales = data.datosSemanales || {};
    const porEmpresa = data.porEmpresa || {};
    const porDiaSemana = data.porDiaSemana || {};

    // Validar que hay datos
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
    
    // Cálculos estadísticos avanzados
    const valoresOrdenados = [...valores].sort((a, b) => a - b);
    const mediana = valoresOrdenados.length % 2 === 0
      ? (valoresOrdenados[valoresOrdenados.length / 2 - 1] + valoresOrdenados[valoresOrdenados.length / 2]) / 2
      : valoresOrdenados[Math.floor(valoresOrdenados.length / 2)];
    
    // Desviación estándar
    const varianza = valores.reduce((acc, val) => acc + Math.pow(val - promedio, 2), 0) / valores.length;
    const desviacionEstandar = Math.sqrt(varianza);
    
    // Moda (valor más frecuente)
    const frecuencia: { [key: number]: number } = {};
    valores.forEach(v => frecuencia[v] = (frecuencia[v] || 0) + 1);
    const moda = Object.keys(frecuencia).reduce((a, b) => frecuencia[Number(a)] > frecuencia[Number(b)] ? a : b);
    
    // Coeficiente de variación
    const coeficienteVariacion = promedio > 0 ? (desviacionEstandar / promedio * 100).toFixed(2) : "0.00";
    
    // Cálculo de tendencia (regresión lineal simple)
    const n = valores.length;
    const sumX = valores.reduce((acc, _, i) => acc + (i + 1), 0);
    const sumY = valores.reduce((acc, val) => acc + val, 0);
    const sumXY = valores.reduce((acc, val, i) => acc + (i + 1) * val, 0);
    const sumX2 = valores.reduce((acc, _, i) => acc + Math.pow(i + 1, 2), 0);
    const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - Math.pow(sumX, 2));
    const tendencia = pendiente > 0 ? "Creciente" : pendiente < 0 ? "Decreciente" : "Estable";
    const tasaCrecimiento = Math.abs(pendiente).toFixed(2);

    // Resumen ejecutivo mejorado
    doc.fontSize(16).font("Helvetica-Bold").text("RESUMEN EJECUTIVO", { underline: true });
    doc.moveDown(0.8);
    
    // Métricas principales en dos columnas
    const startY = doc.y;
    const col1X = 60;
    const col2X = 320;
    const lineHeight = 18;
    
    doc.fontSize(10).font("Helvetica");
    
    // Columna 1
    doc.text(`Total de Admisiones:`, col1X, startY, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${total}`, { continued: false });
    doc.font("Helvetica");
    
    doc.text(`Promedio Mensual:`, col1X, startY + lineHeight, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${promedio.toFixed(2)}`, { continued: false });
    doc.font("Helvetica");
    
    doc.text(`Mediana:`, col1X, startY + lineHeight * 2, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${mediana.toFixed(2)}`, { continued: false });
    doc.font("Helvetica");
    
    doc.text(`Moda:`, col1X, startY + lineHeight * 3, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${moda}`, { continued: false });
    doc.font("Helvetica");
    
    // Columna 2
    doc.text(`Mes con Mayor Número:`, col2X, startY, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${mesMaximo} (${maximo})`, { continued: false });
    doc.font("Helvetica");
    
    doc.text(`Mes con Menor Número:`, col2X, startY + lineHeight, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${mesMinimo} (${minimo})`, { continued: false });
    doc.font("Helvetica");
    
    doc.text(`Desviación Estándar:`, col2X, startY + lineHeight * 2, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${desviacionEstandar.toFixed(2)}`, { continued: false });
    doc.font("Helvetica");
    
    doc.text(`Coef. Variación:`, col2X, startY + lineHeight * 3, { continued: false, width: 200 });
    doc.font("Helvetica-Bold").text(`${coeficienteVariacion}%`, { continued: false });
    doc.font("Helvetica");
    
    doc.moveDown(2);

  // Tabla de datos
  doc.fontSize(14).font("Helvetica-Bold").text("DETALLE POR MES", { underline: true });
  doc.moveDown(0.5);
  
  // Encabezado de tabla
  const tableTop = doc.y;
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Mes", 60, tableTop);
  doc.text("Cantidad", 300, tableTop);
  doc.text("Porcentaje", 420, tableTop);
  doc.text("Tendencia", 500, tableTop);
  
  // Línea debajo del encabezado
  doc.moveTo(60, tableTop + 15)
     .lineTo(545, tableTop + 15)
     .strokeColor("black")
     .lineWidth(0.5)
     .stroke();
  
  // Filas de datos
  let currentY = tableTop + 20;
  doc.font("Helvetica").fontSize(10);
  
  meses.forEach((mes, index) => {
    const valor = valores[index];
    const porcentaje = total > 0 ? ((valor / total) * 100).toFixed(2) : "0.00";
    const tendencia = index > 0 ? (valor > valores[index - 1] ? "↑" : valor < valores[index - 1] ? "↓" : "→") : "—";
    
    doc.text(mes, 60, currentY);
    doc.text(`${valor}`, 300, currentY);
    doc.text(`${porcentaje}%`, 420, currentY);
    doc.text(tendencia, 500, currentY);
    
    // Línea separadora
    doc.moveTo(60, currentY + 12)
       .lineTo(545, currentY + 12)
       .strokeColor("lightgray")
       .lineWidth(0.3)
       .stroke();
    
    currentY += 15;
    
    // Nueva página si es necesario
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
    }
  });
  
  // Fila de totales
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
  
  // Gráfico de barras vectorial
  if (meses.length > 0 && valores.length > 0) {
    const maxValue = Math.max(...valores, 1);
    if (maxValue > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("GRÁFICO DE BARRAS - ADMISIONES MENSUALES", { underline: true });
      doc.moveDown(0.5);
      
      const chartStartY = doc.y;
      const chartHeight = 150;
      const chartWidth = 450;
      const chartStartX = 60;
      const barWidth = chartWidth / (meses.length * 1.5);
    
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
         .text(value.toString(), chartStartX - 20, yPos - 5, { align: "right", width: 15 });
      
      // Línea de guía
      if (i < ySteps) {
        doc.strokeColor("lightgray")
           .lineWidth(0.3)
           .moveTo(chartStartX, yPos)
           .lineTo(chartStartX + chartWidth, yPos)
           .stroke();
      }
    }
    
    // Barras
    meses.forEach((mes, index) => {
      const valor = valores[index];
      const barHeight = (valor / maxValue) * chartHeight;
      const xPos = chartStartX + (index * barWidth * 1.5) + 10;
      const yPos = chartStartY + chartHeight - barHeight;
      
      // Color de la barra
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
      const colorHex = colors[index % colors.length];
      const colorRgb = hexToRgb(colorHex);
      
      // Dibujar barra
      doc.rect(xPos, yPos, barWidth - 5, barHeight)
         .fillColor(colorRgb)
         .fill()
         .strokeColor("black")
         .lineWidth(0.5)
         .stroke();
      
      // Valor sobre la barra
      doc.fontSize(8)
         .fillColor("black")
         .text(valor.toString(), xPos, yPos - 12, { width: barWidth - 5, align: "center" });
      
      // Etiqueta del mes (rotada o truncada)
      const mesLabel = mes.length > 8 ? mes.substring(0, 6) + "..." : mes;
      doc.fontSize(7)
         .fillColor("gray")
         .text(mesLabel, xPos, chartStartY + chartHeight + 5, { width: barWidth - 5, align: "center" });
    });
    
      doc.moveDown(2);
    }
    
    // Gráfico de línea de tendencia
    if (meses.length > 1 && valores.length > 1) {
      doc.fontSize(14).font("Helvetica-Bold").text("GRÁFICO DE LÍNEA DE TENDENCIA", { underline: true });
      doc.moveDown(0.5);
      
      const chartStartY = doc.y;
      const chartHeight = 120;
      const chartWidth = 450;
      const chartStartX = 60;
      const maxValue = Math.max(...valores, 1);
      
      if (maxValue > 0) {
        // Ejes
        doc.strokeColor("black")
           .lineWidth(1)
           .moveTo(chartStartX, chartStartY)
           .lineTo(chartStartX, chartStartY + chartHeight)
           .lineTo(chartStartX + chartWidth, chartStartY + chartHeight)
           .stroke();
        
        // Línea de promedio
        const promedioY = chartStartY + chartHeight - (promedio / maxValue) * chartHeight;
        doc.strokeColor("red")
           .lineWidth(1)
           .dash(5, { space: 3 })
           .moveTo(chartStartX, promedioY)
           .lineTo(chartStartX + chartWidth, promedioY)
           .stroke()
           .undash();
        
        // Etiqueta de promedio
        doc.fontSize(7)
           .fillColor("red")
           .text(`Promedio: ${promedio.toFixed(1)}`, chartStartX + chartWidth - 80, promedioY - 8);
        
        // Línea de tendencia
        const pointSpacing = chartWidth / (meses.length - 1);
        let prevX = chartStartX;
        let prevY = chartStartY + chartHeight - (valores[0] / maxValue) * chartHeight;
        
        doc.strokeColor(hexToRgb("#3b82f6"))
           .lineWidth(2);
        
        valores.forEach((valor, index) => {
          if (index > 0) {
            const x = chartStartX + (index * pointSpacing);
            const y = chartStartY + chartHeight - (valor / maxValue) * chartHeight;
            
            // Dibujar línea
            doc.moveTo(prevX, prevY)
               .lineTo(x, y)
               .stroke();
            
            // Dibujar punto
            doc.circle(x, y, 3)
               .fillColor(hexToRgb("#3b82f6"))
               .fill();
            
            prevX = x;
            prevY = y;
          } else {
            // Primer punto
            doc.circle(prevX, prevY, 3)
               .fillColor(hexToRgb("#3b82f6"))
               .fill();
          }
        });
        
        // Etiquetas del eje X
        meses.forEach((mes, index) => {
          const x = chartStartX + (index * pointSpacing);
          const mesLabel = mes.length > 6 ? mes.substring(5, 7) : mes;
          doc.fontSize(7)
             .fillColor("black")
             .text(mesLabel, x - 10, chartStartY + chartHeight + 5, { width: 20, align: "center" });
        });
        
        doc.moveDown(2);
      }
    }
    
    // Gráfico comparativo con promedio
    if (meses.length > 0 && valores.length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("COMPARACIÓN CON PROMEDIO MENSUAL", { underline: true });
      doc.moveDown(0.5);
      
      const chartStartY = doc.y;
      const chartHeight = 120;
      const chartWidth = 450;
      const chartStartX = 60;
      const maxDeviation = Math.max(...valores.map(v => Math.abs(v - promedio)), promedio);
      const barWidth = chartWidth / (meses.length * 1.5);
      
      // Ejes
      doc.strokeColor("black")
         .lineWidth(1)
         .moveTo(chartStartX, chartStartY)
         .lineTo(chartStartX, chartStartY + chartHeight)
         .lineTo(chartStartX + chartWidth, chartStartY + chartHeight)
         .stroke();
      
      // Línea de promedio
      const promedioY = chartStartY + chartHeight / 2;
      doc.strokeColor("red")
         .lineWidth(1)
         .dash(5, { space: 3 })
         .moveTo(chartStartX, promedioY)
         .lineTo(chartStartX + chartWidth, promedioY)
         .stroke()
         .undash();
      
      // Etiqueta de promedio
      doc.fontSize(7)
         .fillColor("red")
         .text(`Promedio: ${promedio.toFixed(1)}`, chartStartX + chartWidth - 80, promedioY - 8);
      
      // Barras comparativas
      meses.forEach((mes, index) => {
        const valor = valores[index];
        const diferencia = valor - promedio;
        const barHeight = Math.abs(diferencia / maxDeviation) * (chartHeight / 2);
        const xPos = chartStartX + (index * barWidth * 1.5) + 10;
        
        if (diferencia > 0) {
          // Por encima del promedio
          const yPos = promedioY - barHeight;
          doc.rect(xPos, yPos, barWidth - 5, barHeight)
             .fillColor(hexToRgb("#10b981"))
             .fill()
             .strokeColor("black")
             .lineWidth(0.5)
             .stroke();
        } else if (diferencia < 0) {
          // Por debajo del promedio
          const yPos = promedioY;
          doc.rect(xPos, yPos, barWidth - 5, barHeight)
             .fillColor(hexToRgb("#ef4444"))
             .fill()
             .strokeColor("black")
             .lineWidth(0.5)
             .stroke();
        }
        
        // Valor
        doc.fontSize(7)
           .fillColor("black")
           .text(valor.toString(), xPos, diferencia > 0 ? promedioY - barHeight - 10 : promedioY + barHeight + 2, 
                 { width: barWidth - 5, align: "center" });
      });
      
      doc.moveDown(2);
    }
    
    // Distribución por empresa (si hay datos)
    const porEmpresa = data.porEmpresa || {};
    if (Object.keys(porEmpresa).length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("DISTRIBUCIÓN POR EMPRESA (Top 5)", { underline: true });
      doc.moveDown(0.5);
      
      const empresas = Object.entries(porEmpresa).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
      const totalEmpresas: number = Object.values(porEmpresa).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;
      
      empresas.forEach(([empresa, count]: [string, any], index) => {
        const porcentaje = totalEmpresas > 0 ? ((count / totalEmpresas) * 100).toFixed(1) : "0.0";
        doc.fontSize(9).font("Helvetica");
        doc.text(`${index + 1}. ${empresa.length > 40 ? empresa.substring(0, 38) + "..." : empresa}`, 60, doc.y);
        doc.font("Helvetica-Bold").text(`${count} (${porcentaje}%)`, 450, doc.y);
        doc.font("Helvetica");
        doc.moveDown(0.4);
      });
      
      doc.moveDown(1);
    }
    
    // Distribución por día de la semana (si hay datos)
    const porDiaSemana = data.porDiaSemana || {};
    if (Object.keys(porDiaSemana).length > 0) {
      doc.fontSize(14).font("Helvetica-Bold").text("DISTRIBUCIÓN POR DÍA DE LA SEMANA", { underline: true });
      doc.moveDown(0.5);
      
      const diasOrden = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const totalDias: number = Object.values(porDiaSemana).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;
      
      diasOrden.forEach((dia) => {
        const count = porDiaSemana[dia] || 0;
        if (count > 0) {
          const porcentaje = totalDias > 0 ? ((count / totalDias) * 100).toFixed(1) : "0.0";
          doc.fontSize(9).font("Helvetica");
          doc.text(`${dia}:`, 60, doc.y);
          doc.font("Helvetica-Bold").text(`${count} (${porcentaje}%)`, 200, doc.y);
          doc.font("Helvetica");
          doc.moveDown(0.4);
        }
      });
      
      doc.moveDown(1);
    }
  }
  
    // Análisis estadístico avanzado
    doc.fontSize(14).font("Helvetica-Bold").text("ANÁLISIS ESTADÍSTICO AVANZADO", { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(10).font("Helvetica");
    
    // Usar las variables ya calculadas al inicio de la función
    const tendenciaTexto = Number(pendiente) > 0.1 ? "Creciente" : Number(pendiente) < -0.1 ? "Decreciente" : "Estable";
    
    doc.text(`• Tendencia General: ${tendenciaTexto} (${tasaCrecimiento} admisiones/mes)`);
    doc.moveDown(0.3);
    doc.text(`• Variación entre máximo y mínimo: ${maximo - minimo} admisiones (${minimo > 0 ? ((maximo - minimo) / minimo * 100).toFixed(2) : "0.00"}% de variación)`);
    doc.moveDown(0.3);
    doc.text(`• Desviación promedio: ${(valores.reduce((acc: number, val: number) => acc + Math.abs(val - promedio), 0) / valores.length).toFixed(2)} admisiones`);
    doc.moveDown(0.3);
    doc.text(`• Desviación estándar: ${desviacionEstandar.toFixed(2)} admisiones`);
    doc.moveDown(0.3);
    doc.text(`• Mediana: ${mediana.toFixed(2)} admisiones`);
    doc.moveDown(0.3);
    if (valoresOrdenados.length >= 4) {
      const q1 = valoresOrdenados[Math.floor(valoresOrdenados.length * 0.25)];
      const q3 = valoresOrdenados[Math.floor(valoresOrdenados.length * 0.75)];
      doc.text(`• Rango intercuartílico: ${(q3 - q1).toFixed(2)} admisiones (Q1: ${q1.toFixed(2)}, Q3: ${q3.toFixed(2)})`);
      doc.moveDown(0.3);
    }
    doc.text(`• Coeficiente de variación: ${coeficienteVariacion}% ${Number(coeficienteVariacion) < 15 ? "(Baja variabilidad)" : Number(coeficienteVariacion) < 35 ? "(Variabilidad moderada)" : "(Alta variabilidad)"}`);
    doc.moveDown(0.3);
    
    if (meses.length > 1 && valores[0] > 0) {
      const crecimientoTotal = ((valores[valores.length - 1] - valores[0]) / valores[0]) * 100;
      doc.text(`• Crecimiento total del período: ${crecimientoTotal.toFixed(2)}%`);
      doc.moveDown(0.3);
    }
    
    // Proyección
    if (pendiente !== 0 && meses.length >= 3) {
      const proyeccionSiguienteMes = promedio + pendiente;
      doc.text(`• Proyección siguiente mes: ${Math.max(0, Math.round(proyeccionSiguienteMes))} admisiones (basado en tendencia)`);
    }
  } catch (error: any) {
    console.error("Error en generateAdmissionsPDF:", error);
    try {
      doc.fontSize(12).text("Error al generar el reporte de admisiones.", { align: "center" });
    } catch (e) {
      // Si el doc ya está cerrado, no hacer nada
    }
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

