import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: "uploads/" });

// GET /api/laboratory/samples - Listar muestras
router.get("/samples", async (req: Request, res: Response) => {
  try {
    const { estado, fecha_desde, fecha_hasta } = req.query;
    
    const where: any = {};
    if (estado) where.estado = estado;
    if (fecha_desde || fecha_hasta) {
      where.fecha_muestra = {};
      if (fecha_desde) where.fecha_muestra.gte = new Date(fecha_desde as string);
      if (fecha_hasta) where.fecha_muestra.lte = new Date(fecha_hasta as string);
    }

    const muestras = await prisma.examenLaboratorio.findMany({
      where,
      include: {
        admision: {
          include: {
            paciente: {
              include: { usuario: true }
            }
          }
        },
        tecnico: true
      },
      orderBy: { created_at: "desc" }
    });

    res.json(muestras);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/laboratory/samples - Recepción de muestras
router.post("/samples", async (req: Request, res: Response) => {
  try {
    const { admision_id, tipo_examen, parametros, fecha_muestra } = req.body;

    const muestra = await prisma.examenLaboratorio.create({
      data: {
        admision_id,
        tipo_examen,
        parametros,
        estado: "pendiente",
        fecha_muestra: fecha_muestra ? new Date(fecha_muestra) : new Date(),
        tecnico_id: req.user?.id
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

    res.status(201).json(muestra);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/laboratory/tests/:id/results - Registrar resultados
router.post("/tests/:id/results", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { resultado_final, parametros } = req.body;
    const file = req.file;

    const updateData: any = {
      estado: "completado",
      fecha_resultado: new Date()
    };

    if (resultado_final) updateData.resultado_final = resultado_final;
    if (parametros) updateData.parametros = parametros;
    if (file) {
      const fileBuffer = require("fs").readFileSync(file.path);
      updateData.archivo_resultado = fileBuffer;
      require("fs").unlinkSync(file.path);
    }

    const examen = await prisma.examenLaboratorio.update({
      where: { id: req.params.id },
      data: updateData,
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

    // Notificar al módulo de historia clínica
    const n8nUrl = process.env.N8N_URL;
    if (n8nUrl) {
      try {
        await (globalThis as any).fetch(`${n8nUrl}/webhook/lab-result-ready`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examen_id: examen.id,
            admision_id: examen.admision_id,
            tipo_examen: examen.tipo_examen
          })
        });
      } catch (error) {
        console.error("Error notificando resultado:", error);
      }
    }

    res.json(examen);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/laboratory/equipment/interface - Integración con equipos
router.post("/equipment/interface", async (req: Request, res: Response) => {
  try {
    const { equipo_id, datos } = req.body;

    // Procesar datos del equipo según el tipo
    // Esto es un ejemplo genérico, se debe adaptar según el equipo específico
    
    const resultado = {
      equipo_id,
      datos_procesados: datos,
      fecha_procesamiento: new Date()
    };

    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/laboratory/exams/:id/document - Descargar documento de examen
router.get("/exams/:id/document", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const examen = await prisma.examenLaboratorio.findUnique({
      where: { id }
    });

    if (!examen) {
      return res.status(404).json({ error: "Examen no encontrado" });
    }

    if (!examen.archivo_resultado) {
      return res.status(404).json({ error: "Documento no disponible" });
    }

    const content: Buffer = examen.archivo_resultado as any;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="examen-${examen.tipo_examen}-${examen.id}.pdf"`
    );
    
    res.send(content);
  } catch (error: any) {
    console.error("Error descargando documento de examen:", error);
    res.status(500).json({ error: error.message || "Error al descargar documento" });
  }
});

export default router;

