/**
 * Valida un documento (DNI o RUC) usando la API de SUNAT
 * Requiere configurar SUNAT_API_URL y SUNAT_API_TOKEN en .env
 *
 * Proveedores compatibles:
 * - APIsPERU: https://apisperu.pe (formato: https://apisperu.pe/api/v1/{type}/{value}?token={token})
 * - Otros proveedores: formato estándar REST
 *
 * @param type - Tipo de documento: "dni" o "ruc"
 * @param value - Número del documento
 * @returns Objeto con validación y datos del documento
 */
export async function validateDocument(type, value) {
    const base = process.env.SUNAT_API_URL || "";
    const token = process.env.SUNAT_API_TOKEN || "";
    // Si no hay URL configurada, solo valida formato numérico
    if (!base) {
        return {
            valid: /^[0-9]+$/.test(value),
            message: "Validación básica (SUNAT_API_URL no configurada)"
        };
    }
    // Construir URL según el proveedor
    let url;
    if (base.includes("apisperu")) {
        // APIsPERU usa formato: /api/v1/{type}/{value}?token={token}
        url = `${base}/api/v1/${type}/${value}?token=${token}`;
    }
    else {
        // Otros proveedores usan formato estándar
        url = `${base}/validate?type=${type}&value=${value}`;
    }
    const headers = { "Content-Type": "application/json" };
    if (token && !url.includes("token=")) {
        headers.Authorization = `Bearer ${token}`;
    }
    try {
        const r = await fetch(url, { headers });
        const data = await r.json();
        return data;
    }
    catch (error) {
        console.error("Error validando documento con SUNAT:", error);
        return { valid: false, error: "Error de conexión con API SUNAT" };
    }
}
/**
 * Envía una factura electrónica a SUNAT
 * Requiere configurar SUNAT_API_URL y SUNAT_API_TOKEN en .env
 *
 * @param payload - Objeto con los datos de la factura (id, xml, etc.)
 * @returns Respuesta de SUNAT con el estado del envío
 */
export async function submitInvoiceSunat(payload) {
    const base = process.env.SUNAT_API_URL || "";
    const token = process.env.SUNAT_API_TOKEN || "";
    if (!base) {
        return {
            status: "pending",
            message: "SUNAT_API_URL no configurada - factura no enviada"
        };
    }
    const url = base.includes("apisperu")
        ? `${base}/api/v1/invoice/submit`
        : `${base}/invoice/submit`;
    const headers = {
        "Content-Type": "application/json"
    };
    if (token) {
        if (base.includes("apisperu")) {
            // APIsPERU puede usar token en query o header
            headers.Authorization = `Bearer ${token}`;
        }
        else {
            headers.Authorization = `Bearer ${token}`;
        }
    }
    try {
        const r = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        return data;
    }
    catch (error) {
        console.error("Error enviando factura a SUNAT:", error);
        return {
            ok: false,
            status: "error",
            error: "Error de conexión con API SUNAT"
        };
    }
}
