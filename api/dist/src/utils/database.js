import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export async function findPatientByDni(dni) {
    const rows = await prisma.$queryRaw `SELECT * FROM Patient WHERE dni = ${dni}`;
    return rows;
}
export async function listPatients(limit = 10) {
    const rows = await prisma.$queryRaw `SELECT * FROM Patient ORDER BY createdAt DESC LIMIT ${limit}`;
    return rows;
}
