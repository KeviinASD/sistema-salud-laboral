import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import logoImage from "../img/logo.jpg";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@saludlaboral.pe");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", r.data.token);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Imagen de fondo para toda la pantalla */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={"https://i.pinimg.com/1200x/9b/b8/0b/9bb80b04cce10bfb946d3fd60152ec53.jpg"}
          alt="Sistema de Salud Laboral"
          className="w-full h-full object-cover"
        />
        {/* Overlay gradiente sutil para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-transparent to-white/95 dark:to-gray-900/95"></div>
      </div>

      {/* Contenedor principal con dos columnas */}
      <div className="relative z-10 w-full flex">
        {/* Sección izquierda - Información (visible en desktop) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center items-start p-12 xl:p-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-3 mb-6 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
              <div className="p-2 bg-white/20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm tracking-wide">SISTEMA PROFESIONAL</span>
            </div>
            
            <h1 className="text-5xl xl:text-6xl font-bold mb-6 text-white leading-tight" style={{ textShadow: '2px 2px 12px rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)' }}>
              Sistema de Salud Laboral
            </h1>
            <p className="text-xl xl:text-2xl text-white mb-12 leading-relaxed font-light" style={{ textShadow: '1px 1px 6px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)' }}>
              Gestión integral de salud ocupacional y exámenes médicos con tecnología de vanguardia
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 group">
                <div className="p-2 bg-blue-500/30 rounded-lg group-hover:bg-blue-500/50 transition-colors">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Gestión de Admisiones</h3>
                  <p className="text-white/90 text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>Control completo del proceso de admisión de pacientes</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 group">
                <div className="p-2 bg-green-500/30 rounded-lg group-hover:bg-green-500/50 transition-colors">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Historia Clínica Digital</h3>
                  <p className="text-white/90 text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>Registros médicos electrónicos seguros y accesibles</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/30 hover:bg-white/20 transition-all duration-300 group">
                <div className="p-2 bg-purple-500/30 rounded-lg group-hover:bg-purple-500/50 transition-colors">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Reportes y Análisis</h3>
                  <p className="text-white/90 text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>Estadísticas en tiempo real y reportes personalizados</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección derecha - Formulario con fondo semitransparente */}
        <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col justify-center min-h-screen px-6 sm:px-8 lg:px-12 xl:px-16 py-12">
          <div className="w-full max-w-md mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 lg:p-10 border border-gray-200/50 dark:border-gray-700/50">
            {/* Logo y título para móvil */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Sistema de Salud Laboral
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gestión profesional de salud ocupacional
              </p>
            </div>

            {/* Encabezado del formulario */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t("common.login") || "Bienvenido"}
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={submit} className="space-y-6">
              {/* Campo Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="tu@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 text-base"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    {t("common.login") || "Iniciar Sesión"}
                    <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Sistema de Salud Laboral. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
