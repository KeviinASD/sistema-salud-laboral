import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // Crear usuarios del sistema usando el nuevo modelo Usuario
  const users = [
    { 
      dni: "12345678",
      email: "admin@saludlaboral.pe", 
      nombres: "Administrador", 
      apellidos: "Sistema",
      password: "Admin123!",
      rol: "admin"
    },
    { 
      dni: "23456789",
      email: "doctor@saludlaboral.pe", 
      nombres: "Dr. Juan", 
      apellidos: "Médico",
      password: "Doctor123!",
      rol: "doctor",
      especialidad: "Medicina Ocupacional",
      colegiatura: "12345"
    },
    { 
      dni: "34567890",
      email: "admissions@saludlaboral.pe", 
      nombres: "María", 
      apellidos: "Admisiones",
      password: "Admissions123!",
      rol: "admissions"
    },
    { 
      dni: "45678901",
      email: "lab@saludlaboral.pe", 
      nombres: "Carlos", 
      apellidos: "Laboratorio",
      password: "Lab123!",
      rol: "lab"
    }
  ];

  for (const u of users) {
    const exists = await (prisma as any).usuario.findUnique({ where: { email: u.email } });
    if (!exists) {
      const hash = await bcrypt.hash(u.password, 10);
      await (prisma as any).usuario.create({ 
        data: { 
          dni: u.dni,
          email: u.email, 
          nombres: u.nombres,
          apellidos: u.apellidos,
          password_hash: hash, 
          rol: u.rol,
          especialidad: u.especialidad,
          colegiatura: u.colegiatura,
          activo: true
        } 
      });
      console.log(`✅ Usuario creado: ${u.email}`);
    } else {
      console.log(`⏭️  Usuario ya existe: ${u.email}`);
    }
  }

  // Crear empresa de ejemplo
  const empresa = await (prisma as any).empresa.upsert({
    where: { ruc: "20100070970" },
    update: {},
    create: {
      ruc: "20100070970",
      razon_social: "Empresa Ejemplo S.A.C.",
      nombre_comercial: "Empresa Ejemplo",
      direccion: "Av. Ejemplo 123, Lima",
      telefono: "987654321",
      contacto_nombre: "Juan Contacto",
      contacto_email: "contacto@empresa.com",
      activo: true
    }
  });
  console.log(`✅ Empresa creada: ${empresa.razon_social}`);

  // Crear paciente de ejemplo
  const usuarioPaciente = await (prisma as any).usuario.findUnique({ where: { email: "paciente@saludlaboral.pe" } });
  let usuarioPacienteId = usuarioPaciente?.id;

  if (!usuarioPaciente) {
    const hashPaciente = await bcrypt.hash("Paciente123!", 10);
    const nuevoUsuario = await (prisma as any).usuario.create({
      data: {
        dni: "56789012",
        email: "paciente@saludlaboral.pe",
        nombres: "Juan",
        apellidos: "Pérez",
        password_hash: hashPaciente,
        rol: "patient",
        activo: true
      }
    });
    usuarioPacienteId = nuevoUsuario.id;
    console.log(`✅ Usuario paciente creado: paciente@saludlaboral.pe`);
  }

  if (usuarioPacienteId) {
    const paciente = await (prisma as any).paciente.upsert({
      where: { usuario_id: usuarioPacienteId },
      update: {},
      create: {
        usuario_id: usuarioPacienteId,
        empresa_id: empresa.id,
        tipo_sangre: "O+",
        alergias: "Ninguna",
        medicamentos_actuales: "Ninguno"
      }
    });
    console.log(`✅ Paciente creado para: ${usuarioPaciente?.nombres || "Juan"} ${usuarioPaciente?.apellidos || "Pérez"}`);
  }

  console.log("\n✅ Seed completado exitosamente!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   👤 Admin: admin@saludlaboral.pe / Admin123!");
  console.log("   👨‍⚕️ Doctor: doctor@saludlaboral.pe / Doctor123!");
  console.log("   📋 Admisiones: admissions@saludlaboral.pe / Admissions123!");
  console.log("   🔬 Laboratorio: lab@saludlaboral.pe / Lab123!");
  console.log("   👤 Paciente: paciente@saludlaboral.pe / Paciente123!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
