import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: "No autorizado" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ error: "Token inválido" });
    }
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "No autorizado" });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: "Acceso denegado" });
        next();
    };
}
const upload = multer({ dest: "uploads/" });
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(404).json({ error: "Usuario no encontrado" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok)
        return res.status(401).json({ error: "Credenciales inválidas" });
    const token = createToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ token });
});
app.get("/api/me", authMiddleware, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ user });
});
app.post("/api/users", authMiddleware, requireRole(["ADMIN"]), async (req, res) => {
    const { email, password, name, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const u = await prisma.user.create({ data: { email, password: hash, name, role } });
    res.json(u);
});
app.get("/api/users", authMiddleware, requireRole(["ADMIN"]), async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});
app.post("/api/patients", authMiddleware, requireRole(["ADMISSIONS", "ADMIN"]), async (req, res) => {
    const data = req.body;
    const p = await prisma.patient.create({ data });
    res.json(p);
});
app.get("/api/patients", authMiddleware, async (req, res) => {
    const list = await prisma.patient.findMany();
    res.json(list);
});
app.post("/api/appointments", authMiddleware, async (req, res) => {
    const { patientId, date, status } = req.body;
    const a = await prisma.appointment.create({ data: { patientId, date: new Date(date), status } });
    res.json(a);
});
app.get("/api/appointments", authMiddleware, async (req, res) => {
    const list = await prisma.appointment.findMany();
    res.json(list);
});
app.post("/api/medical-records", authMiddleware, requireRole(["DOCTOR", "ADMIN"]), async (req, res) => {
    const { patientId, diagnosis, aptitude, notes } = req.body;
    const r = await prisma.medicalRecord.create({ data: { patientId, diagnosis, aptitude, notes } });
    res.json(r);
});
app.get("/api/medical-records", authMiddleware, async (req, res) => {
    const list = await prisma.medicalRecord.findMany();
    res.json(list);
});
app.post("/api/lab-results", authMiddleware, requireRole(["LAB", "ADMIN"]), upload.single("file"), async (req, res) => {
    const { patientId, testName, sampleId, result } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const l = await prisma.labResult.create({ data: { patientId, testName, sampleId, result, fileUrl } });
    res.json(l);
});
app.get("/api/lab-results", authMiddleware, async (req, res) => {
    const list = await prisma.labResult.findMany();
    res.json(list);
});
app.post("/api/invoices", authMiddleware, async (req, res) => {
    const { patientId, number, amount } = req.body;
    const igv = Math.round(amount * 0.18 * 100) / 100;
    const inv = await prisma.invoice.create({ data: { patientId, number, amount, igv, status: "new" } });
    res.json(inv);
});
app.post("/api/invoices/:id/sendSunat", authMiddleware, async (req, res) => {
    const id = req.params.id;
    const accepted = Math.random() > 0.2;
    const status = accepted ? "accepted" : "rejected";
    const sunatCdrUrl = accepted ? `https://sunat.example/cdr/${id}` : null;
    const inv = await prisma.invoice.update({ where: { id }, data: { status, sunatCdrUrl: sunatCdrUrl || undefined } });
    res.json(inv);
});
app.get("/api/reports/dashboard", authMiddleware, async (req, res) => {
    const [patients, appointments, records, labResults, invoices] = await Promise.all([
        prisma.patient.count(),
        prisma.appointment.count(),
        prisma.medicalRecord.count(),
        prisma.labResult.count(),
        prisma.invoice.count()
    ]);
    res.json({ patients, appointments, records, labResults, invoices });
});
app.post("/api/biometric/enroll", authMiddleware, async (req, res) => {
    const { patientId } = req.body;
    res.json({ patientId, status: "enrolled" });
});
app.post("/api/biometric/verify", authMiddleware, async (req, res) => {
    const { patientId } = req.body;
    res.json({ patientId, match: true });
});
const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 4001;
app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
});
