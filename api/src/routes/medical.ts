import express, { Request, Response } from "express";
import { prisma } from "../utils/database";
import multer from "multer";
import crypto from "crypto";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /api/medical/history - Crear historia clínica
router.post("/history", async (req: Request, res: Response) => {
  try {
    const {
      admision_id,
      motivo_consulta,
      anamnesis,
      examen_fisico,
      diagnostico,
      tratamiento,
      observaciones,
      sintomas // Campo alternativo del frontend
    } = req.body;

    // Verificar que la admisión existe
    const admision = await prisma.admision.findUnique({
      where: { id: admision_id }
    });

    if (!admision) {
      return res.status(404).json({ error: "Admisión no encontrada" });
    }

    // Verificar si ya existe una historia clínica para esta admisión
    const historiaExistente = await prisma.historiaClinica.findUnique({
      where: { admision_id }
    });

    if (historiaExistente) {
      // Si existe, actualizarla
      const historia = await prisma.historiaClinica.update({
        where: { admision_id },
        data: {
          anamnesis: anamnesis || sintomas || historiaExistente.anamnesis,
          examen_fisico: examen_fisico || historiaExistente.examen_fisico,
          diagnostico: diagnostico || historiaExistente.diagnostico,
          tratamiento: tratamiento || historiaExistente.tratamiento,
          updated_by: (req as any).user?.id || null
        }
      });
      return res.json(historia);
    }

    // Crear nueva historia clínica
    // Si viene sintomas del frontend, usarlo como anamnesis
    const anamnesisData = anamnesis || sintomas || null;
    
    // Si viene observaciones, agregarlas como nota de evolución
    let notasEvolucion: string[] = [];
    if (observaciones) {
      notasEvolucion = [observaciones];
    }
    
    const historia = await prisma.historiaClinica.create({
      data: {
        admision_id,
        anamnesis: anamnesisData,
        examen_fisico: examen_fisico || null,
        diagnostico: diagnostico || null,
        tratamiento: tratamiento || null,
        notas_evolucion: notasEvolucion
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

    res.status(201).json(historia);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/medical/history - Listar historias clínicas
router.get("/history", async (req: Request, res: Response) => {
  try {
    const { paciente_id, page = "1", limit = "10" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (paciente_id) {
      where.admision = {
        paciente_id: paciente_id as string
      };
    }

    const [historias, total] = await Promise.all([
      prisma.historiaClinica.findMany({
        where,
        skip,
        take: parseInt(limit as string),
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
      prisma.historiaClinica.count({ where })
    ]);

    res.json(historias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/medical/clinical-history/:id - Obtener historia clínica
router.get("/clinical-history/:id", async (req: Request, res: Response) => {
  try {
    const historia = await prisma.historiaClinica.findUnique({
      where: { admision_id: req.params.id },
      include: {
        admision: {
          include: {
            paciente: {
              include: {
                usuario: true,
                empresa: true
              }
            }
          }
        },
        notas: {
          include: {
            usuario: true
          },
          orderBy: { fecha: "desc" }
        },
        adjuntos: {
          orderBy: { created_at: "desc" }
        }
      }
    });

    if (!historia) {
      return res.status(404).json({ error: "Historia clínica no encontrada" });
    }

    res.json(historia);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/medical/clinical-history/:id - Actualizar historia clínica
router.put("/clinical-history/:id", async (req: Request, res: Response) => {
  try {
    const {
      anamnesis,
      examen_fisico,
      diagnostico,
      tratamiento,
      observaciones
    } = req.body;

    const updateData: any = {
      updated_by: req.user?.id
    };
    if (anamnesis !== undefined) updateData.anamnesis = anamnesis;
    if (examen_fisico !== undefined) updateData.examen_fisico = examen_fisico;
    if (diagnostico !== undefined) updateData.diagnostico = diagnostico;
    if (tratamiento !== undefined) updateData.tratamiento = tratamiento;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const historia = await prisma.historiaClinica.update({
      where: { admision_id: req.params.id },
      data: updateData
    });

    res.json(historia);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/medical/clinical-history/:id/progress-notes - Agregar nota de evolución
router.post("/clinical-history/:id/progress-notes", async (req: Request, res: Response) => {
  try {
    const { tipo, contenido } = req.body;

    const historia = await prisma.historiaClinica.findUnique({
      where: { admision_id: req.params.id }
    });

    if (!historia) {
      return res.status(404).json({ error: "Historia clínica no encontrada" });
    }

    const nota = await prisma.notasEvolucion.create({
      data: {
        historia_clinica_id: historia.id,
        tipo: tipo || "evolucion",
        contenido,
        usuario_id: req.user?.id
      },
      include: {
        usuario: true
      }
    });

    res.status(201).json(nota);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/medical/clinical-history/:id/attachments - Subir adjunto
router.post("/clinical-history/:id/attachments", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { tipo } = req.body;
    const file = req.file;

    if (!file || !tipo) {
      return res.status(400).json({ error: "Archivo y tipo son requeridos" });
    }

    const historia = await prisma.historiaClinica.findUnique({
      where: { admision_id: req.params.id }
    });

    if (!historia) {
      return res.status(404).json({ error: "Historia clínica no encontrada" });
    }

    const fileBuffer = require("fs").readFileSync(file.path);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const adjunto = await prisma.adjuntosHistoriaClinica.create({
      data: {
        historia_clinica_id: historia.id,
        tipo,
        nombre_archivo: file.originalname,
        mime_type: file.mimetype,
        tamano: file.size,
        contenido: fileBuffer,
        hash_sha256: hash,
        subido_por: req.user?.id
      }
    });

    require("fs").unlinkSync(file.path);

    res.status(201).json(adjunto);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/medical/exams - Crear examen especializado
router.post("/exams", async (req: Request, res: Response) => {
  try {
    const { admision_id, tipo, resultado, archivo_resultado } = req.body;

    const examen = await prisma.examenesEspecializados.create({
      data: {
        admision_id,
        tipo,
        resultado,
        archivo_resultado: archivo_resultado ? Buffer.from(archivo_resultado, "base64") : null,
        realizado_por: req.user?.id
      }
    });

    res.status(201).json(examen);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/medical/exams/:type/:id - Actualizar examen
router.put("/exams/:type/:id", async (req: Request, res: Response) => {
  try {
    const { resultado, archivo_resultado } = req.body;

    const updateData: any = {};
    if (resultado !== undefined) updateData.resultado = resultado;
    if (archivo_resultado !== undefined) {
      updateData.archivo_resultado = Buffer.from(archivo_resultado, "base64");
    }

    const examen = await prisma.examenesEspecializados.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(examen);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/medical/vitals/record - Registrar signos vitales
router.post("/vitals/record", async (req: Request, res: Response) => {
  try {
    const { admision_id, signos_vitales } = req.body;

    const historia = await prisma.historiaClinica.findUnique({
      where: { admision_id }
    });

    if (!historia) {
      return res.status(404).json({ error: "Historia clínica no encontrada" });
    }

    // Obtener signos vitales actuales
    const signosActuales = (historia.examen_fisico as any)?.signos_vitales || [];
    signosActuales.push({
      ...signos_vitales,
      fecha: new Date(),
      registrado_por: req.user?.id
    });

    const historiaActualizada = await prisma.historiaClinica.update({
      where: { admision_id },
      data: {
        examen_fisico: {
          ...(historia.examen_fisico as any || {}),
          signos_vitales: signosActuales
        }
      }
    });

    res.json(historiaActualizada);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

