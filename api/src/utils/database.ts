import { PrismaClient } from "@prisma/client";

// Singleton pattern para evitar múltiples conexiones en desarrollo
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configuración de connection pooling
  // Limita el número de conexiones para evitar "too many clients"
  // Ajusta estos valores según tu límite de conexiones en la BD
  // Por defecto, PostgreSQL permite 100 conexiones
  // Se recomienda usar menos del 50% del límite para dejar espacio para otras apps
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Función para cerrar conexiones de forma limpia
async function disconnectPrisma() {
  await prisma.$disconnect();
  console.log('Prisma desconectado correctamente');
}

// Cerrar conexiones cuando el proceso termine
process.on('beforeExit', disconnectPrisma);
process.on('SIGINT', async () => {
  await disconnectPrisma();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});
process.on('exit', () => {
  console.log('Proceso finalizado');
});

// Capturar errores no manejados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export async function findPatientByDni(dni: string) {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM Patient WHERE dni = ${dni}`;
  return rows;
}

export async function listPatients(limit: number = 10) {
  const rows = await prisma.$queryRaw<any[]>`SELECT * FROM Patient ORDER BY createdAt DESC LIMIT ${limit}`;
  return rows;
}
