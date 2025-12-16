import express, { Request, Response } from "express";
import { prisma } from "../utils/database";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Middleware de autenticación (se importará desde index.ts)
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string; name: string };
    }
  }
}

// GET /api/admissions - Listar admisiones
router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", estado, paciente_id, fecha_desde, fecha_hasta } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const where: any = {};
    if (estado) where.estado = estado;
    if (paciente_id) where.paciente_id = paciente_id;
    if (fecha_desde || fecha_hasta) {
      where.fecha_programada = {};
      if (fecha_desde) where.fecha_programada.gte = new Date(fecha_desde as string);
      if (fecha_hasta) where.fecha_programada.lte = new Date(fecha_hasta as string);
    }

    const [admisiones, total] = await Promise.all([
      prisma.admision.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          paciente: {
            include: {
              usuario: true,
              empresa: true
            }
          },
          medico: true,
          empresa: true,
          concepto_aptitud: true,
          factura: true
        },
        orderBy: { fecha_programada: "desc" }
      }),
      prisma.admision.count({ where })
    ]);

    res.json({
      data: admisiones,
      meta: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/stats - Estadísticas de admisiones
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const startOfWeek = new Date(hoy);
    startOfWeek.setDate(hoy.getDate() - hoy.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const endOfMonth = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    
    const startOfYear = new Date(hoy.getFullYear(), 0, 1);

    const [
      hoyCount,
      estaSemana,
      esteMes,
      esteAno,
      programadas,
      confirmadas,
      enProceso,
      completadas,
      canceladas,
      total,
      porTipoExamen,
      porEmpresa,
      proximasCitas,
      admisionesRecientes
    ] = await Promise.all([
      // Hoy
      prisma.admision.count({
        where: {
          fecha_programada: { gte: hoy, lt: manana }
        }
      }),
      // Esta semana
      prisma.admision.count({
        where: {
          fecha_programada: { gte: startOfWeek }
        }
      }),
      // Este mes
      prisma.admision.count({
        where: {
          fecha_programada: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      // Este año
      prisma.admision.count({
        where: {
          fecha_programada: { gte: startOfYear }
        }
      }),
      // Por estado
      prisma.admision.count({ where: { estado: "programado" } }),
      prisma.admision.count({ where: { estado: "confirmado" } }),
      prisma.admision.count({ where: { estado: "en_proceso" } }),
      prisma.admision.count({ where: { estado: "completado" } }),
      prisma.admision.count({ where: { estado: "cancelado" } }),
      // Total
      prisma.admision.count(),
      // Por tipo de examen
      prisma.admision.groupBy({
        by: ["tipo_examen"],
        _count: { tipo_examen: true },
        orderBy: { _count: { tipo_examen: "desc" } },
        take: 5
      }),
      // Por empresa (top 5)
      prisma.admision.groupBy({
        by: ["empresa_id"],
        _count: { empresa_id: true },
        orderBy: { _count: { empresa_id: "desc" } },
        take: 5
      }),
      // Próximas citas (próximos 7 días)
      prisma.admision.findMany({
        where: {
          fecha_programada: { gte: hoy, lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000) },
          estado: { in: ["programado", "confirmado"] }
        },
        include: {
          paciente: {
            include: {
              usuario: {
                select: { nombres: true, apellidos: true, dni: true }
              }
            }
          },
          empresa: {
            select: { razon_social: true }
          }
        },
        orderBy: { fecha_programada: "asc" },
        take: 10
      }),
      // Admisiones recientes (últimas 10)
      prisma.admision.findMany({
        include: {
          paciente: {
            include: {
              usuario: {
                select: { nombres: true, apellidos: true, dni: true }
              }
            }
          },
          empresa: {
            select: { razon_social: true }
          }
        },
        orderBy: { created_at: "desc" },
        take: 10
      })
    ]);

    // Obtener nombres de empresas
    const empresasConNombres = await Promise.all(
      porEmpresa.map(async (item) => {
        if (!item.empresa_id) return { empresa: "Sin empresa", cantidad: item._count.empresa_id };
        const empresa = await prisma.empresa.findUnique({
          where: { id: item.empresa_id },
          select: { razon_social: true }
        });
        return {
          empresa: empresa?.razon_social || "Sin empresa",
          cantidad: item._count.empresa_id
        };
      })
    );

    // Admisiones mensuales (últimos 6 meses)
    const admisionesMensuales: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
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

    res.json({
      // Básicas
      hoy: hoyCount,
      estaSemana,
      esteMes,
      esteAno,
      programadas,
      confirmadas,
      enProceso,
      completadas,
      canceladas,
      total,
      // Distribuciones
      porTipoExamen: porTipoExamen.map(item => ({
        tipo: item.tipo_examen,
        cantidad: item._count.tipo_examen
      })),
      porEmpresa: empresasConNombres,
      // Series temporales
      admisionesMensuales,
      // Listas
      proximasCitas: proximasCitas.map(adm => ({
        id: adm.id,
        paciente: adm.paciente?.usuario ? `${adm.paciente.usuario.nombres} ${adm.paciente.usuario.apellidos}` : "N/A",
        dni: adm.paciente?.usuario?.dni || "N/A",
        empresa: adm.empresa?.razon_social || "N/A",
        tipoExamen: adm.tipo_examen,
        fecha: adm.fecha_programada,
        estado: adm.estado
      })),
      admisionesRecientes: admisionesRecientes.map(adm => ({
        id: adm.id,
        paciente: adm.paciente?.usuario ? `${adm.paciente.usuario.nombres} ${adm.paciente.usuario.apellidos}` : "N/A",
        dni: adm.paciente?.usuario?.dni || "N/A",
        empresa: adm.empresa?.razon_social || "N/A",
        tipoExamen: adm.tipo_examen,
        fecha: adm.fecha_programada,
        estado: adm.estado,
        createdAt: adm.created_at
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/exam-types - Listar tipos de examen
router.get("/exam-types", async (req: Request, res: Response) => {
  try {
    const { activo } = req.query;
    const where: any = {};
    if (activo !== undefined) {
      where.activo = activo === "true";
    } else {
      where.activo = true; // Por defecto solo activos
    }
    
    const examTypes = await prisma.tiposExamen.findMany({
      where,
      orderBy: { nombre: "asc" }
    });
    res.json(examTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admissions/exam-types - Crear tipo de examen
router.post("/exam-types", async (req: Request, res: Response) => {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      duracion_minutos,
      requiere_laboratorio,
      requiere_radiografia,
      precio_base,
      activo
    } = req.body;

    const examType = await prisma.tiposExamen.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        duracion_minutos: duracion_minutos || 30,
        requiere_laboratorio: requiere_laboratorio || false,
        requiere_radiografia: requiere_radiografia || false,
        precio_base: precio_base ? parseFloat(precio_base) : null,
        activo: activo !== undefined ? activo : true
      }
    });

    res.status(201).json(examType);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admissions/exam-types/:id - Actualizar tipo de examen
router.put("/exam-types/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      nombre,
      descripcion,
      duracion_minutos,
      requiere_laboratorio,
      requiere_radiografia,
      precio_base,
      activo
    } = req.body;

    const updateData: any = {};
    if (codigo !== undefined) updateData.codigo = codigo;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (duracion_minutos !== undefined) updateData.duracion_minutos = parseInt(duracion_minutos);
    if (requiere_laboratorio !== undefined) updateData.requiere_laboratorio = requiere_laboratorio;
    if (requiere_radiografia !== undefined) updateData.requiere_radiografia = requiere_radiografia;
    if (precio_base !== undefined) updateData.precio_base = precio_base ? parseFloat(precio_base) : null;
    if (activo !== undefined) updateData.activo = activo;

    const examType = await prisma.tiposExamen.update({
      where: { id },
      data: updateData
    });

    res.json(examType);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admissions/exam-types/:id - Eliminar tipo de examen
router.delete("/exam-types/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // En lugar de eliminar, desactivar
    await prisma.tiposExamen.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ message: "Tipo de examen desactivado correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/companies - Listar empresas
router.get("/companies", async (req: Request, res: Response) => {
  try {
    const { activo } = req.query;
    const where: any = {};
    
    // Si se especifica el filtro activo, aplicarlo
    if (activo !== undefined) {
      where.activo = activo === "true";
    }
    
    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { razon_social: "asc" }
    });
    res.json(empresas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/shifts - Listar configuraciones de turnos
router.get("/shifts", async (req: Request, res: Response) => {
  try {
    const { medico_id, dia_semana, activo } = req.query;
    const where: any = {};
    
    if (medico_id) where.medico_id = medico_id;
    if (dia_semana !== undefined) where.dia_semana = parseInt(dia_semana as string);
    if (activo !== undefined) where.activo = activo === "true";
    
    const shifts = await prisma.configTurnos.findMany({
      where,
      include: {
        medico: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            especialidad: true
          }
        }
      },
      orderBy: [
        { dia_semana: "asc" },
        { hora_inicio: "asc" }
      ]
    });
    
    res.json(shifts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admissions/shifts - Crear configuración de turno
router.post("/shifts", async (req: Request, res: Response) => {
  try {
    const {
      medico_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      duracion_cita,
      max_citas_dia,
      activo
    } = req.body;

    // Validar que hora_inicio y hora_fin estén en formato correcto
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(hora_inicio) || !timeRegex.test(hora_fin)) {
      return res.status(400).json({ error: "Formato de hora inválido. Use HH:MM:SS" });
    }

    // Validar que hora_inicio sea menor que hora_fin
    const start = new Date(`2000-01-01T${hora_inicio}`);
    const end = new Date(`2000-01-01T${hora_fin}`);
    if (start >= end) {
      return res.status(400).json({ error: "La hora de inicio debe ser menor que la hora de fin" });
    }

    const shift = await prisma.configTurnos.create({
      data: {
        medico_id: medico_id || null,
        dia_semana: parseInt(dia_semana),
        hora_inicio,
        hora_fin,
        duracion_cita: duracion_cita || 30,
        max_citas_dia: max_citas_dia || 20,
        activo: activo !== undefined ? activo : true
      },
      include: {
        medico: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            especialidad: true
          }
        }
      }
    });

    res.status(201).json(shift);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admissions/shifts/:id - Actualizar configuración de turno
router.put("/shifts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      medico_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      duracion_cita,
      max_citas_dia,
      activo
    } = req.body;

    const updateData: any = {};
    if (medico_id !== undefined) updateData.medico_id = medico_id || null;
    if (dia_semana !== undefined) updateData.dia_semana = parseInt(dia_semana);
    if (hora_inicio !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(hora_inicio)) {
        return res.status(400).json({ error: "Formato de hora inválido. Use HH:MM:SS" });
      }
      updateData.hora_inicio = hora_inicio;
    }
    if (hora_fin !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(hora_fin)) {
        return res.status(400).json({ error: "Formato de hora inválido. Use HH:MM:SS" });
      }
      updateData.hora_fin = hora_fin;
    }
    if (duracion_cita !== undefined) updateData.duracion_cita = parseInt(duracion_cita);
    if (max_citas_dia !== undefined) updateData.max_citas_dia = parseInt(max_citas_dia);
    if (activo !== undefined) updateData.activo = activo;

    // Validar que hora_inicio sea menor que hora_fin si ambas están presentes
    if (updateData.hora_inicio && updateData.hora_fin) {
      const start = new Date(`2000-01-01T${updateData.hora_inicio}`);
      const end = new Date(`2000-01-01T${updateData.hora_fin}`);
      if (start >= end) {
        return res.status(400).json({ error: "La hora de inicio debe ser menor que la hora de fin" });
      }
    }

    const shift = await prisma.configTurnos.update({
      where: { id },
      data: updateData,
      include: {
        medico: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            especialidad: true
          }
        }
      }
    });

    res.json(shift);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admissions/shifts/:id - Eliminar configuración de turno
router.delete("/shifts/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.configTurnos.delete({
      where: { id }
    });

    res.json({ message: "Turno eliminado correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/:id - Obtener admisión por ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const admision = await prisma.admision.findUnique({
      where: { id: req.params.id },
      include: {
        paciente: {
          include: {
            usuario: true,
            empresa: true
          }
        },
        medico: true,
        empresa: true,
        historia_clinica: true,
        examenes_laboratorio: true,
        concepto_aptitud: true,
        factura: true,
        documentos: true,
        seguimiento_logistico: {
          orderBy: { created_at: "desc" }
        }
      }
    });

    if (!admision) {
      return res.status(404).json({ error: "Admisión no encontrada" });
    }

    res.json(admision);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admissions - Crear nueva admisión
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      paciente_id,
      empresa_id,
      tipo_examen,
      fecha_programada,
      hora,
      medico_id,
      motivo_consulta,
      observaciones_admision,
      tipo_comprobante,
      metodo_pago,
      documentos
    } = req.body;

    // Validar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: paciente_id },
      include: { 
        usuario: true,
        empresa: true
      }
    });

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    // Combinar fecha y hora
    const fechaCompleta = new Date(`${fecha_programada}T${hora}`);

    // Crear admisión
    const admision = await prisma.admision.create({
      data: {
        paciente_id,
        empresa_id: empresa_id || paciente.empresa_id,
        tipo_examen,
        estado: "programado",
        fecha_programada: fechaCompleta,
        medico_id,
        motivo_consulta,
        observaciones_admision,
        created_by: req.user?.id
      },
      include: {
        paciente: {
          include: { 
            usuario: true,
            empresa: true
          }
        },
        empresa: {
          select: {
            id: true,
            ruc: true,
            razon_social: true,
            nombre_comercial: true
          }
        },
        medico: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true
          }
        }
      }
    });

    // Crear factura preliminar si hay precio
    const tipoExamen = await prisma.tiposExamen.findFirst({
      where: { codigo: tipo_examen, activo: true }
    });

    let facturaData: any = null;
    if (tipoExamen?.precio_base) {
      const subtotal = Number(tipoExamen.precio_base);
      const igv = subtotal * 0.18;
      const total = subtotal + igv;

      facturaData = await prisma.factura.create({
        data: {
          admision_id: admision.id,
          tipo_comprobante: tipo_comprobante || "03",
          estado: "pendiente",
          subtotal,
          igv,
          total,
          fecha_emision: new Date(),
          metodo_pago
        }
      });
    }

    // Guardar documentos si existen
    if (documentos && Object.keys(documentos).length > 0) {
      const documentPromises = Object.entries(documentos).map(async ([tipo, doc]: [string, any]) => {
        if (doc.archivo) {
          const hash = crypto.createHash("sha256").update(doc.archivo).digest("hex");
          const buffer = Buffer.from(doc.archivo, "base64");
          
          return prisma.documentoAdmision.create({
            data: {
              admision_id: admision.id,
              tipo,
              nombre_archivo: doc.nombre || `documento_${tipo}`,
              mime_type: doc.type || "application/octet-stream",
              tamano: doc.size || buffer.length,
              contenido: buffer,
              hash_sha256: hash,
              subido_por: req.user?.id
            }
          });
        }
      });

      await Promise.all(documentPromises.filter(Boolean));
    }

    // Disparar webhook n8n con todos los datos necesarios
    console.log("🔍 [WEBHOOK DEBUG] Verificando variable de entorno N8N_ADMISSION_WEBHOOK...");
    const admissionWebhook = process.env.N8N_ADMISSION_WEBHOOK;
    console.log("🔍 [WEBHOOK DEBUG] Variable N8N_ADMISSION_WEBHOOK:", admissionWebhook ? "✅ Configurada" : "❌ NO configurada");
    
    if (admissionWebhook) {
      console.log("🚀 [WEBHOOK] Iniciando envío al webhook:", admissionWebhook);
      try {
        // Construir nombre completo del paciente
        const pacienteNombreCompleto = paciente.usuario 
          ? `${paciente.usuario.nombres || ""} ${paciente.usuario.apellidos || ""}`.trim()
          : null;

        const webhookPayload = {
          // Datos de la admisión
          admission_id: admision.id,
          tipo_examen: admision.tipo_examen,
          fecha_programada: fechaCompleta.toISOString(),
          estado: admision.estado,
          motivo_consulta: admision.motivo_consulta || null,
          observaciones_admision: admision.observaciones_admision || null,
          
          // Datos del paciente (campos individuales)
          paciente_id: paciente.id,
          paciente_dni: paciente.usuario?.dni || null,
          paciente_nombres: paciente.usuario?.nombres || null,
          paciente_apellidos: paciente.usuario?.apellidos || null,
          paciente_email: paciente.usuario?.email || null,
          paciente_telefono: paciente.usuario?.telefono || null,
          
          // Datos del paciente (campos combinados para compatibilidad)
          paciente_nombre: pacienteNombreCompleto,
          dni: paciente.usuario?.dni || null,
          nombres: paciente.usuario?.nombres || null,
          apellidos: paciente.usuario?.apellidos || null,
          email: paciente.usuario?.email || null,
          telefono: paciente.usuario?.telefono || null,
          
          // Datos de la empresa
          empresa_id: admision.empresa_id || paciente.empresa_id || null,
          empresa_razon_social: admision.empresa?.razon_social || (paciente as any).empresa?.razon_social || null,
          empresa_ruc: admision.empresa?.ruc || (paciente as any).empresa?.ruc || null,
          empresa_nombre_comercial: admision.empresa?.nombre_comercial || (paciente as any).empresa?.nombre_comercial || null,
          
          // Datos del médico
          medico_id: admision.medico_id || null,
          medico_nombre: admision.medico ? `${admision.medico.nombres} ${admision.medico.apellidos}` : null,
          medico_email: admision.medico?.email || null,
          
          // Datos de facturación (si existe)
          factura_id: facturaData?.id || null,
          subtotal: facturaData?.subtotal ? Number(facturaData.subtotal) : null,
          igv: facturaData?.igv ? Number(facturaData.igv) : null,
          total: facturaData?.total ? Number(facturaData.total) : null,
          tipo_comprobante: facturaData?.tipo_comprobante || tipo_comprobante || "03",
          metodo_pago: facturaData?.metodo_pago || metodo_pago || null,
          
          // Metadata
          created_by: req.user?.id || null,
          created_at: admision.created_at.toISOString()
        };

        console.log("📦 [WEBHOOK] Payload completo:", JSON.stringify(webhookPayload, null, 2));
        console.log("🌐 [WEBHOOK] Enviando POST a:", admissionWebhook);

        const fetchStartTime = Date.now();
        const response = await (globalThis as any).fetch(admissionWebhook, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(webhookPayload)
        });

        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`⏱️ [WEBHOOK] Respuesta recibida en ${fetchDuration}ms. Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ [WEBHOOK] Error en respuesta:", response.status, errorText);
        } else {
          const responseData = await response.json().catch(() => null);
          console.log("✅ [WEBHOOK] Webhook respondió exitosamente:", responseData);
        }
      } catch (n8nError: any) {
        console.error("❌ [WEBHOOK] Error disparando workflow n8n:");
        console.error("   Mensaje:", n8nError.message);
        console.error("   Stack:", n8nError.stack);
        if (n8nError.cause) {
          console.error("   Causa:", n8nError.cause);
        }
        // No lanzamos el error para que la admisión se cree aunque falle el webhook
      }
    } else {
      console.warn("⚠️ [WEBHOOK] N8N_ADMISSION_WEBHOOK no está configurado en las variables de entorno");
      console.warn("⚠️ [WEBHOOK] Verifica que la variable esté en el archivo .env");
    }

    // Log de auditoría
    await prisma.logAuditoria.create({
      data: {
        usuario_id: req.user?.id,
        accion: "CREATE_ADMISSION",
        modulo: "admissions",
        detalles: {
          admission_id: admision.id,
          paciente_id,
          tipo_examen
        }
      }
    });

    res.status(201).json({
      success: true,
      id: admision.id,
      message: "Admisión creada exitosamente"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admissions/:id - Actualizar admisión
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const {
      tipo_examen,
      fecha_programada,
      hora,
      estado,
      medico_id,
      motivo_consulta,
      observaciones_admision
    } = req.body;

    // Obtener la admisión actual para comparar el estado
    const admisionActual = await prisma.admision.findUnique({
      where: { id: req.params.id },
      select: { estado: true }
    });

    if (!admisionActual) {
      return res.status(404).json({ error: "Admisión no encontrada" });
    }

    const updateData: any = {};
    if (tipo_examen) updateData.tipo_examen = tipo_examen;
    if (fecha_programada && hora) {
      updateData.fecha_programada = new Date(`${fecha_programada}T${hora}`);
    }
    if (estado) updateData.estado = estado;
    if (medico_id) updateData.medico_id = medico_id;
    if (motivo_consulta !== undefined) updateData.motivo_consulta = motivo_consulta;
    if (observaciones_admision !== undefined) updateData.observaciones_admision = observaciones_admision;

    const admision = await prisma.admision.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        paciente: {
          include: { usuario: true }
        }
      }
    });

    // Si el estado cambió, crear registro de seguimiento
    if (estado && estado !== admisionActual.estado) {
      try {
        await prisma.seguimientoLogistico.create({
          data: {
            admision_id: req.params.id,
            estado: estado,
            mensaje: `Estado cambiado a: ${estado}`,
            usuario_id: req.user?.id
          }
        });
      } catch (seguimientoError) {
        console.error("Error creando seguimiento:", seguimientoError);
        // No fallar la actualización si el seguimiento falla
      }
    }

    res.json(admision);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/calendar/events - Eventos del calendario
router.get("/calendar/events", async (req: Request, res: Response) => {
  try {
    const { start, end, medico_id } = req.query;
    
    const where: any = {};
    if (start && end) {
      where.fecha_programada = {
        gte: new Date(start as string),
        lte: new Date(end as string)
      };
    }
    if (medico_id) where.medico_id = medico_id;

    const admisiones = await prisma.admision.findMany({
      where,
      include: {
        paciente: {
          include: {
            usuario: true
          }
        },
        medico: true
      },
      orderBy: { fecha_programada: "asc" }
    });

    const events = admisiones.map(adm => ({
      id: adm.id,
      title: `${adm.paciente.usuario?.nombres} ${adm.paciente.usuario?.apellidos}`,
      start: adm.fecha_programada.toISOString(),
      end: new Date(new Date(adm.fecha_programada).getTime() + 30 * 60000).toISOString(),
      backgroundColor: adm.estado === "completado" ? "#10b981" : adm.estado === "cancelado" ? "#ef4444" : "#3b82f6",
      borderColor: adm.estado === "completado" ? "#10b981" : adm.estado === "cancelado" ? "#ef4444" : "#3b82f6",
      extendedProps: {
        tipo_examen: adm.tipo_examen,
        estado: adm.estado,
        medico: adm.medico ? `${adm.medico.nombres} ${adm.medico.apellidos}` : null
      }
    }));

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admissions/calendar/slots - Horarios disponibles
router.get("/calendar/slots", async (req: Request, res: Response) => {
  try {
    const { date, examType, doctorId } = req.query;
    
    if (!date || !examType) {
      return res.status(400).json({ error: "Se requieren fecha y tipo de examen" });
    }

    const examTypeData = await prisma.tiposExamen.findFirst({
      where: { codigo: examType as string, activo: true }
    });

    if (!examTypeData) {
      return res.status(400).json({ error: "Tipo de examen no válido" });
    }

    // Parsear la fecha correctamente para evitar problemas de zona horaria
    // Si la fecha viene como "YYYY-MM-DD", parsearla manualmente para evitar problemas de UTC
    let dateString = date as string;
    let examDate: Date;
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parsear manualmente para usar hora local, no UTC
      const [year, month, day] = dateString.split('-').map(Number);
      examDate = new Date(year, month - 1, day, 0, 0, 0, 0); // month es 0-indexed
    } else {
      examDate = new Date(dateString);
    }
    
    const dayOfWeek = examDate.getDay();
    
    // Debug: Log para verificar (puedes remover esto después)
    console.log(`Fecha recibida: ${date}, Día calculado: ${dayOfWeek} (0=Domingo, 1=Lunes, 2=Martes, etc.), Fecha parseada: ${examDate.toISOString()}`);

    // Verificar si es día no laborable
    const nonWorkingDay = await prisma.diasNoLaborables.findFirst({
      where: { fecha: examDate }
    });

    if (nonWorkingDay) {
      return res.json([]);
    }

    // Obtener configuración de turnos
    // Buscar turnos que coincidan con el día de la semana
    // Si hay doctorId, buscar turnos del doctor O turnos generales
    // Si no hay doctorId, buscar TODOS los turnos del día (generales y específicos)
    const where: any = {
      dia_semana: dayOfWeek,
      activo: true
    };
    
    if (doctorId) {
      // Si hay doctor seleccionado, buscar turnos de ese doctor o turnos generales
      where.OR = [
        { medico_id: doctorId },
        { medico_id: null }
      ];
    }
    // Si no hay doctorId, no agregamos filtro de médico, así busca todos los turnos del día

    const shiftConfigs = await prisma.configTurnos.findMany({
      where,
      include: { medico: true }
    });

    if (shiftConfigs.length === 0) {
      return res.json([]);
    }

    // Generar slots disponibles
    const availableSlots: string[] = [];
    const appointmentDuration = examTypeData.duracion_minutos;

    for (const config of shiftConfigs) {
      const startTime = new Date(`${date}T${config.hora_inicio}`);
      const endTime = new Date(`${date}T${config.hora_fin}`);

      // Obtener citas existentes con su tipo de examen para calcular duración real
      // Si el turno es general (sin médico), buscar todas las citas del día
      // Si el turno es de un médico específico, buscar solo las citas de ese médico
      const appointmentWhere: any = {
          fecha_programada: {
            gte: new Date(`${date}T00:00:00`),
            lt: new Date(`${date}T23:59:59`)
          },
          estado: {
            in: ["programado", "confirmado", "en_proceso"]
          }
      };
      
      // Solo filtrar por médico si el turno es de un médico específico
      if (config.medico_id) {
        appointmentWhere.medico_id = config.medico_id;
      }
      // Si no hay médico_id en el turno, no filtramos por médico (turno general)

      const existingAppointments = await prisma.admision.findMany({
        where: appointmentWhere,
        select: { 
          fecha_programada: true,
          tipo_examen: true
        }
      });

      // Obtener duraciones de todos los tipos de examen únicos
      const uniqueExamTypes = [...new Set(existingAppointments.map(apt => apt.tipo_examen))];
      const examTypesData = await prisma.tiposExamen.findMany({
        where: {
          codigo: { in: uniqueExamTypes },
          activo: true
        },
        select: {
          codigo: true,
          duracion_minutos: true
        }
      });

      // Crear un mapa de código de examen -> duración
      const examDurationMap = new Map<string, number>();
      examTypesData.forEach(exam => {
        examDurationMap.set(exam.codigo, exam.duracion_minutos);
      });

      // Crear rangos de tiempo ocupados con su duración real
      const bookedRanges: Array<{ start: Date; end: Date }> = [];
      for (const apt of existingAppointments) {
        const aptStart = new Date(apt.fecha_programada);
        // Obtener duración del tipo de examen de la cita existente
        const aptDuration = examDurationMap.get(apt.tipo_examen) || 30; // Default 30 min si no se encuentra
        const aptEnd = new Date(aptStart.getTime() + aptDuration * 60000);
        bookedRanges.push({ start: aptStart, end: aptEnd });
      }

      // Generar slots cada 15 minutos
      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime);
        slotEnd.setMinutes(slotEnd.getMinutes() + appointmentDuration);

        if (slotEnd <= endTime) {
          const slotTime = currentTime.toTimeString().substring(0, 5);
          
          // Verificar si el slot se solapa con alguna cita existente
          const hasConflict = bookedRanges.some(bookedRange => {
            // Un slot tiene conflicto si:
            // 1. El slot empieza durante una cita existente
            // 2. El slot termina durante una cita existente
            // 3. El slot contiene completamente una cita existente
            // 4. Una cita existente contiene completamente el slot
            return (
              (currentTime >= bookedRange.start && currentTime < bookedRange.end) ||
              (slotEnd > bookedRange.start && slotEnd <= bookedRange.end) ||
              (currentTime <= bookedRange.start && slotEnd >= bookedRange.end) ||
              (currentTime >= bookedRange.start && slotEnd <= bookedRange.end)
            );
          });

          if (!hasConflict && !availableSlots.includes(slotTime)) {
            availableSlots.push(slotTime);
          }
        }

        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }
    }

    availableSlots.sort((a, b) => {
      const timeA = new Date(`2000-01-01T${a}`).getTime();
      const timeB = new Date(`2000-01-01T${b}`).getTime();
      return timeA - timeB;
    });

    res.json(availableSlots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admissions/:id/documents - Subir documentos
router.post("/:id/documents", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { tipo } = req.body;
    const file = req.file;

    console.log("Subiendo documento:", { tipo, file: file ? file.originalname : "no file", admision_id: req.params.id });

    if (!file) {
      return res.status(400).json({ error: "Archivo es requerido" });
    }

    if (!tipo) {
      return res.status(400).json({ error: "Tipo de documento es requerido" });
    }

    // Verificar que la admisión existe
    const admision = await prisma.admision.findUnique({
      where: { id: req.params.id }
    });

    if (!admision) {
      // Eliminar archivo temporal si existe
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch {}
      }
      return res.status(404).json({ error: "Admisión no encontrada" });
    }

    // Leer el archivo
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(file.path);
    } catch (readError: any) {
      console.error("Error leyendo archivo:", readError);
      return res.status(500).json({ error: "Error al leer el archivo: " + readError.message });
    }

    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Crear el documento
    const documento = await prisma.documentoAdmision.create({
      data: {
        admision_id: req.params.id,
        tipo,
        nombre_archivo: file.originalname || `documento_${tipo}_${Date.now()}`,
        mime_type: file.mimetype || "application/octet-stream",
        tamano: file.size ? parseInt(file.size.toString()) : fileBuffer.length,
        contenido: fileBuffer,
        hash_sha256: hash,
        subido_por: req.user?.id
      }
    });

    // Eliminar archivo temporal
    try {
      fs.unlinkSync(file.path);
    } catch (unlinkError) {
      console.error("Error eliminando archivo temporal:", unlinkError);
      // No es crítico, continuamos
    }

    res.status(201).json({
      id: documento.id,
      tipo: documento.tipo,
      nombre_archivo: documento.nombre_archivo,
      created_at: documento.created_at
    });
  } catch (error: any) {
    console.error("Error completo al subir documento:", error);
    
    // Limpiar archivo temporal si existe
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    
    res.status(500).json({ 
      error: error.message || "Error al subir documento",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

// GET /api/admissions/:id/documents/:docId - Ver/Descargar documento
// Esta ruta permite visualización sin autenticación estricta (solo verifica que el documento exista)
router.get("/:id/documents/:docId", async (req: Request, res: Response) => {
  try {
    const { id, docId } = req.params;
    const { view } = req.query; // Si view=true, mostrar en navegador; si no, descargar

    // Verificar que la admisión existe (seguridad básica)
    const admision = await prisma.admision.findUnique({
      where: { id }
    });

    if (!admision) {
      return res.status(404).json({ error: "Admisión no encontrada" });
    }

    const documento = await prisma.documentoAdmision.findFirst({
      where: {
        id: docId,
        admision_id: id
      }
    });

    if (!documento) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    if (!documento.contenido) {
      return res.status(404).json({ error: "Contenido del documento no disponible" });
    }

    // El contenido es de tipo Bytes (Buffer) en Prisma
    // TypeScript puede no reconocer el tipo correctamente, así que hacemos un cast explícito
    const content: Buffer = documento.contenido as any;

    const mimeType = documento.mime_type || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    
    // Si view=true, mostrar en navegador; si no, descargar
    if (view === "true") {
      res.setHeader("Content-Disposition", `inline; filename="${documento.nombre_archivo}"`);
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${documento.nombre_archivo}"`);
    }
    
    res.send(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admissions/companies - Crear empresa
router.post("/companies", async (req: Request, res: Response) => {
  try {
    const {
      ruc,
      razon_social,
      nombre_comercial,
      direccion,
      telefono,
      contacto_nombre,
      contacto_email
    } = req.body;

    const empresa = await prisma.empresa.create({
      data: {
        ruc,
        razon_social,
        nombre_comercial,
        direccion,
        telefono,
        contacto_nombre,
        contacto_email,
        activo: true
      }
    });

    res.status(201).json(empresa);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admissions/companies/:id - Actualizar empresa
router.put("/companies/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ruc,
      razon_social,
      nombre_comercial,
      direccion,
      telefono,
      contacto_nombre,
      contacto_email,
      activo
    } = req.body;

    const updateData: any = {};
    if (ruc !== undefined) updateData.ruc = ruc;
    if (razon_social !== undefined) updateData.razon_social = razon_social;
    if (nombre_comercial !== undefined) updateData.nombre_comercial = nombre_comercial;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (contacto_nombre !== undefined) updateData.contacto_nombre = contacto_nombre;
    if (contacto_email !== undefined) updateData.contacto_email = contacto_email;
    if (activo !== undefined) updateData.activo = activo;

    const empresa = await prisma.empresa.update({
      where: { id },
      data: updateData
    });

    res.json(empresa);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admissions/companies/:id - Eliminar empresa
router.delete("/companies/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar si hay admisiones asociadas
    const admisiones = await prisma.admision.count({
      where: { empresa_id: id }
    });

    if (admisiones > 0) {
      // En lugar de eliminar, desactivar
      await prisma.empresa.update({
        where: { id },
        data: { activo: false }
      });
      return res.json({ message: "Empresa desactivada (tiene admisiones asociadas)" });
    }

    await prisma.empresa.delete({
      where: { id }
    });

    res.json({ message: "Empresa eliminada correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

