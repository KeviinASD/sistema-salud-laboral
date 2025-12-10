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
export async function validateDocument(type: "dni" | "ruc", value: string) {
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
  let url: string;
  if (base.includes("apisperu")) {
    // APIsPERU usa formato: /api/v1/{type}/{value}?token={token}
    url = `${base}/api/v1/${type}/${value}?token=${token}`;
  } else {
    // Otros proveedores usan formato estándar
    url = `${base}/validate?type=${type}&value=${value}`;
  }
  
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token && !url.includes("token=")) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const r = await fetch(url, { headers });
    const data = await r.json();
    return data;
  } catch (error) {
    console.error("Error validando documento con SUNAT:", error);
    return { valid: false, error: "Error de conexión con API SUNAT" };
  }
}

/**
 * Envía una factura electrónica a SUNAT
 * Requiere configurar SUNAT_API_URL y SUNAT_API_TOKEN en .env
 * Para APISUNAT también requiere SUNAT_PERSONA_ID
 * 
 * @param payload - Objeto con los datos de la factura (id, xml, etc.)
 * @returns Respuesta de SUNAT con el estado del envío
 */
export async function submitInvoiceSunat(payload: any) {
  const base = process.env.SUNAT_API_URL || "";
  const token = process.env.SUNAT_API_TOKEN || "";
  const personaId = process.env.SUNAT_PERSONA_ID || "";
  
  if (!base) {
    return { 
      status: "pending", 
      message: "SUNAT_API_URL no configurada - factura no enviada" 
    };
  }
  
  // Determinar URL y formato según el proveedor
  let url: string;
  let headers: HeadersInit = { 
    "Content-Type": "application/json"
  };
  let requestBody: any = payload;
  
  if (base.includes("apisunat") || base.includes("apisunat.com")) {
    // APISUNAT usa formato específico
    // URL típica: https://apisunat.com/api/v1/documents
    url = base.includes("/api/") ? `${base}/documents` : `${base}/api/v1/documents`;
    
    // APISUNAT requiere personaId y token en headers o body
    if (personaId) {
      headers["X-Persona-Id"] = personaId;
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Formatear payload para APISUNAT
    requestBody = {
      tipoComprobante: payload.tipo_comprobante || "03", // 01=Factura, 03=Boleta
      serie: payload.numero_serie || "B001",
      numero: payload.numero_correlativo,
      xml: payload.xml,
      ...(personaId && { personaId })
    };
  } else if (base.includes("apisperu")) {
    // APIsPERU
    url = `${base}/api/v1/invoice/submit`;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } else {
    // Otros proveedores (formato estándar)
    url = `${base}/invoice/submit`;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  
  try {
    console.log(`Enviando factura a SUNAT: ${url}`);
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Body (sin XML):", JSON.stringify({ ...requestBody, xml: requestBody.xml ? "[XML oculto]" : undefined }, null, 2));
    
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!r.ok) {
      const errorText = await r.text();
      console.error(`Error HTTP ${r.status} de SUNAT:`, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      return { 
        ok: false, 
        status: "error",
        error: errorData.message || errorData.error || `Error HTTP ${r.status}: ${errorText}`,
        details: errorData
      };
    }
    
    const data = await r.json();
    console.log("Respuesta de SUNAT recibida:", JSON.stringify(data, null, 2));
    return data;
  } catch (error: any) {
    console.error("Error enviando factura a SUNAT:", error);
    return { 
      ok: false, 
      status: "error",
      error: error.message || "Error de conexión con API SUNAT" 
    };
  }
}
