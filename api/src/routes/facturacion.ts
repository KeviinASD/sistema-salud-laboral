import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import { submitInvoiceSunat, validateDocument } from "../services/sunat";
import { createPaymentIntent } from "../services/payments";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/facturacion/stripe-config - Obtener configuración de Stripe para el frontend
router.get("/stripe-config", async (req: Request, res: Response) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
    res.json({
      publishableKey,
      enabled: !!publishableKey
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/facturacion/facturas - Listar facturas
router.get("/facturas", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10", estado, fecha_desde, fecha_hasta } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const where: any = {};
    if (estado) where.estado = estado;
    if (fecha_desde || fecha_hasta) {
      where.fecha_emision = {};
      if (fecha_desde) where.fecha_emision.gte = new Date(fecha_desde as string);
      if (fecha_hasta) where.fecha_emision.lte = new Date(fecha_hasta as string);
    }

    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
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
      prisma.factura.count({ where })
    ]);

    // Agregar información de estado SUNAT y actualizar números faltantes
    const facturasActualizadas = await Promise.all(
      facturas.map(async (f: any) => {
        // Si falta número_serie o numero_correlativo, asignarlos
        if (!f.numero_serie || !f.numero_correlativo) {
          const tipoComprobante = f.tipo_comprobante || "03";
          const serie = tipoComprobante === "01" ? "F001" : "B001";
          
          // Obtener el máximo correlativo existente para esta serie y tipo
          const maxInvoice = await prisma.factura.findFirst({
            where: { 
              tipo_comprobante: tipoComprobante,
              numero_serie: serie,
              numero_correlativo: { not: null }
            },
            orderBy: { numero_correlativo: "desc" }
          });

          const nuevoCorrelativo = maxInvoice ? (maxInvoice.numero_correlativo || 0) + 1 : 1;

          // Actualizar la factura
          try {
            const facturaActualizada = await prisma.factura.update({
              where: { id: f.id },
              data: {
                numero_serie: serie,
                numero_correlativo: nuevoCorrelativo
              }
            });

            return {
              ...facturaActualizada,
              xml_sunat: facturaActualizada.xml_sunat ? true : false,
              cdr_sunat: facturaActualizada.cdr_sunat ? true : false
            };
          } catch (updateError) {
            // Si hay error al actualizar, devolver la factura original
            console.error(`Error actualizando factura ${f.id}:`, updateError);
            return {
              ...f,
              xml_sunat: f.xml_sunat ? true : false,
              cdr_sunat: f.cdr_sunat ? true : false
            };
          }
        }
        
        return {
          ...f,
          xml_sunat: f.xml_sunat ? true : false,
          cdr_sunat: f.cdr_sunat ? true : false
        };
      })
    );

    res.json({
      data: facturasActualizadas,
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

// POST /api/facturacion/facturas - Crear factura
router.post("/facturas", async (req: Request, res: Response) => {
  try {
    const {
      admision_id,
      tipo_comprobante,
      numero_serie,
      subtotal,
      igv,
      total,
      metodo_pago,
      fecha_vencimiento
    } = req.body;

    const tipoComprobante = tipo_comprobante || "03";
    const serie = numero_serie || (tipoComprobante === "01" ? "F001" : "B001");

    // Obtener último correlativo para esta serie y tipo
    const lastInvoice = await prisma.factura.findFirst({
      where: { 
        tipo_comprobante: tipoComprobante,
        numero_serie: serie
      },
      orderBy: { numero_correlativo: "desc" }
    });

    const numero_correlativo = lastInvoice ? (lastInvoice.numero_correlativo || 0) + 1 : 1;

    const factura = await prisma.factura.create({
      data: {
        admision_id,
        tipo_comprobante: tipoComprobante,
        numero_serie: serie,
        numero_correlativo,
        estado: "pendiente",
        subtotal: subtotal ? parseFloat(subtotal) : null,
        igv: igv ? parseFloat(igv) : null,
        total: total ? parseFloat(total) : null,
        fecha_emision: new Date(),
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
        metodo_pago
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

    res.status(201).json(factura);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/facturacion/payment-intent - Crear payment intent para Stripe
router.post("/payment-intent", async (req: Request, res: Response) => {
  try {
    const { factura_id, metodo_pago } = req.body;

    const factura = await prisma.factura.findUnique({
      where: { id: factura_id }
    });

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    const totalAmount = factura.total ? Number(factura.total) : 0;
    const paymentIntent = await createPaymentIntent(
      Math.round(totalAmount * 100),
      "PEN",
      `Factura ${factura.numero_serie || ""}-${factura.numero_correlativo || ""}`,
      { factura_id, metodo_pago }
    );

    if (!paymentIntent.ok && !paymentIntent.simulated) {
      return res.status(400).json({ 
        error: "Error al crear payment intent",
        details: paymentIntent.error 
      });
    }

    res.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      simulated: paymentIntent.simulated || false
    });
  } catch (error: any) {
    console.error("Error creando payment intent:", error);
    res.status(500).json({ error: error.message || "Error al crear payment intent" });
  }
});

// POST /api/facturacion/pagos - Registrar pago
router.post("/pagos", async (req: Request, res: Response) => {
  try {
    const { factura_id, monto, metodo_pago, transaccion_id, payment_intent_id } = req.body;

    const factura = await prisma.factura.findUnique({
      where: { id: factura_id },
      include: {
        admision: {
          include: {
            paciente: {
              include: { usuario: true, empresa: true }
            }
          }
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    let paymentResult: any = null;
    let transactionId = transaccion_id;

    // Si hay pasarela de pago, procesar pago
    if (metodo_pago === "tarjeta" || metodo_pago === "yape" || metodo_pago === "plin") {
      try {
        const totalAmount = factura.total ? Number(factura.total) : 0;
        
        // Si hay un payment_intent_id, confirmar el pago
        if (payment_intent_id) {
          const { confirmPayment } = await import("../services/payments");
          paymentResult = await confirmPayment(payment_intent_id);
          transactionId = paymentResult.id || payment_intent_id;
        } else {
          // Crear nuevo payment intent
          paymentResult = await createPaymentIntent(
            Math.round(totalAmount * 100),
            "PEN",
            `Factura ${factura.numero_serie || ""}-${factura.numero_correlativo || ""}`,
            { factura_id, metodo_pago }
          );
          transactionId = paymentResult.id || transactionId;
        }
        
        // Si el pago no fue exitoso, retornar error
        if (!paymentResult.ok && !paymentResult.simulated) {
          return res.status(400).json({ 
            error: "Error al procesar el pago",
            details: paymentResult.error || "El pago no pudo ser procesado"
          });
        }
      } catch (paymentError: any) {
        console.error("Error procesando pago:", paymentError);
        return res.status(500).json({ 
          error: "Error al procesar el pago",
          details: paymentError.message 
        });
      }
    }

    // Actualizar factura como pagada
    const facturaActualizada = await prisma.factura.update({
      where: { id: factura_id },
      data: {
        estado: "pagado",
        metodo_pago,
        transaccion_id: transactionId
      },
      include: {
        admision: {
          include: {
            paciente: {
              include: { usuario: true, empresa: true }
            }
          }
        }
      }
    });

    // Enviar datos al webhook de n8n después de registrar el pago
    const n8nWebhookUrl = process.env.N8N_FACTURA;
    if (n8nWebhookUrl) {
      try {
        const webhookData = {
          evento: "pago_registrado",
          factura: {
            id: facturaActualizada.id,
            numero_serie: facturaActualizada.numero_serie,
            numero_correlativo: facturaActualizada.numero_correlativo,
            tipo_comprobante: facturaActualizada.tipo_comprobante,
            total: facturaActualizada.total ? Number(facturaActualizada.total) : 0,
            subtotal: facturaActualizada.subtotal ? Number(facturaActualizada.subtotal) : 0,
            igv: facturaActualizada.igv ? Number(facturaActualizada.igv) : 0,
            estado: facturaActualizada.estado,
            metodo_pago: facturaActualizada.metodo_pago,
            transaccion_id: facturaActualizada.transaccion_id,
            fecha_emision: facturaActualizada.fecha_emision?.toISOString() || new Date().toISOString(),
            fecha_pago: new Date().toISOString()
          },
          paciente: factura.admision?.paciente ? {
            id: factura.admision.paciente.id,
            nombres: factura.admision.paciente.usuario?.nombres || "",
            apellidos: factura.admision.paciente.usuario?.apellidos || "",
            dni: factura.admision.paciente.usuario?.dni || "",
            email: factura.admision.paciente.usuario?.email || ""
          } : null,
          admision: factura.admision ? {
            id: factura.admision.id,
            tipo_examen: factura.admision.tipo_examen || "",
            fecha_programada: factura.admision.fecha_programada?.toISOString() || null
          } : null,
          timestamp: new Date().toISOString()
        };

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(webhookData)
        });

        if (webhookResponse.ok) {
          console.log("✅ Datos de pago enviados exitosamente al webhook de n8n");
        } else {
          console.warn("⚠️ Webhook de n8n respondió con error:", webhookResponse.status);
        }
      } catch (webhookError: any) {
        console.error("❌ Error enviando datos al webhook de n8n:", webhookError.message);
        // No fallar el pago si el webhook falla - solo loguear el error
      }
    } else {
      console.log("ℹ️ N8N_FACTURA no configurado - webhook no enviado");
    }

    res.json(facturaActualizada);
  } catch (error: any) {
    console.error("Error en registro de pago:", error);
    res.status(500).json({ error: error.message || "Error al registrar pago" });
  }
});

// GET /api/facturacion/caja/diaria - Caja diaria
router.get("/caja/diaria", async (req: Request, res: Response) => {
  try {
    const { fecha } = req.query;
    const fechaConsulta = fecha ? new Date(fecha as string) : new Date();
    fechaConsulta.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaConsulta);
    fechaFin.setHours(23, 59, 59, 999);

    const facturas = await prisma.factura.findMany({
      where: {
        fecha_emision: {
          gte: fechaConsulta,
          lte: fechaFin
        },
        estado: "pagado"
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

    const resumen = {
      fecha: fechaConsulta.toISOString().split("T")[0],
      total_facturas: facturas.length,
      total_ingresos: facturas.reduce((sum, f) => sum + Number(f.total || 0), 0),
      por_metodo_pago: facturas.reduce((acc: any, f) => {
        const metodo = f.metodo_pago || "efectivo";
        acc[metodo] = (acc[metodo] || 0) + Number(f.total || 0);
        return acc;
      }, {}),
      facturas
    };

    res.json(resumen);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/facturacion/sunat/enviar - Enviar a SUNAT
router.post("/sunat/enviar", async (req: Request, res: Response) => {
  try {
    console.log("=== Iniciando envío a SUNAT ===");
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));
    
    const { factura_id } = req.body;

    if (!factura_id) {
      console.error("Error: factura_id no proporcionado");
      return res.status(400).json({ error: "factura_id es requerido" });
    }

    console.log(`Buscando factura con ID: ${factura_id}`);
    const factura = await prisma.factura.findUnique({
      where: { id: factura_id },
      include: {
        admision: {
          include: {
            paciente: {
              include: { usuario: true, empresa: true }
            }
          }
        }
      }
    });

    if (!factura) {
      console.error(`Factura no encontrada: ${factura_id}`);
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    console.log("Factura encontrada:", {
      id: factura.id,
      numero_correlativo: factura.numero_correlativo,
      total: factura.total,
      estado: factura.estado
    });

    // Verificar que la factura tenga los datos necesarios
    if (!factura.numero_correlativo) {
      console.error("Error: La factura no tiene número correlativo");
      return res.status(400).json({ 
        error: "La factura no tiene número correlativo asignado",
        factura_id: factura.id
      });
    }

    if (!factura.total || Number(factura.total) <= 0) {
      console.error("Error: La factura no tiene total válido", { total: factura.total });
      return res.status(400).json({ 
        error: "La factura no tiene un total válido",
        total: factura.total,
        factura_id: factura.id
      });
    }

    // Verificar configuración de SUNAT
    const sunatApiUrl = process.env.SUNAT_API_URL;
    const sunatPersonaId = process.env.SUNAT_PERSONA_ID;
    const sunatToken = process.env.SUNAT_API_TOKEN;
    
    console.log("SUNAT_API_URL configurada:", sunatApiUrl ? "Sí" : "No");
    console.log("SUNAT_PERSONA_ID configurada:", sunatPersonaId ? "Sí" : "No");
    console.log("SUNAT_API_TOKEN configurada:", sunatToken ? "Sí" : "No");
    
    if (!sunatApiUrl) {
      console.error("Error: SUNAT_API_URL no configurada");
      return res.status(400).json({ 
        error: "SUNAT_API_URL no está configurada en las variables de entorno",
        message: "Por favor, configure SUNAT_API_URL en el archivo .env para enviar facturas a SUNAT"
      });
    }
    
    // Si es APISUNAT, verificar que tenga personaId y token
    if (sunatApiUrl.includes("apisunat") || sunatApiUrl.includes("apisunat.com")) {
      if (!sunatPersonaId || !sunatToken) {
        console.error("Error: APISUNAT requiere SUNAT_PERSONA_ID y SUNAT_API_TOKEN");
        return res.status(400).json({ 
          error: "APISUNAT requiere configuración adicional",
          message: "Para usar APISUNAT, configure SUNAT_PERSONA_ID y SUNAT_API_TOKEN en el archivo .env"
        });
      }
    }

    // Generar XML según formato SUNAT
    const xmlSunat = await generateSunatXML(factura);

    // Enviar a SUNAT
    const sunatResponse = await submitInvoiceSunat({
      id: factura_id,
      xml: xmlSunat,
      numero_serie: factura.numero_serie || "B001",
      numero_correlativo: factura.numero_correlativo,
      tipo_comprobante: factura.tipo_comprobante || "03"
    });

    // Log de la respuesta para debugging
    console.log("Respuesta de SUNAT:", JSON.stringify(sunatResponse, null, 2));

    // Actualizar factura con respuesta SUNAT
    const updateData: any = {
      xml_sunat: Buffer.from(xmlSunat)
    };

    if (sunatResponse.cdr) {
      updateData.cdr_sunat = Buffer.from(sunatResponse.cdr);
    }

    // Guardar el estado de SUNAT en observaciones o en un campo JSON si existe
    // Por ahora lo incluiremos en la respuesta
    if (sunatResponse.status === "accepted" || sunatResponse.ok === true) {
      updateData.estado = "pagado";
    }

    const facturaActualizada = await prisma.factura.update({
      where: { id: factura_id },
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

    // Incluir información de SUNAT en la respuesta
    const response: any = {
      ...facturaActualizada,
      // Convertir buffers a indicadores booleanos para el frontend
      xml_sunat: facturaActualizada.xml_sunat ? true : false,
      cdr_sunat: facturaActualizada.cdr_sunat ? true : false
    };
    
    if (sunatResponse.message) {
      response.message = sunatResponse.message;
    }
    if (sunatResponse.error) {
      response.error = sunatResponse.error;
    }
    if (sunatResponse.status) {
      response.sunat_status = sunatResponse.status;
    }
    if (sunatResponse.ok !== undefined) {
      response.sunat_ok = sunatResponse.ok;
    }

    console.log("Factura actualizada con estado SUNAT:", {
      id: facturaActualizada.id,
      tiene_xml: !!facturaActualizada.xml_sunat,
      tiene_cdr: !!facturaActualizada.cdr_sunat,
      estado_sunat: sunatResponse.status
    });

    res.json(response);
  } catch (error: any) {
    console.error("Error en envío a SUNAT:", error);
    res.status(500).json({ 
      error: error.message || "Error al enviar factura a SUNAT",
      details: error.stack
    });
  }
});

// POST /api/facturacion/sunat/validate - Validar documento SUNAT
router.post("/sunat/validate", async (req: Request, res: Response) => {
  try {
    const { type, value } = req.body;
    const data = await validateDocument(type, value);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/facturacion/facturas/:id/boleta - Generar boleta/recibo en PDF
router.get("/facturas/:id/boleta", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        admision: {
          include: {
            paciente: {
              include: { usuario: true, empresa: true }
            },
            empresa: true
          }
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    // Obtener configuración de la clínica
    let configClinica: any = null;
    try {
      // Intentar obtener de ConfigClinica primero
      const configClinicaRows = await (prisma as any).configClinica.findMany({
        take: 1,
        orderBy: { updated_at: "desc" }
      });
      if (configClinicaRows && configClinicaRows.length > 0) {
        configClinica = configClinicaRows[0];
      } else {
        // Si no existe, intentar con ClinicConfig
        const clinicConfigRows = await prisma.clinicConfig.findMany({
          take: 1
        });
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

    const paciente = factura.admision?.paciente?.usuario;
    const empresaPaciente = factura.admision?.paciente?.empresa || factura.admision?.empresa;

    // Configurar respuesta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="boleta-${factura.numero_correlativo || factura.id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const formatMoney = (v?: any) => {
      const n = Number(v || 0);
      return `S/ ${n.toFixed(2)}`;
    };

    // Encabezado con datos de la clínica
    const nombreClinica = configClinica?.nombre || "CLÍNICA / CENTRO MÉDICO";
    const rucClinica = configClinica?.ruc || "—";
    const direccionClinica = configClinica?.direccion || "—";
    
    doc
      .fontSize(16)
      .text(nombreClinica, { align: "left", continued: false });
    doc.fontSize(10).text(`RUC: ${rucClinica}`);
    doc.text(`Dirección: ${direccionClinica}`);
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .text("BOLETA DE VENTA", { align: "right" })
      .fontSize(10)
      .text(`Serie: ${factura.numero_serie || "B001"}`, { align: "right" })
      .text(
        `Número: ${factura.numero_correlativo || "—"}`,
        { align: "right" }
      )
      .text(
        `Fecha: ${
          factura.fecha_emision
            ? new Date(factura.fecha_emision).toLocaleDateString("es-PE")
            : new Date().toLocaleDateString("es-PE")
        }`,
        { align: "right" }
      );

    doc.moveDown();
    doc.fontSize(12).text("Datos del paciente", { underline: true });
    doc.fontSize(10);
    doc.text(`Nombre: ${paciente ? `${paciente.nombres || ""} ${paciente.apellidos || ""}`.trim() : "—"}`);
    doc.text(`DNI: ${paciente?.dni || "—"}`);
    if (empresaPaciente) {
      doc.text(`Empresa: ${empresaPaciente.razon_social || "—"}`);
      if ((empresaPaciente as any).ruc) {
        doc.text(`RUC: ${(empresaPaciente as any).ruc}`);
      }
    }

    doc.moveDown();
    doc.fontSize(12).text("Detalle", { underline: true });
    doc.fontSize(10);
    doc.text(
      `Concepto: Examen médico ocupacional ${
        factura.admision?.tipo_examen || ""
      }`
    );
    if (factura.admision?.motivo_consulta) {
      doc.text(`Motivo: ${factura.admision.motivo_consulta}`);
    }
    doc.moveDown(0.5);
    doc.text(`Subtotal: ${formatMoney(factura.subtotal)}`);
    doc.text(`IGV (18%): ${formatMoney(factura.igv)}`);
    doc.text(`Total: ${formatMoney(factura.total)}`, { font: "Helvetica-Bold" });

    doc.moveDown();
    doc.fontSize(12).text("Pago", { underline: true });
    doc.fontSize(10);
    doc.text(`Estado: ${factura.estado}`);
    doc.text(`Método de pago: ${factura.metodo_pago || "—"}`);
    if (factura.transaccion_id) {
      doc.text(`Transacción: ${factura.transaccion_id}`);
    }

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor("gray").text("Documento generado automáticamente.", { align: "center" });
    doc.end();
  } catch (error: any) {
    console.error("Error generando boleta PDF:", error);
    res.status(500).json({ error: error.message || "Error al generar boleta" });
  }
});

async function generateSunatXML(factura: any): Promise<string> {
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
          direccion: clinicConfigRows[0].address
        };
      }
    }
  } catch (error) {
    console.error("Error obteniendo configuración de clínica:", error);
  }

  const paciente = factura.admision?.paciente?.usuario;
  const fechaEmision = factura.fecha_emision 
    ? new Date(factura.fecha_emision).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  
  const rucEmisor = configClinica?.ruc || "00000000000";
  const nombreEmisor = configClinica?.nombre || "EMPRESA";
  const direccionEmisor = configClinica?.direccion || "";
  
  const tipoDocCliente = factura.admision?.empresa?.ruc ? "6" : "1"; // 6=RUC, 1=DNI
  const numDocCliente = factura.admision?.empresa?.ruc || paciente?.dni || "00000000";
  const nombreCliente = factura.admision?.empresa?.razon_social 
    || `${paciente?.nombres || ""} ${paciente?.apellidos || ""}`.trim()
    || "CLIENTE";

  // Generación simplificada de XML SUNAT UBL 2.1
  // NOTA: En producción se debe usar una librería especializada como facturador-electronico
  // Este es un XML básico que puede necesitar ajustes según el proveedor de API
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${factura.numero_serie || "B001"}-${factura.numero_correlativo}</cbc:ID>
  <cbc:IssueDate>${fechaEmision}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${factura.tipo_comprobante || "03"}</cbc:InvoiceTypeCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6" schemeName="Documento de Identidad" schemeAgencyName="PE:SUNAT" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${rucEmisor}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${nombreEmisor}</cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressLine>${direccionEmisor}</cbc:AddressLine>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${tipoDocCliente}">${numDocCliente}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${nombreCliente}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${Number(factura.igv || 0).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${Number(factura.subtotal || 0).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${Number(factura.igv || 0).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeName="Tax Scheme Identifier" schemeAgencyName="United Nations Economic Commission for Europe">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${Number(factura.subtotal || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${Number(factura.total || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${Number(factura.total || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="NIU" unitCodeListID="UN/ECE rec 20" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListName="Unit of Measure Code">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="PEN">${Number(factura.subtotal || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:PricingReference>
      <cac:AlternativeConditionPrice>
        <cbc:PriceAmount currencyID="PEN">${Number(factura.total || 0).toFixed(2)}</cbc:PriceAmount>
        <cbc:PriceTypeCode listID="UN/ECE 4461" listName="Price Type" listAgencyName="United Nations Economic Commission for Europe" listURI="urn:un:unece:uncefact:codelist:specification:4461:2001">01</cbc:PriceTypeCode>
      </cac:AlternativeConditionPrice>
    </cac:PricingReference>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="PEN">${Number(factura.igv || 0).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="PEN">${Number(factura.subtotal || 0).toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="PEN">${Number(factura.igv || 0).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID schemeID="UN/ECE 5305" schemeName="Tax Category Identifier" schemeAgencyName="United Nations Economic Commission for Europe">S</cbc:ID>
          <cac:TaxScheme>
            <cbc:ID schemeID="UN/ECE 5153" schemeName="Tax Scheme Identifier" schemeAgencyName="United Nations Economic Commission for Europe">1000</cbc:ID>
            <cbc:Name>IGV</cbc:Name>
            <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>Examen médico ocupacional ${factura.admision?.tipo_examen || ""}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="PEN">${Number(factura.subtotal || 0).toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}

export default router;

