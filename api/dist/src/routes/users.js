import express from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const router = express.Router();
const prisma = new PrismaClient();
// GET /api/users - Listar usuarios
router.get("/", async (req, res) => {
    try {
        const { page = "1", limit = "20", rol, activo, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (rol)
            where.rol = rol;
        if (activo !== undefined)
            where.activo = activo === "true";
        if (search) {
            where.OR = [
                { dni: { contains: search } },
                { nombres: { contains: search, mode: "insensitive" } },
                { apellidos: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
            ];
        }
        const [usuarios, total] = await Promise.all([
            prisma.usuario.findMany({
                where,
                skip,
                take: parseInt(limit),
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
                    activo: true,
                    fecha_creacion: true
                },
                orderBy: { fecha_creacion: "desc" }
            }),
            prisma.usuario.count({ where })
        ]);
        res.json({
            data: usuarios,
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
// POST /api/users - Crear usuario
router.post("/", async (req, res) => {
    try {
        const { dni, email, password, nombres, apellidos, telefono, rol, especialidad, colegiatura } = req.body;
        // Validar DNI
        if (!dni || dni.length !== 8) {
            return res.status(400).json({ error: "DNI debe tener 8 dígitos" });
        }
        // Verificar si ya existe
        const existe = await prisma.usuario.findUnique({
            where: { dni }
        });
        if (existe) {
            return res.status(409).json({ error: "Usuario ya existe" });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const usuario = await prisma.usuario.create({
            data: {
                dni,
                email,
                password_hash: passwordHash,
                nombres,
                apellidos,
                telefono,
                rol,
                especialidad,
                colegiatura,
                activo: true
            }
        });
        // Log de auditoría
        await prisma.logAuditoria.create({
            data: {
                usuario_id: req.user?.id,
                accion: "CREATE_USER",
                modulo: "admin",
                detalles: { usuario_id: usuario.id, rol }
            }
        });
        res.status(201).json({
            id: usuario.id,
            dni: usuario.dni,
            email: usuario.email,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            rol: usuario.rol
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/users/:id - Actualizar usuario
router.put("/:id", async (req, res) => {
    try {
        const { email, nombres, apellidos, telefono, rol, especialidad, colegiatura, activo } = req.body;
        const updateData = {};
        if (email !== undefined)
            updateData.email = email;
        if (nombres !== undefined)
            updateData.nombres = nombres;
        if (apellidos !== undefined)
            updateData.apellidos = apellidos;
        if (telefono !== undefined)
            updateData.telefono = telefono;
        if (rol !== undefined)
            updateData.rol = rol;
        if (especialidad !== undefined)
            updateData.especialidad = especialidad;
        if (colegiatura !== undefined)
            updateData.colegiatura = colegiatura;
        if (activo !== undefined)
            updateData.activo = activo;
        const usuario = await prisma.usuario.update({
            where: { id: req.params.id },
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
        res.json(usuario);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/users/:id/reset-password - Resetear contraseña
router.post("/:id/reset-password", async (req, res) => {
    try {
        const newPassword = crypto.randomBytes(8).toString("hex");
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.usuario.update({
            where: { id: req.params.id },
            data: { password_hash: passwordHash }
        });
        res.json({
            success: true,
            newPassword,
            message: "Contraseña reseteada. Nueva contraseña generada."
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// PUT /api/users/:id/toggle-status - Activar/Desactivar usuario
router.put("/:id/toggle-status", async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.params.id }
        });
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const updated = await prisma.usuario.update({
            where: { id: req.params.id },
            data: { activo: !usuario.activo }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/users/:id - Eliminar usuario
router.delete("/:id", async (req, res) => {
    try {
        await prisma.usuario.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true, message: "Usuario eliminado" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
import crypto from "crypto";
export default router;
