/**
 * Crea un intent de pago usando Stripe u otra pasarela
 * Requiere configurar STRIPE_SECRET_KEY en .env para usar Stripe
 */
export async function createPaymentIntent(amount: number, currency: string, description: string, metadata?: any) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  // Si está configurado Stripe, usarlo
  if (stripeSecretKey) {
    try {
      // Importar Stripe dinámicamente para evitar errores si no está instalado
      let stripe;
      try {
        stripe = require('stripe')(stripeSecretKey);
      } catch (importError) {
        console.warn("Stripe no está instalado. Instala con: npm install stripe");
        // Continuar con modo simulación
        return { 
          id: `sim_${Date.now()}`,
          amount, 
          currency, 
          description,
          ok: true,
          simulated: true
        };
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // amount en centavos
        currency: currency.toLowerCase(),
        description: description,
        metadata: metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        ok: true
      };
    } catch (error: any) {
      console.error("Error creando payment intent con Stripe:", error);
      return { 
        ok: false, 
        error: error.message || "Error al crear payment intent" 
      };
    }
  }

  // Si hay otra pasarela configurada
  const base = process.env.PAYMENTS_API_URL || "";
  const token = process.env.PAYMENTS_API_TOKEN || "";
  
  if (!base) {
    // Modo simulación - devolver datos básicos
    return { 
      id: `sim_${Date.now()}`,
      amount, 
      currency, 
      description,
      ok: true,
      simulated: true
    };
  }

  const r = await fetch(`${base}/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount, currency, description, metadata })
  });
  
  try {
    const data = await r.json();
    return data;
  } catch {
    return { ok: r.ok };
  }
}

/**
 * Confirma un pago procesado
 */
export async function confirmPayment(paymentIntentId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (stripeSecretKey) {
    try {
      let stripe;
      try {
        stripe = require('stripe')(stripeSecretKey);
      } catch (importError) {
        console.warn("Stripe no está instalado");
        return { ok: true, simulated: true };
      }
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        ok: paymentIntent.status === 'succeeded'
      };
    } catch (error: any) {
      console.error("Error confirmando pago con Stripe:", error);
      return { ok: false, error: error.message };
    }
  }
  
  return { ok: true };
}
