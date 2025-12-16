import express, { Request, Response } from "express";
import { prisma } from "../utils/database";
import { enrollBiometric, verifyBiometric } from "../services/biometric";

const router = express.Router();

// POST /api/biometric/register - Registro biométrico
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { paciente_id, template_huella, template_facial } = req.body;

    const paciente = await (prisma as any).paciente.findUnique({
      where: { id: paciente_id },
      include: { usuario: true }
    });

    if (!paciente) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    // Encriptar y almacenar template biométrico
    const result = await enrollBiometric(paciente_id, {
      template_huella,
      template_facial
    });

    // Actualizar usuario con huella dactilar
    if (paciente.usuario_id) {
      await (prisma as any).usuario.update({
        where: { id: paciente.usuario_id },
        data: {
          huella_dactilar: template_huella ? Buffer.from(template_huella, "base64") : null
        }
      });
    }

    res.json({
      success: true,
      paciente_id,
      message: "Registro biométrico completado"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/biometric/verify - Verificación biométrica
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { template_huella, template_facial, paciente_id } = req.body;

    const result = await verifyBiometric(paciente_id || null, {
      template_huella,
      template_facial
    });

    if (result.verified) {
      // Obtener información del paciente
      const paciente = await (prisma as any).paciente.findUnique({
        where: { id: result.paciente_id! },
        include: {
          usuario: true,
          empresa: true
        }
      });

      return res.json({
        verified: true,
        paciente,
        confidence: result.confidence
      });
    }

    res.status(401).json({
      verified: false,
      message: "Verificación biométrica fallida"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/biometric/devices/register - Registro de dispositivo
router.post("/devices/register", async (req: Request, res: Response) => {
  try {
    const { device_id, device_type, device_info } = req.body;

    // Registrar dispositivo en la base de datos o sistema externo
    // Esto es un ejemplo, adaptar según el sistema de dispositivos

    res.json({
      success: true,
      device_id,
      message: "Dispositivo registrado exitosamente"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

