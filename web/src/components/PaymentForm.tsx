import React, { useState, useEffect } from "react";
import { api } from "../api";

interface PaymentFormProps {
  facturaId: string;
  amount: number;
  metodoPago: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onManualPayment?: (transaccionId: string) => void;
}

// Componente de simulación de pasarela de pagos
function SimulatedPaymentForm({ facturaId, amount, metodoPago, onSuccess, onError, onManualPayment }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    setCardExpiry(formatted);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length <= 4) {
      setCardCvv(v);
    }
  };

  const validateForm = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      setErrorMessage("Número de tarjeta inválido");
      return false;
    }
    if (!cardName || cardName.trim().length < 3) {
      setErrorMessage("Nombre del titular es requerido");
      return false;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setErrorMessage("Fecha de expiración inválida");
      return false;
    }
    if (!cardCvv || cardCvv.length < 3) {
      setErrorMessage("CVV inválido");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setProcessing(true);

    // Simular procesamiento de pago (delay de 2 segundos)
    setTimeout(async () => {
      try {
        // Crear payment intent simulado
        const paymentIntentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Registrar el pago en el backend
        if (onManualPayment) {
          await onManualPayment(paymentIntentId);
        } else {
          const response = await api.post("/facturacion/pagos", {
            factura_id: facturaId,
            monto: amount,
            metodo_pago: metodoPago,
            payment_intent_id: paymentIntentId,
            transaccion_id: paymentIntentId
          });
          onSuccess(response.data.id || facturaId);
        }
        setProcessing(false);
      } catch (error: any) {
        console.error("Error procesando pago:", error);
        onError(error.response?.data?.error || "Error al procesar el pago");
        setProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <svg className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Pago seguro y encriptado. Tus datos están protegidos.</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
        <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datos de la Tarjeta
          </label>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Número de Tarjeta
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="Ingrese los 16 dígitos"
                maxLength={19}
                autoComplete="off"
                name="payment-number"
                data-payment-field="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={processing}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Nombre del Titular
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                placeholder="Nombre completo"
                autoComplete="off"
                name="payment-name"
                data-payment-field="name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={processing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Fecha de Expiración
                </label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="Mes / Año"
                  maxLength={5}
                  autoComplete="off"
                  name="payment-expiry"
                  data-payment-field="expiry"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={processing}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Código de Seguridad
                </label>
                <input
                  type="text"
                  value={cardCvv}
                  onChange={handleCvvChange}
                  placeholder="3 dígitos"
                  maxLength={4}
                  autoComplete="off"
                  name="payment-code"
                  data-payment-field="code"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={processing}
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total a Pagar:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              S/ {amount.toFixed(2)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={processing}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
        >
          {processing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Procesando pago...
            </>
          ) : (
            `Pagar S/ ${amount.toFixed(2)}`
          )}
        </button>

        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Procesado por pasarela de pagos segura</span>
        </div>
      </form>
    </div>
  );
}

// Componente para pago manual cuando no se usa tarjeta
function ManualPaymentForm({ facturaId, amount, metodoPago, onSuccess, onError, onManualPayment }: PaymentFormProps) {
  const [transaccionId, setTransaccionId] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      if (onManualPayment) {
        onManualPayment(transaccionId);
      } else {
        const response = await api.post("/facturacion/pagos", {
          factura_id: facturaId,
          monto: amount,
          metodo_pago: metodoPago,
          transaccion_id: transaccionId || `manual_${Date.now()}`
        });
        onSuccess(response.data.id || facturaId);
      }
    } catch (error: any) {
      onError(error.response?.data?.error || "Error al procesar el pago");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número de Transacción / Referencia
          </label>
          <input
            type="text"
            value={transaccionId}
            onChange={(e) => setTransaccionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ingrese el número de transacción"
            required
          />
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total a Pagar:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              S/ {amount.toFixed(2)}
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={processing}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {processing ? "Procesando..." : `Registrar Pago S/ ${amount.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  // Si es tarjeta, mostrar formulario simulado
  // Si no, mostrar formulario manual
  if (props.metodoPago === "tarjeta") {
    return <SimulatedPaymentForm {...props} />;
  }

  return <ManualPaymentForm {...props} />;
}
