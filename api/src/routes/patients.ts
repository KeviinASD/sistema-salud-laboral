import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/patients/search - Búsqueda de pacientes
router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || (q as string).length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;
    
    const pacientes = await prisma.$queryRaw`
      SELECT 
        p.id,
        u.dni,
        u.nombres,
        u.apellidos,
        u.email,
        u.telefono,
        e.razon_social,
        (SELECT estado FROM admisiones WHERE paciente_id = p.id ORDER BY fecha_programada DESC LIMIT 1) as ultimo_estado
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN empresas e ON p.empresa_id = e.id
      WHERE 
        u.dni LIKE ${searchTerm} OR
        u.nombres ILIKE ${searchTerm} OR
        u.apellidos ILIKE ${searchTerm}
      LIMIT 10
    `;

    res.json(pacientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients - Listar pacientes
router.get("/", async (req: Request, res: Response) => {
  try {
    const { dni, page = "1", limit = "10" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const where: any = {};
    if (dni) {
      const usuario = await prisma.usuario.findUnique({
        where: { dni: dni as string }
      });
      if (usuario) {
        where.usuario_id = usuario.id;
      } else {
        return res.json({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
      }
    }

    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          usuario: true,
          empresa: true
        },
        orderBy: { created_at: "desc" }
      }),
      prisma.paciente.count({ where })
    ]);

    res.json({
      data: pacientes,
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

// POST /api/patients - Crear paciente
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      dni,
      email,
      nombres,
      apellidos,
      telefono,
      empresa_id,
      tipo_sangre,
      alergias,
      medicamentos_actuales,
      antecedentes_familiares,
      antecedentes_laborales
    } = req.body;

    // Verificar si el usuario ya existe
    let usuario = await prisma.usuario.findUnique({
      where: { dni }
    });

    if (!usuario) {
      // Crear usuario con contraseña temporal
      const tempPassword = crypto.randomBytes(8).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      usuario = await prisma.usuario.create({
        data: {
          dni,
          email: email || `${dni}@temp.com`,
          password_hash: passwordHash,
          nombres,
          apellidos,
          telefono,
          rol: "patient",
          activo: true
        }
      });
    }

    // Crear paciente
    const paciente = await prisma.paciente.create({
      data: {
        usuario_id: usuario.id,
        empresa_id: empresa_id || null,
        tipo_sangre: tipo_sangre || null,
        alergias: alergias || null,
        medicamentos_actuales: medicamentos_actuales || null,
        antecedentes_familiares: antecedentes_familiares || null,
        antecedentes_laborales_json: antecedentes_laborales ? JSON.parse(JSON.stringify(antecedentes_laborales)) : null
      },
      include: {
        usuario: true,
        empresa: true
      }
    });

    res.status(201).json(paciente);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/patients/:id - Obtener paciente
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const paciente = await prisma.paciente.findUnique({
      where: { id: req.params.id },
      include: {
        usuario: true,
        empresa: true,
        admisiones: {
          orderBy: { fecha_programada: "desc" },
          take: 10
        }
      }
    });

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    res.json(paciente);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

