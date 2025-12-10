import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

export default function Biometric() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [mode, setMode] = useState<"register" | "verify">("verify");
  const [dni, setDni] = useState("");
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Simulación de captura biométrica
      // En producción, esto se conectaría con el dispositivo real
      const template_huella = "simulated_template_" + Date.now();
      
      await api.post("/biometric/register", {
        paciente_id: patientId,
        template_huella,
        template_facial: null
      });
      
      showSuccess("Registro biométrico completado exitosamente");
      setPatientId("");
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al registrar biométrico");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      // Simulación de verificación biométrica
      const template_huella = "simulated_template_" + Date.now();
      
      const res = await api.post("/biometric/verify", {
        template_huella,
        template_facial: null,
        paciente_id: dni ? null : undefined
      });
      
      if (res.data.verified) {
        setResult({
          verified: true,
          paciente: res.data.paciente,
          confidence: res.data.confidence
        });
      } else {
        setResult({ verified: false });
      }
    } catch (error: any) {
      setResult({ verified: false, error: error.response?.data?.error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Identificación Biométrica</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Registro y verificación de identidad mediante huella dactilar</p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => {
                    setMode("verify");
                    setResult(null);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    mode === "verify"
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Verificación
                </button>
                <button
                  onClick={() => {
                    setMode("register");
                    setResult(null);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    mode === "register"
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  Registro
                </button>
              </nav>
            </div>
          </div>

          {/* Verificación */}
          {mode === "verify" && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Verificar Identidad</h3>
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    DNI (opcional - para búsqueda específica)
                  </label>
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ingrese DNI si desea verificar un paciente específico"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Instrucciones:</strong> Coloque su dedo en el lector biométrico. El sistema verificará su identidad automáticamente.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                >
                  {loading ? "Verificando..." : "Iniciar Verificación"}
                </button>
              </form>

              {result && (
                <div className={`mt-6 p-4 rounded-lg ${
                  result.verified 
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}>
                  {result.verified ? (
                    <div>
                      <h4 className="text-lg font-medium text-green-900 dark:text-green-300 mb-2">✓ Verificación Exitosa</h4>
                      {result.paciente && (
                        <div className="space-y-2">
                          <p className="text-sm text-green-800 dark:text-green-300">
                            <strong>Paciente:</strong> {result.paciente.usuario?.nombres} {result.paciente.usuario?.apellidos}
                          </p>
                          <p className="text-sm text-green-800 dark:text-green-300">
                            <strong>DNI:</strong> {result.paciente.usuario?.dni}
                          </p>
                          {result.confidence && (
                            <p className="text-sm text-green-800 dark:text-green-300">
                              <strong>Confianza:</strong> {(result.confidence * 100).toFixed(2)}%
                            </p>
                          )}
                          <button
                            onClick={() => navigate(`/admisiones?dni=${result.paciente.usuario?.dni}`)}
                            className="mt-3 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600"
                          >
                            Ver Admisiones
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-medium text-red-900 dark:text-red-300 mb-2">✗ Verificación Fallida</h4>
                      <p className="text-sm text-red-800 dark:text-red-300">
                        No se pudo verificar la identidad. Por favor, intente nuevamente o registre su huella dactilar.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Registro */}
          {mode === "register" && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Registrar Huella Dactilar</h3>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID del Paciente *
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    required
                    placeholder="Ingrese el ID del paciente a registrar"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Puede buscar el paciente en Admisiones y copiar su ID
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Instrucciones:</strong>
                  </p>
                  <ol className="list-decimal list-inside mt-2 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>Coloque su dedo en el lector biométrico</li>
                    <li>Mantenga el dedo firme y sin movimiento</li>
                    <li>Espere a que el sistema capture la huella</li>
                    <li>Repita el proceso si es necesario</li>
                  </ol>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? "Registrando..." : "Iniciar Registro"}
                </button>
              </form>
            </div>
          )}

          {/* Información del Sistema */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sobre el Sistema Biométrico</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• El sistema utiliza tecnología de reconocimiento de huella dactilar</li>
              <li>• Las huellas se almacenan de forma segura y encriptada</li>
              <li>• Cumple con los estándares de seguridad y privacidad</li>
              <li>• Permite identificación rápida y precisa de pacientes</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

