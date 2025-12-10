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
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sección izquierda - Imagen */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden h-screen">
        <img
          src={logoImage}
          alt="Sistema de Salud Laboral"
          className="w-full h-full object-cover"
        />
        {/* Overlay oscuro para mejor contraste */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/85 via-blue-900/80 to-cyan-900/85"></div>
        {/* Overlay adicional para el texto */}
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 text-white z-10">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-2xl" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}>
              Sistema de Salud Laboral
            </h1>
            <p className="text-xl text-white mb-8 font-medium" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)' }}>
              Gestión integral de salud ocupacional y exámenes médicos
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-medium" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Gestión de admisiones</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-medium" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Historia clínica digital</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-medium" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Reportes y análisis</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección derecha - Formulario */}
      <div className="flex-1 flex flex-col justify-center h-screen overflow-y-auto px-4 sm:px-6 lg:px-12 xl:px-16 bg-white dark:bg-gray-800">
        <div className="mx-auto w-full max-w-md py-8">
          {/* Logo para móvil */}
          <div className="lg:hidden mb-6 text-center">
            <div className="inline-block p-3 bg-indigo-600 rounded-2xl mb-3">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Sistema de Salud Laboral
            </h1>
          </div>

          {/* Encabezado del formulario */}
          <div className="mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("common.login") || "Bienvenido"}
            </h2>
            <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={submit} className="space-y-5">
            {/* Campo Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out sm:text-sm"
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out sm:text-sm"
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
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
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
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
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
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Sistema de Salud Laboral. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
