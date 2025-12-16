import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { prisma } from "./utils/database";
import crypto from "crypto";
import { sendEmail } from "./services/mailer";
import { sendSms } from "./services/sms";
import { validateDocument, submitInvoiceSunat } from "./services/sunat";
import { createPaymentIntent } from "./services/payments";
import { enrollBiometric, verifyBiometric } from "./services/biometric";

// Importar rutas
import admissionsRouter from "./routes/admissions";
import medicalRouter from "./routes/medical";
import laboratoryRouter from "./routes/laboratory";
import conceptoAptitudRouter from "./routes/concepto-aptitud";
import facturacionRouter from "./routes/facturacion";
import inventarioRouter from "./routes/inventario";
import biometricRouter from "./routes/biometric";
import analyticsRouter from "./routes/analytics";
import patientsRouter from "./routes/patients";
import usersRouter from "./routes/users";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static("uploads"));

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function createToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autorizado" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; name: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "No autorizado" });
    const userRole = req.user.role.toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());
    if (!allowedRoles.includes(userRole)) return res.status(403).json({ error: "Acceso denegado" });
    next();
  };
}

async function logAction(userId: string | undefined, action: string, module: string, details?: any) {
  try {
    await (prisma as any).logAuditoria.create({ 
      data: { 
        usuario_id: userId || undefined, 
        accion: action, 
        modulo: module, 
        detalles: details ? JSON.parse(JSON.stringify(details)) : null 
      } 
    });
  } catch (error) {
    // Ignorar errores de log
    console.error("Error en log de auditoría:", error);
  }
}

const upload = multer({ dest: "uploads/", limits: { fileSize: 10 * 1024 * 1024 } });

