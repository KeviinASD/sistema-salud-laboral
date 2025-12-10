export async function enrollBiometric(patientId: string, templates?: { template_huella?: string; template_facial?: string }) {
  const base = process.env.BIOMETRIC_API_URL || "";
  const token = process.env.BIOMETRIC_API_TOKEN || "";
  if (!base) return { patientId, status: "enrolled" };
  const r = await fetch(`${base}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ patientId, ...templates })
  });
  try {
    const data = await r.json();
    return data;
  } catch {
    return { ok: r.ok };
  }
}

export async function verifyBiometric(patientId: string | null, templates?: { template_huella?: string; template_facial?: string }) {
  const base = process.env.BIOMETRIC_API_URL || "";
  const token = process.env.BIOMETRIC_API_TOKEN || "";
  if (!base) return { verified: patientId !== null, paciente_id: patientId, confidence: 1.0 };
  const r = await fetch(`${base}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ patientId, ...templates })
  });
  try {
    const data = await r.json();
    return data;
  } catch {
    return { verified: r.ok, paciente_id: patientId, confidence: 0.5 };
  }
}
