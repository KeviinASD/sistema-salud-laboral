import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Datos de ejemplo para generar registros
const nombres = [
  "Juan", "María", "Carlos", "Ana", "Luis", "Laura", "Pedro", "Carmen",
  "José", "Patricia", "Miguel", "Sandra", "Roberto", "Mónica", "Fernando",
  "Andrea", "Ricardo", "Diana", "Alejandro", "Gloria"
];

const apellidos = [
  "García", "Rodríguez", "López", "Martínez", "González", "Pérez", "Sánchez",
  "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales",
  "Ortiz", "Gutiérrez", "Chávez", "Ramos", "Mendoza"
];

const empresas = [
  "Minera Los Andes S.A.C.", "Construcciones del Sur S.A.", "Transportes Rápidos E.I.R.L.",
  "Industrias Metalúrgicas S.A.", "Agroexportadora del Norte S.A.C.", "Servicios Médicos Integrales S.A.",
  "Textiles Modernos S.A.", "Comercializadora Internacional S.A.C.", "Pesquera del Pacífico S.A.",
  "Energía Renovable S.A.", "Logística y Distribución S.A.C.", "Tecnología Avanzada S.A.",
  "Alimentos Nutritivos S.A.C.", "Química Industrial S.A.", "Inmobiliaria Premium S.A.",
  "Telecomunicaciones del Perú S.A.", "Automotriz Nacional S.A.C.", "Farmacéutica Andina S.A.",
  "Turismo y Hotelería S.A.", "Educación Superior S.A.C."
];

const tiposExamen = [
  "Examen Médico Ocupacional de Ingreso", "Examen Médico Ocupacional Periódico",
  "Examen Médico Ocupacional de Retiro", "Examen Médico Ocupacional de Reintegro",
  "Examen Médico Pre-Empleo", "Examen Médico de Control", "Examen Médico de Alta",
  "Examen Médico de Baja", "Examen Médico de Reubicación", "Examen Médico de Capacitación",
  "Examen Médico de Promoción", "Examen Médico de Transferencia", "Examen Médico de Evaluación",
  "Examen Médico de Seguimiento", "Examen Médico de Vigilancia", "Examen Médico de Prevención",
  "Examen Médico de Diagnóstico", "Examen Médico de Tratamiento", "Examen Médico de Control Anual",
  "Examen Médico de Certificación"
];

const tiposExamenLab = [
  "Hematología Completa", "Química Sanguínea", "Examen de Orina Completo",
  "Audiometría", "Espirometría", "Radiografía de Tórax", "Electrocardiograma",
  "Prueba de Esfuerzo", "Examen Visual", "Examen de Agudeza Visual",
  "Prueba de Función Hepática", "Prueba de Función Renal", "Perfil Lipídico",
  "Glicemia en Ayunas", "Hemoglobina Glicosilada", "Prueba de Coagulación",
  "Serología", "Cultivo de Esputo", "Prueba de Tuberculina", "Examen Toxicológico"
];

const categoriasInventario = [
  "Medicamentos", "Material Médico", "Equipos", "Insumos", "Reactivos",
  "Material de Laboratorio", "Equipos de Protección", "Material Descartable",
  "Instrumental", "Consumibles", "Herramientas", "Mobiliario", "Tecnología",
  "Limpieza", "Seguridad", "Almacén", "Oficina", "Mantenimiento", "Transporte", "Otros"
];

