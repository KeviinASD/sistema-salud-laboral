import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
    const users = [
        { email: "admin@saludlaboral.pe", name: "Administrador", role: "ADMIN", password: "Admin123!" },
        { email: "doctor@saludlaboral.pe", name: "Médico", role: "DOCTOR", password: "Doctor123!" },
        { email: "admissions@saludlaboral.pe", name: "Admisiones", role: "ADMISSIONS", password: "Admissions123!" },
        { email: "paciente@saludlaboral.pe", name: "Paciente", role: "PATIENT", password: "Paciente123!" }
    ];
    for (const u of users) {
        const exists = await prisma.user.findUnique({ where: { email: u.email } });
        if (!exists) {
            const hash = await bcrypt.hash(u.password, 10);
            await prisma.user.create({ data: { email: u.email, name: u.name, role: u.role, password: hash } });
        }
    }
    const patient = await prisma.patient.upsert({
        where: { dni: "00000000" },
        update: {},
        create: {
            dni: "00000000",
            firstName: "Juan",
            lastName: "Pérez",
            birthDate: new Date("1990-01-01"),
            gender: "M",
            email: "paciente@saludlaboral.pe"
        }
    });
    await prisma.appointment.create({
        data: { patientId: patient.id, date: new Date(), status: "programada" }
    });
}
main().finally(async () => {
    await prisma.$disconnect();
});