// Autenticación - Login con nuevos modelos
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuario en el modelo Usuario
    const user = await (prisma as any).usuario.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    if (!user.activo) {
      return res.status(403).json({ error: "Usuario inactivo" });
    }
    
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });
    
    const token = createToken({ 
      id: user.id, 
      email: user.email, 
      role: user.rol, 
      name: `${user.nombres} ${user.apellidos}` 
    });
    
    res.json({ token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await (prisma as any).usuario.findUnique({ 
      where: { id: req.user?.id ?? "" },
      select: {
        id: true,
        dni: true,
        email: true,
        nombres: true,
        apellidos: true,
        telefono: true,
        rol: true,
        especialidad: true,
        colegiatura: true,
        activo: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profile - Actualizar perfil del usuario actual
app.put("/api/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      email,
      nombres,
      apellidos,
      telefono,
      especialidad,
      colegiatura
    } = req.body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (nombres !== undefined) updateData.nombres = nombres;
    if (apellidos !== undefined) updateData.apellidos = apellidos;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (especialidad !== undefined) updateData.especialidad = especialidad;
    if (colegiatura !== undefined) updateData.colegiatura = colegiatura;

    const usuario = await (prisma as any).usuario.update({
      where: { id: req.user?.id },
      data: updateData,
      select: {
        id: true,
        dni: true,
        email: true,
        nombres: true,
        apellidos: true,
        telefono: true,
        rol: true,
        especialidad: true,
        colegiatura: true,
        activo: true
      }
    });

    res.json({ user: usuario });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profile/password - Cambiar contraseña del usuario actual
app.put("/api/profile/password", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Contraseña actual y nueva son requeridas" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }

    const usuario = await (prisma as any).usuario.findUnique({
      where: { id: req.user?.id }
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await (prisma as any).usuario.update({
      where: { id: req.user?.id },
      data: { password_hash: passwordHash }
    });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta pública para visualizar documentos (sin autenticación)
app.get("/api/admissions/:id/documents/:docId", async (req: Request, res: Response) => {
  try {
    const { id, docId } = req.params;
    const { view } = req.query;

    // Verificar que la admisión existe (seguridad básica)
    const admision = await (prisma as any).admision.findUnique({
      where: { id }
    });

    if (!admision) {
      return res.status(404).json({ error: "Admisión no encontrada" });
    }

    const documento = await (prisma as any).documentoAdmision.findFirst({
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

    const content: Buffer = documento.contenido as any;
    const mimeType = documento.mime_type || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    
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

// Usar rutas modulares (con autenticación)
app.use("/api/admissions", authMiddleware, admissionsRouter);
app.use("/api/medical", authMiddleware, medicalRouter);
app.use("/api/laboratory", authMiddleware, laboratoryRouter);
app.use("/api/concepto-aptitud", authMiddleware, conceptoAptitudRouter);
app.use("/api/facturacion", authMiddleware, facturacionRouter);
app.use("/api/inventario", authMiddleware, inventarioRouter);
app.use("/api/biometric", authMiddleware, biometricRouter);
app.use("/api/analytics", authMiddleware, analyticsRouter);
app.use("/api/patients", authMiddleware, patientsRouter);
app.use("/api/users", authMiddleware, usersRouter);

// Endpoints legacy mantenidos para compatibilidad
app.post("/api/patients", authMiddleware, requireRole(["ADMISSIONS", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const p = await prisma.patient.create({ data });
    const n8nUrl = process.env.N8N_URL;
    const serviceToken = process.env.SERVICE_TOKEN || "";
    if (n8nUrl) {
      try {
        await (globalThis as any).fetch(`${n8nUrl.replace(/\/$/, "")}/webhook/admission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: p.id,
            dni: p.dni,
            admissionId: p.id,
            token: serviceToken
          })
        });
      } catch {}
    }
    res.json(p);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/patients", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { dni } = req.query as { dni?: string };
    if (dni) {
      const p = await prisma.patient.findUnique({ where: { dni } });
      return res.json(p ? [p] : []);
    }
    const list = await prisma.patient.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/appointments", authMiddleware, async (req: Request, res: Response) => {
  const { patientId, date, status } = req.body;
  const a = await prisma.appointment.create({ data: { patientId, date: new Date(date), status } });
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (patient?.email) {
    try { await sendEmail(patient.email, "Confirmación de Cita", `Su cita fue programada para ${new Date(date).toLocaleString('es-PE')}`); } catch {}
  }
  if (patient?.phone) {
    try { await sendSms(patient.phone, "Su cita ocupacional fue programada"); } catch {}
  }
  res.json(a);
});

app.get("/api/appointments", authMiddleware, async (req: Request, res: Response) => {
  const { patientId } = req.query as { patientId?: string };
  const where = patientId ? { patientId } : undefined;
  const list = await prisma.appointment.findMany({ where });
  res.json(list);
});

app.post("/api/medical-records", authMiddleware, requireRole(["DOCTOR", "ADMIN"]), async (req: Request, res: Response) => {
  const { patientId, diagnosis, aptitude, notes } = req.body;
  const r = await prisma.medicalRecord.create({ data: { patientId, diagnosis, aptitude, notes } });
  const n8nUrl = process.env.N8N_URL;
  const serviceToken = process.env.SERVICE_TOKEN || "";
  if (n8nUrl && aptitude) {
    try {
      await (globalThis as any).fetch(`${n8nUrl.replace(/\/$/, "")}/webhook/aptitude-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          recordId: r.id,
          aptitude,
          notes,
          token: serviceToken
        })
      });
    } catch {}
  }
  res.json(r);
});

app.get("/api/medical-records", authMiddleware, async (req: Request, res: Response) => {
  const list = await prisma.medicalRecord.findMany();
  res.json(list);
});

app.post("/api/lab-results", authMiddleware, requireRole(["LAB", "ADMIN"]), upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { patientId, testName, sampleId, result } = req.body;
    
    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: patientId }
    });
    
    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    
    // Si hay archivo, leerlo y guardarlo como Bytes
    let archivoResultado: Buffer | null = null;
    if (req.file) {
      try {
        const fs = require("fs");
        if (fs.existsSync(req.file.path)) {
          archivoResultado = fs.readFileSync(req.file.path);
          fs.unlinkSync(req.file.path); // Eliminar archivo temporal
        }
      } catch (fileError: any) {
        console.error("Error leyendo archivo:", fileError);
        // Continuar sin archivo si hay error
      }
    }
    
    // Buscar la admisión más reciente del paciente para asociar el examen
    const admision = await prisma.admision.findFirst({
      where: { paciente_id: patientId },
      orderBy: { created_at: "desc" }
    });
    
    if (!admision) {
      return res.status(400).json({ error: "El paciente no tiene admisiones. Por favor, cree una admisión primero." });
    }
    
    // Crear examen de laboratorio usando el modelo ExamenLaboratorio
    // Preparar parámetros como objeto JSON válido
    const parametrosData = {
      sampleId: sampleId || "N/A",
      result: result || ""
    };
    
    const examen = await prisma.examenLaboratorio.create({
      data: {
        admision_id: admision.id,
        tipo_examen: testName || "Informe PDF",
        parametros: parametrosData as any, // Prisma maneja JSON automáticamente
        resultado_final: result || null,
        archivo_resultado: archivoResultado,
        estado: "completado",
        fecha_muestra: new Date(), // Fecha de muestra cuando se sube el documento
        fecha_resultado: new Date(),
        tecnico_id: (req as any).user?.id || null
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
    
    res.status(201).json(examen);
  } catch (error: any) {
    console.error("Error creando resultado de laboratorio:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      error: error.message || "Error al crear resultado de laboratorio",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

app.get("/api/lab-results", authMiddleware, async (req: Request, res: Response) => {
  const list = await prisma.labResult.findMany();
  res.json(list);
});

app.get("/api/invoices", authMiddleware, async (req: Request, res: Response) => {
  const rows = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
  res.json(rows);
});

app.post("/api/invoices", authMiddleware, async (req: Request, res: Response) => {
  const { patientId, number, amount, type, series } = req.body;
  const igv = Math.round(amount * 0.18 * 100) / 100;
  const correlativo = await prisma.invoice.count({ where: { series } }) + 1;
  const inv = await prisma.invoice.create({ data: { patientId, number, amount, igv, status: "new", type, series, correlativo } });
  const intent = await createPaymentIntent(Number((amount * 100).toFixed(0)), "PEN", `Factura ${number}`, { patientId });
  res.json({ ...inv, payment: intent });
});

app.post("/api/invoices/:id/sendSunat", authMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id;
  const accepted = Math.random() > 0.2;
  const status = accepted ? "accepted" : "rejected";
  const sunatCdrUrl = accepted ? `https://sunat.example/cdr/${id}` : null;
  const xmlSunat = `<xml id="${id}">...</xml>`;
  const cdrSunat = accepted ? `<cdr id="${id}">OK</cdr>` : `<cdr id="${id}">RECHAZADO</cdr>`;
  const inv0 = await prisma.invoice.update({ where: { id }, data: { status, sunatCdrUrl: sunatCdrUrl || undefined, xmlSunat, cdrSunat } });
  const subRes = await submitInvoiceSunat({ id, xml: xmlSunat });
  const inv = await prisma.invoice.update({ where: { id }, data: { status: subRes.status || status, sunatCdrUrl: subRes.cdrUrl || inv0.sunatCdrUrl || undefined } });
  res.json(inv);
});

// Endpoints adicionales
app.get("/api/admissions/exam-types", authMiddleware, async (req: Request, res: Response) => {
  try {
    const examTypes = await (prisma as any).tiposExamen.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" }
    });
    res.json(examTypes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/reports/dashboard", authMiddleware, async (req: Request, res: Response) => {
  try {
    const [patients, appointments, records, labResults, invoices] = await Promise.all([
      prisma.patient.count().catch(() => 0),
      prisma.appointment.count().catch(() => 0),
      prisma.medicalRecord.count().catch(() => 0),
      prisma.labResult.count().catch(() => 0),
      prisma.invoice.count().catch(() => 0)
    ]);
    res.json({ patients, appointments, records, labResults, invoices });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const rows = await prisma.setting.findMany();
  const data = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json(data);
});

app.put("/api/settings", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { key, value } = req.body as { key: string; value: string };
  const existing = await prisma.setting.findUnique({ where: { key } });
  const s = existing
    ? await prisma.setting.update({ where: { key }, data: { value } })
    : await prisma.setting.create({ data: { key, value } });
  await logAction(req.user?.id, "update_setting", "admin", { key });
  res.json(s);
});

app.get("/api/inventory/items", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const items = await prisma.inventoryItem.findMany({ orderBy: { updatedAt: "desc" } });
  res.json(items);
});

app.post("/api/inventory/items", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { name, sku, unit, stock, minStock } = req.body;
  const item = await prisma.inventoryItem.create({ data: { name, sku, unit, stock, minStock } });
  res.json(item);
});

app.post("/api/inventory/movements", authMiddleware, requireRole(["ADMIN", "LAB"]), async (req: Request, res: Response) => {
  const { itemId, type, quantity, note } = req.body;
  const mv = await prisma.inventoryMovement.create({ data: { itemId, type, quantity, note } });
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (item) {
    const delta = type === "in" ? quantity : -quantity;
    await prisma.inventoryItem.update({ where: { id: itemId }, data: { stock: item.stock + delta } });
  }
  await logAction(req.user?.id, "inventory_movement", "inventory", { itemId, type, quantity });
  res.json(mv);
});

// GET /api/admin/settings - Obtener configuración
app.get("/api/admin/settings", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    // Por ahora retornamos un objeto vacío, puedes implementar una tabla de settings si lo necesitas
    res.json({});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/settings - Actualizar configuración
app.put("/api/admin/settings", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    // Por ahora solo retornamos éxito, puedes implementar guardado en BD si lo necesitas
    res.json({ success: true, message: "Configuración guardada" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/audit-logs", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  res.json(logs);
});

app.get("/api/templates", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const rows = await prisma.template.findMany({ orderBy: { createdAt: "desc" } });
  res.json(rows);
});

app.post("/api/templates", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { name, type, html, variables } = req.body;
  const t = await prisma.template.create({ data: { name, type, html, variables } });
  res.json(t);
});

app.get("/api/integrations", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const rows = await prisma.integration.findMany({ orderBy: { createdAt: "desc" } });
  res.json(rows);
});

app.post("/api/integrations", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const { name, type, config, active } = req.body;
  const row = await prisma.integration.create({ data: { name, type, config: JSON.stringify(config || {}), active: !!active } });
  res.json(row);
});

app.get("/api/inventory/alerts", authMiddleware, requireRole(["ADMIN", "LAB"]), async (req: Request, res: Response) => {
  const items = await prisma.inventoryItem.findMany({ where: { stock: { lt: 1 } } });
  res.json(items);
});

app.post("/api/logistics/events", authMiddleware, requireRole(["ADMISSIONS", "ADMIN", "DOCTOR", "LAB"]), async (req: Request, res: Response) => {
  const { patientId, appointmentId, status, message } = req.body;
  const ev = await prisma.logisticEvent.create({ data: { patientId, appointmentId, status, message } });
  res.json(ev);
});

app.get("/api/logistics/events", authMiddleware, async (req: Request, res: Response) => {
  const { patientId, appointmentId } = req.query as { patientId?: string; appointmentId?: string };
  const where: any = {};
  if (patientId) where.patientId = patientId;
  if (appointmentId) where.appointmentId = appointmentId;
  const rows = await prisma.logisticEvent.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(rows);
});

app.get("/api/reports/exams-monthly", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = await prisma.appointment.count({ where: { date: { gte: start, lt: end } } });
    months.push({ label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`, count });
  }
  res.json(months);
});

app.post("/api/sunat/validate", authMiddleware, requireRole(["ADMIN", "ADMISSIONS", "BILLING"]), async (req: Request, res: Response) => {
  const { type, value } = req.body as { type: string; value: string };
  const data = await validateDocument(type as any, value);
  res.json(data);
});

app.post("/api/biometric/enroll", authMiddleware, async (req: Request, res: Response) => {
  const { patientId } = req.body;
  const r = await enrollBiometric(patientId);
  res.json(r);
});

app.post("/api/biometric/verify", authMiddleware, async (req: Request, res: Response) => {
  const { patientId } = req.body;
  const r = await verifyBiometric(patientId);
  res.json(r);
});

const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 4001;
const server = app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('Servidor HTTP cerrado');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('Servidor HTTP cerrado');
  });
});
app.get("/api/clinic/config", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const rows = await prisma.clinicConfig.findMany();
  res.json(rows[0] || null);
});

app.put("/api/clinic/config", authMiddleware, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  const data = req.body;
  const rows = await prisma.clinicConfig.findMany();
  const cfg = rows[0]
    ? await prisma.clinicConfig.update({ where: { id: rows[0].id }, data })
    : await prisma.clinicConfig.create({ data });
  res.json(cfg);
});

app.post("/api/clinic/logo", authMiddleware, requireRole(["ADMIN"]), upload.single("logo"), async (req: Request, res: Response) => {
  const url = req.file ? `/uploads/${req.file.filename}` : undefined;
  const rows = await prisma.clinicConfig.findMany();
  const cfg = rows[0]
    ? await prisma.clinicConfig.update({ where: { id: rows[0].id }, data: { logoUrl: url } })
    : await prisma.clinicConfig.create({ data: { name: "Clinica", ruc: "", logoUrl: url } });
  res.json(cfg);
});

app.get("/api/companies", authMiddleware, requireRole(["ADMIN", "ADMISSIONS"]), async (req: Request, res: Response) => {
  const rows = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  res.json(rows);
});

app.post("/api/companies", authMiddleware, requireRole(["ADMIN", "ADMISSIONS"]), async (req: Request, res: Response) => {
  const { name, ruc, department, contactName, contactEmail, phone, address } = req.body;
  const row = await prisma.company.create({ data: { name, ruc, department, contactName, contactEmail, phone, address } });
  res.json(row);
});

// Endpoints legacy mantenidos para compatibilidad
app.post("/api/concepts", authMiddleware, requireRole(["DOCTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { patientId, appointmentId, resultado, restricciones, recomendaciones, fechaVigencia } = req.body;
    const base = `${patientId}|${appointmentId || ""}|${resultado}|${restricciones || ""}|${recomendaciones || ""}|${fechaVigencia || ""}`;
    const hash = crypto.createHash("sha256").update(base).digest("hex");
    const concept = await prisma.aptitudeConcept.create({ data: { patientId, appointmentId, resultado, restricciones, recomendaciones, fechaVigencia: fechaVigencia ? new Date(fechaVigencia) : null, hash, createdBy: req.user?.id } });
    const n8nUrl = process.env.N8N_URL;
    const serviceToken = process.env.SERVICE_TOKEN || "";
    if (n8nUrl) {
      try {
        await (globalThis as any).fetch(`${n8nUrl.replace(/\/$/, "")}/webhook/concept-finalized`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept_id: concept.id, token: serviceToken })
        });
      } catch {}
    }
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (patient?.email) {
      try { await sendEmail(patient.email, "Concepto de Aptitud", `Resultado: ${resultado}`); } catch {}
    }
    if (patient?.phone) {
      try { await sendSms(patient.phone, "Su concepto de aptitud está disponible"); } catch {}
    }
    res.json(concept);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