async function main() {
  console.log("🌱 Iniciando seed completo de la base de datos...");
  console.log("📊 Generando 20 registros por tabla...\n");

  // Limpiar datos existentes (opcional - descomentar si quieres empezar desde cero)
  console.log("🧹 Limpiando datos existentes...");
  try {
    await (prisma as any).seguimientoLogistico.deleteMany();
    await (prisma as any).adjuntosHistoriaClinica.deleteMany();
    await (prisma as any).examenesEspecializados.deleteMany();
    await (prisma as any).antecedentesLaborales.deleteMany();
    await (prisma as any).notasEvolucion.deleteMany();
    await (prisma as any).diasNoLaborables.deleteMany();
    await (prisma as any).logAuditoria.deleteMany();
    await (prisma as any).integracionExterna.deleteMany();
    await (prisma as any).plantillaDocumento.deleteMany();
    await (prisma as any).configClinica.deleteMany();
    await (prisma as any).documentoAdmision.deleteMany();
    await (prisma as any).movimientoInventario.deleteMany();
    await (prisma as any).inventario.deleteMany();
    await (prisma as any).factura.deleteMany();
    await (prisma as any).conceptoAptitud.deleteMany();
    await (prisma as any).examenLaboratorio.deleteMany();
    await (prisma as any).historiaClinica.deleteMany();
    await (prisma as any).admision.deleteMany();
    await (prisma as any).paciente.deleteMany();
    await (prisma as any).configTurnos.deleteMany();
    await (prisma as any).tiposExamen.deleteMany();
    await (prisma as any).empresa.deleteMany();
    await (prisma as any).usuario.deleteMany();
    console.log("✅ Datos limpiados\n");
  } catch (error: any) {
    console.log("⚠️  Algunos datos no pudieron ser limpiados (puede ser normal si la BD está vacía)\n");
  }

  try {
    // 1. USUARIOS (40 - 20 para staff y 20 para pacientes)
    console.log("1️⃣ Creando 40 usuarios (20 staff + 20 pacientes)...");
    const usuarios: any[] = [];
    const usuariosPacientes: any[] = [];
    
    // Crear 20 usuarios de staff (admin, doctor, admissions, lab)
    for (let i = 0; i < 20; i++) {
      const dni = String(10000000 + i).padStart(8, "0");
      const email = `usuario${i + 1}@saludlaboral.pe`;
      const passwordHash = await bcrypt.hash("Password123!", 10);
      const rol = i === 0 ? "admin" : i < 5 ? "doctor" : i < 10 ? "admissions" : "lab";
      
      const usuario = await (prisma as any).usuario.upsert({
        where: { dni },
        update: {},
        create: {
          dni,
          email,
          password_hash: passwordHash,
          nombres: nombres[i],
          apellidos: apellidos[i],
          telefono: `9${String(1000000 + i).padStart(8, "0")}`,
          rol,
          especialidad: rol === "doctor" ? "Medicina Ocupacional" : null,
          colegiatura: rol === "doctor" ? `CMP${String(10000 + i).padStart(5, "0")}` : null,
          activo: true
        }
      });
      usuarios.push(usuario);
    }
    
    // Crear 20 usuarios adicionales para pacientes
    for (let i = 0; i < 20; i++) {
      const dni = String(20000000 + i).padStart(8, "0");
      const email = `paciente${i + 1}@saludlaboral.pe`;
      const passwordHash = await bcrypt.hash("Password123!", 10);
      
      const usuarioPaciente = await (prisma as any).usuario.upsert({
        where: { dni },
        update: {},
        create: {
          dni,
          email,
          password_hash: passwordHash,
          nombres: nombres[i],
          apellidos: apellidos[(i + 10) % apellidos.length],
          telefono: `9${String(2000000 + i).padStart(8, "0")}`,
          rol: "patient",
          activo: true
        }
      });
      usuariosPacientes.push(usuarioPaciente);
    }
    console.log(`✅ ${usuarios.length} usuarios de staff creados`);
    console.log(`✅ ${usuariosPacientes.length} usuarios de pacientes creados\n`);

    // 2. EMPRESAS (20)
    console.log("2️⃣ Creando 20 empresas...");
    const empresasCreadas: any[] = [];
    for (let i = 0; i < 20; i++) {
      const ruc = String(20100000000 + i).padStart(11, "0");
      const empresa = await (prisma as any).empresa.create({
        data: {
          ruc,
          razon_social: empresas[i],
          nombre_comercial: empresas[i].replace(" S.A.", "").replace(" S.A.C.", "").replace(" E.I.R.L.", ""),
          direccion: `Av. Principal ${i + 1}, Lima, Perú`,
          telefono: `01${String(2000000 + i).padStart(7, "0")}`,
          contacto_nombre: `${nombres[i]} ${apellidos[i]}`,
          contacto_email: `contacto${i + 1}@${empresas[i].toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          activo: true
        }
      });
      empresasCreadas.push(empresa);
    }
    console.log(`✅ ${empresasCreadas.length} empresas creadas\n`);

    // 3. PACIENTES (20) - Requiere usuarios y empresas
    console.log("3️⃣ Creando 20 pacientes...");
    const pacientes: any[] = [];
    for (let i = 0; i < 20; i++) {
      const usuarioPaciente = usuariosPacientes[i]; // Usar usuarios de pacientes creados
      const empresa = empresasCreadas[i % empresasCreadas.length];
      const tiposSangre = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      
      const paciente = await (prisma as any).paciente.create({
        data: {
          usuario_id: usuarioPaciente.id, // Cada paciente tiene un usuario_id único
          empresa_id: empresa.id,
          tipo_sangre: tiposSangre[i % tiposSangre.length],
          alergias: i % 3 === 0 ? "Ninguna" : i % 3 === 1 ? "Polen" : "Penicilina",
          medicamentos_actuales: i % 2 === 0 ? "Ninguno" : "Antihistamínicos",
          antecedentes_familiares: i % 4 === 0 ? "Hipertensión" : i % 4 === 1 ? "Diabetes" : i % 4 === 2 ? "Cardiopatías" : "Ninguno",
          antecedentes_laborales_json: {
            puestos: [
              { puesto: "Operario", fecha_inicio: "2020-01-01", fecha_fin: null },
              { puesto: "Supervisor", fecha_inicio: "2022-06-01", fecha_fin: null }
            ],
            riesgos: ["Ruido", "Vibraciones"]
          }
        }
      });
      pacientes.push(paciente);
    }
    console.log(`✅ ${pacientes.length} pacientes creados\n`);

    // 4. TIPOS DE EXAMEN (20)
    console.log("4️⃣ Creando 20 tipos de examen...");
    const tiposExamenCreados: any[] = [];
    for (let i = 0; i < 20; i++) {
      const tipo = await (prisma as any).tiposExamen.create({
        data: {
          codigo: `EX${String(i + 1).padStart(3, "0")}`,
          nombre: tiposExamen[i],
          descripcion: `Descripción del examen: ${tiposExamen[i]}`,
          duracion_minutos: 30 + (i * 5),
          requiere_laboratorio: i % 2 === 0,
          requiere_radiografia: i % 3 === 0,
          precio_base: 50 + (i * 10),
          activo: true
        }
      });
      tiposExamenCreados.push(tipo);
    }
    console.log(`✅ ${tiposExamenCreados.length} tipos de examen creados\n`);

    // 5. CONFIGURACIÓN DE TURNOS (20)
    console.log("5️⃣ Creando 20 configuraciones de turnos...");
    const turnos: any[] = [];
    for (let i = 0; i < 20; i++) {
      const medico = usuarios.find(u => u.rol === "doctor") || usuarios[1];
      const turno = await (prisma as any).configTurnos.create({
        data: {
          medico_id: i < 5 ? medico.id : null, // Algunos turnos generales, otros específicos
          dia_semana: i % 7,
          hora_inicio: `${String(8 + (i % 4)).padStart(2, "0")}:00:00`,
          hora_fin: `${String(12 + (i % 4)).padStart(2, "0")}:00:00`,
          duracion_cita: 30,
          max_citas_dia: 20,
          activo: true
        }
      });
      turnos.push(turno);
    }
    console.log(`✅ ${turnos.length} configuraciones de turnos creadas\n`);

    // 6. ADMISIONES (20) - Requiere pacientes
    console.log("6️⃣ Creando 20 admisiones...");
    const admisiones: any[] = [];
    const estados = ["programado", "confirmado", "en_proceso", "completado", "cancelado"];
    for (let i = 0; i < 20; i++) {
      const paciente = pacientes[i % pacientes.length];
      const empresa = empresasCreadas[i % empresasCreadas.length];
      const medico = usuarios.find(u => u.rol === "doctor") || usuarios[1];
      const creador = usuarios.find(u => u.rol === "admissions") || usuarios[5];
      const fechaProgramada = new Date();
      fechaProgramada.setDate(fechaProgramada.getDate() + i);
      
      const admision = await (prisma as any).admision.create({
        data: {
          paciente_id: paciente.id,
          empresa_id: empresa.id,
          tipo_examen: i % 4 === 0 ? "ingreso" : i % 4 === 1 ? "periodico" : i % 4 === 2 ? "retiro" : "reintegro",
          estado: estados[i % estados.length],
          fecha_programada: fechaProgramada,
          fecha_atencion: i % 3 === 0 ? new Date() : null,
          medico_id: medico.id,
          motivo_consulta: `Consulta médica ocupacional ${i + 1}`,
          observaciones_admision: i % 2 === 0 ? `Observaciones para admisión ${i + 1}` : null,
          created_by: creador.id
        }
      });
      admisiones.push(admision);
    }
    console.log(`✅ ${admisiones.length} admisiones creadas\n`);

    // 7. HISTORIA CLÍNICA (20) - Requiere admisiones
    console.log("7️⃣ Creando 20 historias clínicas...");
    const historias: any[] = [];
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const actualizador = usuarios.find(u => u.rol === "doctor") || usuarios[1];
      
      const historia = await (prisma as any).historiaClinica.create({
        data: {
          admision_id: admision.id,
          anamnesis: `Anamnesis del paciente ${i + 1}: Refiere buen estado de salud general.`,
          examen_fisico: {
            presion_arterial: `${120 + i}/80`,
            peso: 70 + i,
            talla: 170 + i,
            imc: (70 + i) / Math.pow((170 + i) / 100, 2),
            frecuencia_cardiaca: 70 + i,
            frecuencia_respiratoria: 16 + (i % 4)
          },
          diagnostico: i % 3 === 0 ? "Apto" : i % 3 === 1 ? "Apto con restricciones" : "No apto",
          tratamiento: i % 2 === 0 ? "Control periódico" : "Seguimiento médico",
          notas_evolucion: [`Nota de evolución ${i + 1}`, `Seguimiento ${i + 1}`],
          updated_by: actualizador.id
        }
      });
      historias.push(historia);
    }
    console.log(`✅ ${historias.length} historias clínicas creadas\n`);

    // 8. EXÁMENES DE LABORATORIO (20) - Requiere admisiones
    console.log("8️⃣ Creando 20 exámenes de laboratorio...");
    const examenesLab: any[] = [];
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const tecnico = usuarios.find(u => u.rol === "lab") || usuarios[10];
      
      const examen = await (prisma as any).examenLaboratorio.create({
        data: {
          admision_id: admision.id,
          tipo_examen: tiposExamenLab[i % tiposExamenLab.length],
          parametros: {
            valor: 10 + i,
            unidad: "mg/dL",
            rango_normal: "5-15",
            resultado: i % 3 === 0 ? "Normal" : i % 3 === 1 ? "Alto" : "Bajo"
          },
          resultado_final: i % 3 === 0 ? "Normal" : i % 3 === 1 ? "Requiere seguimiento" : "Anormal",
          estado: i % 4 === 0 ? "pendiente" : i % 4 === 1 ? "procesando" : i % 4 === 2 ? "completado" : "anulado",
          fecha_muestra: new Date(),
          fecha_resultado: i % 2 === 0 ? new Date() : null,
          tecnico_id: tecnico.id
        }
      });
      examenesLab.push(examen);
    }
    console.log(`✅ ${examenesLab.length} exámenes de laboratorio creados\n`);

    // 9. CONCEPTOS DE APTITUD (20) - Requiere admisiones
    console.log("9️⃣ Creando 20 conceptos de aptitud...");
    const conceptos: any[] = [];
    const resultados = ["apto", "no_apto", "apto_restriccion"]; // Ajustado para que quepa en VarChar(20)
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const creador = usuarios.find((u: any) => u.rol === "doctor") || usuarios[1];
      
      const concepto = await (prisma as any).conceptoAptitud.create({
        data: {
          admision_id: admision.id,
          resultado: resultados[i % resultados.length],
          restricciones: i % 3 === 1 ? "No trabajar en altura" : i % 3 === 2 ? "No exposición a ruido" : null,
          recomendaciones: `Recomendaciones médicas para el paciente ${i + 1}`,
          fecha_vigencia: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          created_by: creador.id
        }
      });
      conceptos.push(concepto);
    }
    console.log(`✅ ${conceptos.length} conceptos de aptitud creados\n`);

    // 10. FACTURAS (20) - Requiere admisiones
    console.log("🔟 Creando 20 facturas...");
    const facturas: any[] = [];
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const creador = usuarios.find(u => u.rol === "admissions") || usuarios[5];
      const subtotal = 100 + (i * 10);
      const igv = subtotal * 0.18;
      const total = subtotal + igv;
      
      const factura = await (prisma as any).factura.create({
        data: {
          admision_id: admision.id,
          numero_serie: "B001",
          numero_correlativo: 1000 + i,
          tipo_comprobante: i % 2 === 0 ? "03" : "01", // Boleta o Factura
          estado: i % 3 === 0 ? "pendiente" : i % 3 === 1 ? "pagado" : "anulado",
          subtotal,
          igv,
          total,
          fecha_emision: new Date(),
          fecha_vencimiento: new Date(new Date().setDate(new Date().getDate() + 30)),
          metodo_pago: i % 4 === 0 ? "efectivo" : i % 4 === 1 ? "tarjeta" : i % 4 === 2 ? "transferencia" : "cheque",
          creado_por: creador.id
        }
      });
      facturas.push(factura);
    }
    console.log(`✅ ${facturas.length} facturas creadas\n`);

    // 11. INVENTARIO (20)
    console.log("1️⃣1️⃣ Creando 20 items de inventario...");
    const inventario: any[] = [];
    for (let i = 0; i < 20; i++) {
      const item = await (prisma as any).inventario.create({
        data: {
          codigo: `INV${String(i + 1).padStart(4, "0")}`,
          nombre: `Item de Inventario ${i + 1}`,
          categoria: categoriasInventario[i % categoriasInventario.length],
          stock_actual: 50 + (i * 5),
          stock_minimo: 10,
          unidad_medida: i % 3 === 0 ? "unidad" : i % 3 === 1 ? "caja" : "litro",
          precio_unitario: 10 + (i * 2),
          proveedor: `Proveedor ${i + 1}`,
          ubicacion: `Almacén ${String.fromCharCode(65 + (i % 5))}` // A, B, C, D, E
        }
      });
      inventario.push(item);
    }
    console.log(`✅ ${inventario.length} items de inventario creados\n`);

    // 12. MOVIMIENTOS DE INVENTARIO (20) - Requiere inventario
    console.log("1️⃣2️⃣ Creando 20 movimientos de inventario...");
    for (let i = 0; i < 20; i++) {
      const item = inventario[i % inventario.length];
      const usuario = usuarios[i % usuarios.length];
      
      await (prisma as any).movimientoInventario.create({
        data: {
          item_id: item.id,
          tipo_movimiento: i % 2 === 0 ? "entrada" : "salida",
          cantidad: 10 + (i * 2),
          motivo: i % 2 === 0 ? `Compra de ${item.nombre}` : `Uso de ${item.nombre}`,
          referencia: i % 2 === 0 ? null : `ADM${String(i + 1).padStart(4, "0")}`,
          usuario_id: usuario.id
        }
      });
    }
    console.log(`✅ 20 movimientos de inventario creados\n`);

    // 13. DOCUMENTOS DE ADMISIÓN (20) - Requiere admisiones
    console.log("1️⃣3️⃣ Creando 20 documentos de admisión...");
    const tiposDocumento = ["dni_front", "dni_back", "contrato", "examen_preingreso", "radiografia", "otros"];
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const contenido = Buffer.from(`Contenido del documento ${i + 1}`);
      // Generar hash SHA256 válido de exactamente 64 caracteres hexadecimales
      const hashValue = `a${String(i).padStart(2, "0")}${"0".repeat(61)}`.substring(0, 64);
      
      await (prisma as any).documentoAdmision.create({
        data: {
          admision_id: admision.id,
          tipo: tiposDocumento[i % tiposDocumento.length],
          nombre_archivo: `documento_${i + 1}.pdf`,
          mime_type: "application/pdf",
          tamano: contenido.length,
          contenido,
          hash_sha256: hashValue
        }
      });
    }
    console.log(`✅ 20 documentos de admisión creados\n`);

    // 14. CONFIGURACIÓN DE CLÍNICA (1)
    console.log("1️⃣4️⃣ Creando configuración de clínica...");
    await (prisma as any).configClinica.create({
      data: {
        nombre: "Clínica de Salud Laboral",
        ruc: "20100070970",
        direccion: "Av. Principal 123, Lima, Perú",
        telefono: "01-2345678",
        email: "info@saludlaboral.pe",
        sunat_ambiente: "beta"
      }
    });
    console.log(`✅ Configuración de clínica creada\n`);

    // 15. PLANTILLAS DE DOCUMENTOS (20) - Requiere usuarios
    console.log("1️⃣5️⃣ Creando 20 plantillas de documentos...");
    const tiposPlantilla = ["concepto_aptitud", "consentimiento", "historia_clinica", "factura"];
    for (let i = 0; i < 20; i++) {
      const creador = usuarios[i % usuarios.length];
      
      await (prisma as any).plantillaDocumento.create({
        data: {
          nombre: `Plantilla ${i + 1}`,
          tipo: tiposPlantilla[i % tiposPlantilla.length],
          contenido_html: `<html><body><h1>Plantilla ${i + 1}</h1><p>Contenido de la plantilla</p></body></html>`,
          variables: {
            paciente_nombre: "{{paciente_nombre}}",
            fecha: "{{fecha}}",
            medico: "{{medico}}"
          },
          activa: i % 2 === 0,
          creado_por: creador.id
        }
      });
    }
    console.log(`✅ 20 plantillas de documentos creadas\n`);

    // 16. INTEGRACIONES EXTERNAS (20) - Requiere usuarios
    console.log("1️⃣6️⃣ Creando 20 integraciones externas...");
    const tiposIntegracion = ["pago", "dni", "biometrico", "sms", "email"];
    for (let i = 0; i < 20; i++) {
      const creador = usuarios[i % usuarios.length];
      
      await (prisma as any).integracionExterna.create({
        data: {
          nombre: `Integración ${i + 1}`,
          tipo: tiposIntegracion[i % tiposIntegracion.length],
          config: {
            api_key: `key_${i}`,
            endpoint: `https://api.example.com/${i}`,
            activo: i % 2 === 0
          },
          activa: i % 2 === 0,
          creado_por: creador.id
        }
      });
    }
    console.log(`✅ 20 integraciones externas creadas\n`);

    // 17. LOGS DE AUDITORÍA (20) - Requiere usuarios
    console.log("1️⃣7️⃣ Creando 20 logs de auditoría...");
    const acciones = ["crear", "actualizar", "eliminar", "consultar", "exportar"];
    const modulos = ["admisiones", "pacientes", "facturacion", "laboratorio", "inventario"];
    for (let i = 0; i < 20; i++) {
      const usuario = usuarios[i % usuarios.length];
      
      await (prisma as any).logAuditoria.create({
        data: {
          usuario_id: usuario.id,
          accion: acciones[i % acciones.length],
          modulo: modulos[i % modulos.length],
          detalles: {
            registro_id: `reg_${i}`,
            cambios: `Cambios realizados en registro ${i}`
          },
          ip_address: `192.168.1.${i + 1}`,
          user_agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${i}`
        }
      });
    }
    console.log(`✅ 20 logs de auditoría creados\n`);

    // 18. DÍAS NO LABORABLES (20)
    console.log("1️⃣8️⃣ Creando 20 días no laborables...");
    const motivos = [
      "Día Nacional", "Feriado Regional", "Día de la Independencia",
      "Navidad", "Año Nuevo", "Semana Santa", "Día del Trabajador",
      "Día de la Madre", "Día del Padre", "Día de la Bandera",
      "Aniversario", "Día de la Marina", "Día de las Fuerzas Armadas",
      "Día de la Policía", "Día de la Educación", "Día de la Salud",
      "Día del Médico", "Día del Enfermero", "Día de la Mujer", "Día del Niño"
    ];
    for (let i = 0; i < 20; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + (i * 30)); // Cada 30 días
      
      await (prisma as any).diasNoLaborables.create({
        data: {
          fecha,
          motivo: motivos[i % motivos.length]
        }
      });
    }
    console.log(`✅ 20 días no laborables creados\n`);

    // 19. NOTAS DE EVOLUCIÓN (20) - Requiere historias clínicas
    console.log("1️⃣9️⃣ Creando 20 notas de evolución...");
    const tiposNota = ["evolucion", "interconsulta", "epicrisis"];
    for (let i = 0; i < 20; i++) {
      const historia = historias[i % historias.length];
      const usuario = usuarios.find(u => u.rol === "doctor") || usuarios[1];
      
      await (prisma as any).notasEvolucion.create({
        data: {
          historia_clinica_id: historia.id,
          tipo: tiposNota[i % tiposNota.length],
          contenido: `Nota de evolución ${i + 1}: El paciente presenta evolución favorable.`,
          usuario_id: usuario.id
        }
      });
    }
    console.log(`✅ 20 notas de evolución creadas\n`);

    // 20. ANTECEDENTES LABORALES (20) - Requiere pacientes y empresas
    console.log("2️⃣0️⃣ Creando 20 antecedentes laborales...");
    for (let i = 0; i < 20; i++) {
      const paciente = pacientes[i % pacientes.length];
      const empresa = empresasCreadas[i % empresasCreadas.length];
      const fechaInicio = new Date();
      fechaInicio.setFullYear(fechaInicio.getFullYear() - (i % 5 + 1));
      
      await (prisma as any).antecedentesLaborales.create({
        data: {
          paciente_id: paciente.id,
          empresa_id: empresa.id,
          puesto_trabajo: `Puesto ${i + 1}`,
          area_trabajo: `Área ${i + 1}`,
          fecha_inicio: fechaInicio,
          fecha_fin: i % 2 === 0 ? null : new Date(),
          riesgos_fisicos: ["Ruido", "Vibraciones"],
          riesgos_quimicos: i % 2 === 0 ? ["Productos químicos"] : undefined,
          riesgos_biologicos: i % 3 === 0 ? ["Agentes biológicos"] : undefined,
          riesgos_ergonomicos: ["Posturas forzadas"],
          riesgos_psicosociales: i % 2 === 0 ? ["Estrés laboral"] : undefined,
          epp_utilizado: ["Casco", "Guantes", "Lentes"],
          accidentes_laborales: i % 4 === 0 ? [{ fecha: "2023-01-15", descripcion: "Accidente menor" }] : [],
          enfermedades_laborales: i % 5 === 0 ? [{ fecha: "2023-06-20", descripcion: "Enfermedad ocupacional" }] : [],
          observaciones: `Observaciones para antecedente ${i + 1}`
        }
      });
    }
    console.log(`✅ 20 antecedentes laborales creados\n`);

    // 21. EXÁMENES ESPECIALIZADOS (20) - Requiere admisiones
    console.log("2️⃣1️⃣ Creando 20 exámenes especializados...");
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const realizadoPor = usuarios.find(u => u.rol === "doctor") || usuarios[1];
      
      await (prisma as any).examenesEspecializados.create({
        data: {
          admision_id: admision.id,
          tipo: `Examen Especializado ${i + 1}`,
          resultado: {
            parametro1: 10 + i,
            parametro2: 20 + i,
            observaciones: `Resultado del examen ${i + 1}`
          },
          realizado_por: realizadoPor.id,
          fecha_realizacion: new Date()
        }
      });
    }
    console.log(`✅ 20 exámenes especializados creados\n`);

    // 22. ADJUNTOS DE HISTORIA CLÍNICA (20) - Requiere historias clínicas
    console.log("2️⃣2️⃣ Creando 20 adjuntos de historia clínica...");
    for (let i = 0; i < 20; i++) {
      const historia = historias[i % historias.length];
      const subidoPor = usuarios.find((u: any) => u.rol === "doctor") || usuarios[1];
      const contenido = Buffer.from(`Contenido del adjunto ${i + 1}`);
      // Generar hash SHA256 válido de exactamente 64 caracteres hexadecimales
      const hashValue = `b${String(i).padStart(2, "0")}${"0".repeat(61)}`.substring(0, 64);
      
      await (prisma as any).adjuntosHistoriaClinica.create({
        data: {
          historia_clinica_id: historia.id,
          tipo: `tipo_adjunto_${i + 1}`,
          nombre_archivo: `adjunto_${i + 1}.pdf`,
          mime_type: "application/pdf",
          tamano: contenido.length,
          contenido,
          hash_sha256: hashValue,
          subido_por: subidoPor.id
        }
      });
    }
    console.log(`✅ 20 adjuntos de historia clínica creados\n`);

    // 23. SEGUIMIENTO LOGÍSTICO (20) - Requiere admisiones
    console.log("2️⃣3️⃣ Creando 20 seguimientos logísticos...");
    const estadosLogisticos = ["programado", "en_transito", "en_proceso", "completado", "cancelado"];
    for (let i = 0; i < 20; i++) {
      const admision = admisiones[i % admisiones.length];
      const usuario = usuarios[i % usuarios.length];
      
      await (prisma as any).seguimientoLogistico.create({
        data: {
          admision_id: admision.id,
          estado: estadosLogisticos[i % estadosLogisticos.length],
          ubicacion: `Ubicación ${i + 1}`,
          mensaje: `Mensaje de seguimiento ${i + 1}`,
          usuario_id: usuario.id
        }
      });
    }
    console.log(`✅ 20 seguimientos logísticos creados\n`);

    console.log("\n✅✅✅ SEED COMPLETO EXITOSAMENTE! ✅✅✅\n");
    console.log("📊 Resumen de datos creados:");
    console.log(`   👥 Usuarios: 20`);
    console.log(`   🏢 Empresas: 20`);
    console.log(`   👤 Pacientes: 20`);
    console.log(`   📋 Admisiones: 20`);
    console.log(`   📝 Historias Clínicas: 20`);
    console.log(`   🔬 Exámenes de Laboratorio: 20`);
    console.log(`   ✅ Conceptos de Aptitud: 20`);
    console.log(`   💰 Facturas: 20`);
    console.log(`   📦 Items de Inventario: 20`);
    console.log(`   📊 Movimientos de Inventario: 20`);
    console.log(`   📄 Documentos de Admisión: 20`);
    console.log(`   ⚙️ Configuración de Clínica: 1`);
    console.log(`   📋 Plantillas de Documentos: 20`);
    console.log(`   🔌 Integraciones Externas: 20`);
    console.log(`   📝 Logs de Auditoría: 20`);
    console.log(`   📅 Días No Laborables: 20`);
    console.log(`   📝 Notas de Evolución: 20`);
    console.log(`   💼 Antecedentes Laborales: 20`);
    console.log(`   🔬 Exámenes Especializados: 20`);
    console.log(`   📎 Adjuntos de Historia Clínica: 20`);
    console.log(`   📦 Seguimientos Logísticos: 20`);
    console.log(`   ⚙️ Tipos de Examen: 20`);
    console.log(`   ⏰ Configuraciones de Turnos: 20`);
    console.log(`\n🎉 Total: 421 registros creados!`);

  } catch (error) {
    console.error("❌ Error durante el seed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Error fatal en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

