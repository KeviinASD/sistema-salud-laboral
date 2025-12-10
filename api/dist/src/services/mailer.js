import nodemailer from "nodemailer";
const host = process.env.SMTP_HOST || "";
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || "";
const from = process.env.EMAIL_FROM || "no-reply@saludlaboral.pe";
let transporter = null;
if (host && user && pass) {
    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}
else {
    console.warn("SMTP no configurado. Los emails no se enviarán.");
}
export async function sendEmail(to, subject, text, html) {
    if (!transporter) {
        console.log(`[EMAIL SIMULADO] Para: ${to}, Asunto: ${subject}`);
        return { messageId: "simulated", accepted: [to] };
    }
    try {
        const info = await transporter.sendMail({
            from: `"Sistema de Salud Laboral" <${from}>`,
            to,
            subject,
            text,
            html
        });
        return info;
    }
    catch (error) {
        console.error("Error enviando email:", error);
        throw error;
    }
}
