export async function sendSms(to, message) {
    const url = process.env.SMS_API_URL || "";
    const token = process.env.SMS_API_TOKEN || "";
    const apiKey = process.env.SMS_API_KEY || "";
    if (!url) {
        console.log(`[SMS SIMULADO] Para: ${to}, Mensaje: ${message}`);
        return { ok: true, messageId: "simulated" };
    }
    try {
        const headers = { "Content-Type": "application/json" };
        if (token)
            headers.Authorization = `Bearer ${token}`;
        if (apiKey)
            headers["X-API-Key"] = apiKey;
        const body = { to, message };
        if (process.env.SMS_PROVIDER === "twilio") {
            body.from = process.env.SMS_FROM || "+1234567890";
        }
        const r = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });
        try {
            const data = await r.json();
            return data;
        }
        catch {
            return { ok: r.ok, status: r.status };
        }
    }
    catch (error) {
        console.error("Error enviando SMS:", error);
        return { ok: false, error: String(error) };
    }
}
