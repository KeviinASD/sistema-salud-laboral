import express from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import multer from "multer";
const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: "uploads/" });
// GET /api/admissions - Listar admisiones
router.get("/", async (req, res) => {
    try {
        const { page = "1", limit = "10", estado, paciente_id, fecha_desde, fecha_hasta } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (estado)
            where.estado = estado;
        if (paciente_id)
            where.paciente_id = paciente_id;
        if (fecha_desde || fecha_hasta) {
            where.fecha_programada = {};
            if (fecha_desde)
                where.fecha_programada.gte = new Date(fecha_desde);
            if (fecha_hasta)
                where.fecha_programada.lte = new Date(fecha_hasta);
        }
        const [admisiones, total] = await Promise.all([
            prisma.admision.findMany({
                where,
                skip,
                take: parseInt(limit),
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
// GET /api/admissions/stats - Estadísticas de admisiones
router.get("/stats", async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        const [hoyCount, programadas, completadas, canceladas] = await Promise.all([
            prisma.admision.count({
                where: {
                    fecha_programada: { gte: hoy, lt: manana }
                }
            }),
            prisma.admision.count({ where: { estado: "programado" } }),
            prisma.admision.count({ where: { estado: "completado" } }),
            prisma.admision.count({ where: { estado: "cancelado" } })
        ]);
        res.json({ hoy: hoyCount, programadas, completadas, canceladas });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/admissions/exam-types - Listar tipos de examen
router.get("/exam-types", async (req, res) => {
    try {
        const examTypes = await prisma.tiposExamen.findMany({
            where: { activo: true },
            orderBy: { nombre: "asc" }
        });
        res.json(examTypes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/admissions/companies - Listar empresas
router.get("/companies", async (req, res) => {
    try {
        const { activo } = req.query;
        const where = {};
        // Si se especifica el filtro activo, aplicarlo
        if (activo !== undefined) {
            where.activo = activo === "true";
        }
        const empresas = await prisma.empresa.findMany({
            where,
            orderBy: { razon_social: "asc" }
        });
        res.json(empresas);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/admissions/:id - Obtener admisión por ID
router.get("/:id", async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/admissions - Crear nueva admisión
router.post("/", async (req, res) => {
    try {
        const { paciente_id, empresa_id, tipo_examen, fecha_programada, hora, medico_id, motivo_consulta, observaciones_admision, tipo_comprobante, metodo_pago, documentos } = req.body;
        // Validar que el paciente existe
        const paciente = await prisma.paciente.findUnique({
            where: { id: paciente_id },
            include: { usuario: true }
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
                    include: { usuario: true }
                }
            }
        });
        // Crear factura preliminar si hay precio
        const tipoExamen = await prisma.tiposExamen.findFirst({
            where: { codigo: tipo_examen, activo: true }
        });
        if (tipoExamen?.precio_base) {
            const subtotal = Number(tipoExamen.precio_base);
            const igv = subtotal * 0.18;
            const total = subtotal + igv;
            await prisma.factura.create({
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
            const documentPromises = Object.entries(documentos).map(async ([tipo, doc]) => {
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
        // Disparar webhook n8n (URL directa)
        const admissionWebhook = process.env.N8N_ADMISSION_WEBHOOK;
        if (admissionWebhook) {
            try {
                await globalThis.fetch(admissionWebhook, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        admission_id: admision.id,
                        paciente_email: paciente.usuario?.email,
                        paciente_nombre: `${paciente.usuario?.nombres} ${paciente.usuario?.apellidos}`,
                        fecha_programada: fechaCompleta.toISOString(),
                        tipo_examen
                    })
                });
            }
            catch (n8nError) {
                console.error("Error disparando workflow n8n:", n8nError);
            }
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/admissions/:id - Actualizar admisión
router.put("/:id", async (req, res) => {
    try {
        const { tipo_examen, fecha_programada, hora, estado, medico_id, motivo_consulta, observaciones_admision } = req.body;
        const updateData = {};
        if (tipo_examen)
            updateData.tipo_examen = tipo_examen;
        if (fecha_programada && hora) {
            updateData.fecha_programada = new Date(`${fecha_programada}T${hora}`);
        }
        if (estado)
            updateData.estado = estado;
        if (medico_id)
            updateData.medico_id = medico_id;
        if (motivo_consulta !== undefined)
            updateData.motivo_consulta = motivo_consulta;
        if (observaciones_admision !== undefined)
            updateData.observaciones_admision = observaciones_admision;
        const admision = await prisma.admision.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                paciente: {
                    include: { usuario: true }
                }
            }
        });
        res.json(admision);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/admissions/calendar/events - Eventos del calendario
router.get("/calendar/events", async (req, res) => {
    try {
        const { start, end, medico_id } = req.query;
        const where = {};
        if (start && end) {
            where.fecha_programada = {
                gte: new Date(start),
                lte: new Date(end)
            };
        }
        if (medico_id)
            where.medico_id = medico_id;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/admissions/calendar/slots - Horarios disponibles
router.get("/calendar/slots", async (req, res) => {
    try {
        const { date, examType, doctorId } = req.query;
        if (!date || !examType) {
            return res.status(400).json({ error: "Se requieren fecha y tipo de examen" });
        }
        const examTypeData = await prisma.tiposExamen.findFirst({
            where: { codigo: examType, activo: true }
        });
        if (!examTypeData) {
            return res.status(400).json({ error: "Tipo de examen no válido" });
        }
        const examDate = new Date(date);
        const dayOfWeek = examDate.getDay();
        // Verificar si es día no laborable
        const nonWorkingDay = await prisma.diasNoLaborables.findFirst({
            where: { fecha: examDate }
        });
        if (nonWorkingDay) {
            return res.json([]);
        }
        // Obtener configuración de turnos
        const where = {
            dia_semana: dayOfWeek,
            activo: true
        };
        if (doctorId)
            where.medico_id = doctorId;
        const shiftConfigs = await prisma.configTurnos.findMany({
            where,
            include: { medico: true }
        });
        if (shiftConfigs.length === 0) {
            return res.json([]);
        }
        // Generar slots disponibles
        const availableSlots = [];
        const appointmentDuration = examTypeData.duracion_minutos;
        for (const config of shiftConfigs) {
            const startTime = new Date(`${date}T${config.hora_inicio}`);
            const endTime = new Date(`${date}T${config.hora_fin}`);
            // Obtener citas existentes
            const existingAppointments = await prisma.admision.findMany({
                where: {
                    medico_id: config.medico_id,
                    fecha_programada: {
                        gte: new Date(`${date}T00:00:00`),
                        lt: new Date(`${date}T23:59:59`)
                    },
                    estado: {
                        in: ["programado", "confirmado", "en_proceso"]
                    }
                },
                select: { fecha_programada: true }
            });
            const bookedSlots = existingAppointments.map(apt => new Date(apt.fecha_programada).toTimeString().substring(0, 5));
            // Generar slots cada 15 minutos
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
                const slotEnd = new Date(currentTime);
                slotEnd.setMinutes(slotEnd.getMinutes() + appointmentDuration);
                if (slotEnd <= endTime) {
                    const slotTime = currentTime.toTimeString().substring(0, 5);
                    const hasConflict = bookedSlots.some(bookedSlot => {
                        const bookedTime = new Date(`${date}T${bookedSlot}`);
                        return ((bookedTime >= currentTime && bookedTime < slotEnd) ||
                            (currentTime >= bookedTime && currentTime < new Date(bookedTime.getTime() + appointmentDuration * 60000)));
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/admissions/:id/documents - Subir documentos
router.post("/:id/documents", upload.single("file"), async (req, res) => {
    try {
        const { tipo } = req.body;
        const file = req.file;
        if (!file || !tipo) {
            return res.status(400).json({ error: "Archivo y tipo son requeridos" });
        }
        const fileBuffer = require("fs").readFileSync(file.path);
        const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        const documento = await prisma.documentoAdmision.create({
            data: {
                admision_id: req.params.id,
                tipo,
                nombre_archivo: file.originalname,
                mime_type: file.mimetype,
                tamano: file.size,
                contenido: fileBuffer,
                hash_sha256: hash,
                subido_por: req.user?.id
            }
        });
        // Eliminar archivo temporal
        require("fs").unlinkSync(file.path);
        res.status(201).json(documento);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/admissions/companies - Crear empresa
router.post("/companies", async (req, res) => {
    try {
        const { ruc, razon_social, nombre_comercial, direccion, telefono, contacto_nombre, contacto_email } = req.body;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/admissions/companies/:id - Actualizar empresa
router.put("/companies/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { ruc, razon_social, nombre_comercial, direccion, telefono, contacto_nombre, contacto_email, activo } = req.body;
        const updateData = {};
        if (ruc !== undefined)
            updateData.ruc = ruc;
        if (razon_social !== undefined)
            updateData.razon_social = razon_social;
        if (nombre_comercial !== undefined)
            updateData.nombre_comercial = nombre_comercial;
        if (direccion !== undefined)
            updateData.direccion = direccion;
        if (telefono !== undefined)
            updateData.telefono = telefono;
        if (contacto_nombre !== undefined)
            updateData.contacto_nombre = contacto_nombre;
        if (contacto_email !== undefined)
            updateData.contacto_email = contacto_email;
        if (activo !== undefined)
            updateData.activo = activo;
        const empresa = await prisma.empresa.update({
            where: { id },
            data: updateData
        });
        res.json(empresa);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/admissions/companies/:id - Eliminar empresa
router.delete("/companies/:id", async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
