export async function createPaymentIntent(amount, currency, description, metadata) {
    const base = process.env.PAYMENTS_API_URL || "";
    const token = process.env.PAYMENTS_API_TOKEN || "";
    if (!base)
        return { amount, currency, description };
    const r = await fetch(`${base}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, currency, description, metadata })
    });
    try {
        const data = await r.json();
        return data;
    }
    catch {
        return { ok: r.ok };
    }
}
