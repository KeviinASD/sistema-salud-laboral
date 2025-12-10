import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";

interface Admission {
  id: string;
  paciente: {
    usuario: {
      nombres: string;
      apellidos: string;
      dni: string;
    };
  };
  empresa?: {
    razon_social: string;
  };
  tipo_examen: string;
  estado: string;
  fecha_programada: string;
  medico?: {
    nombres: string;
    apellidos: string;
  };
}

interface AdmissionStats {
  hoy: number;
  estaSemana: number;
  esteMes: number;
  esteAno: number;
  programadas: number;
  confirmadas: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
  total: number;
  porTipoExamen: Array<{ tipo: string; cantidad: number }>;
  porEmpresa: Array<{ empresa: string; cantidad: number }>;
  admisionesMensuales: Array<{ mes: string; cantidad: number }>;
  proximasCitas: Array<{
    id: string;
    paciente: string;
    dni: string;
    empresa: string;
    tipoExamen: string;
    fecha: string;
    estado: string;
  }>;
  admisionesRecientes: Array<{
    id: string;
    paciente: string;
    dni: string;
    empresa: string;
    tipoExamen: string;
    fecha: string;
    estado: string;
    createdAt: string;
  }>;
}

export default function Admissions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("estadisticas");
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, admissionsRes] = await Promise.all([
        api.get("/admissions/stats"),
        api.get(`/admissions?page=${currentPage}&limit=10`)
      ]);

      setStats(statsRes.data);
      setAdmissions(admissionsRes.data.data || []);
      setTotalPages(admissionsRes.data.meta?.totalPages || 1);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmissions = admissions.filter(admission => {
    const matchesSearch = !searchQuery ||
      admission.paciente.usuario.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admission.paciente.usuario.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admission.paciente.usuario.dni.includes(searchQuery);
    
    const matchesStatus = !filterStatus || admission.estado === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (estado: string) => {
    const colors: { [key: string]: string } = {
      programado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      confirmado: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      en_proceso: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      completado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    };
    return colors[estado] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };

  const getStatusLabel = (estado: string) => {
    const labels: { [key: string]: string } = {
      programado: t("admissions.programado"),
      confirmado: t("admissions.confirmado"),
      en_proceso: t("admissions.en_proceso"),
      completado: t("admissions.completado"),
      cancelado: t("admissions.cancelado")
    };
    return labels[estado] || estado;
  };

  const tabs = [
    { id: "estadisticas", label: "Estadísticas" },
    { id: "lista", label: "Lista" }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
                {t("admissions.title")}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t("admissions.subtitle")}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button
                onClick={() => navigate("/admisiones/calendario")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                📅 {t("admissions.calendar")}
              </button>
              <button
                onClick={() => navigate("/admisiones/empresas")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                🏢 {t("admissions.companies")}
              </button>
              <button
                onClick={() => navigate("/admisiones/nueva")}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                ➕ {t("admissions.newAdmission")}
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            {/* Pestaña: Estadísticas */}
            {activeTab === "estadisticas" && (
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando estadísticas...</p>
                  </div>
                ) : !stats ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
                  </div>
                ) : (
                  <>
                    {/* Tarjetas principales */}
                    <div className="mb-8">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">
                        Resumen General
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-lg p-6 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Hoy</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.hoy}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Admisiones</p>
                            </div>
                            <div className="bg-blue-500 rounded-lg p-3">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl shadow-lg p-6 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Esta Semana</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.estaSemana}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Admisiones</p>
                </div>
                            <div className="bg-purple-500 rounded-lg p-3">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                </div>
              </div>
            </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-lg p-6 border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Este Mes</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.esteMes}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Admisiones</p>
                </div>
                            <div className="bg-green-500 rounded-lg p-3">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                </div>
              </div>
            </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl shadow-lg p-6 border border-indigo-200 dark:border-indigo-800">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Total</p>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Admisiones</p>
                            </div>
                            <div className="bg-indigo-500 rounded-lg p-3">
                              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                </div>
                </div>
              </div>
            </div>

                    {/* Estados de admisiones */}
                    <div className="mb-8">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">
                        Por Estado
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full mb-2">
                              <span className="text-xl">📅</span>
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Programadas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.programadas}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full mb-2">
                              <span className="text-xl">✓</span>
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confirmadas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.confirmadas}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full mb-2">
                              <span className="text-xl">⚙️</span>
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Proceso</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.enProceso}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full mb-2">
                              <span className="text-xl">✅</span>
                            </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completadas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.completadas}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full mb-2">
                              <span className="text-xl">❌</span>
                </div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Canceladas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.canceladas}</p>
                </div>
              </div>
            </div>
                    </div>

                    {/* Distribuciones */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      {/* Por tipo de examen */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Por Tipo de Examen (Top 5)
                        </h4>
                        {stats.porTipoExamen.length > 0 ? (
                          <div className="space-y-3">
                            {stats.porTipoExamen.map((item, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {item.tipo}
                                  </p>
                                  <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full"
                                      style={{
                                        width: `${(item.cantidad / stats.total) * 100}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="ml-4 text-right">
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.cantidad}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {((item.cantidad / stats.total) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay datos disponibles</p>
                        )}
                      </div>

                      {/* Por empresa */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Por Empresa (Top 5)
                        </h4>
                        {stats.porEmpresa.length > 0 ? (
                          <div className="space-y-3">
                            {stats.porEmpresa.map((item, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {item.empresa}
                                  </p>
                                  <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className="bg-green-600 dark:bg-green-500 h-2 rounded-full"
                                      style={{
                                        width: `${(item.cantidad / stats.total) * 100}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="ml-4 text-right">
                                  <p className="text-lg font-bold text-gray-900 dark:text-white">{item.cantidad}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {((item.cantidad / stats.total) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay datos disponibles</p>
                        )}
                      </div>
                    </div>

                    {/* Próximas citas y admisiones recientes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Próximas citas */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Próximas Citas (7 días)
                        </h4>
                        {stats.proximasCitas.length > 0 ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {stats.proximasCitas.map((cita) => (
                              <div
                                key={cita.id}
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                                onClick={() => navigate(`/admisiones/${cita.id}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {cita.paciente}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {cita.empresa} • {cita.tipoExamen}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {new Date(cita.fecha).toLocaleDateString("es-PE", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </p>
                                  </div>
                                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cita.estado)}`}>
                                    {getStatusLabel(cita.estado)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay citas próximas</p>
                        )}
                      </div>

                      {/* Admisiones recientes */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Admisiones Recientes
                        </h4>
                        {stats.admisionesRecientes.length > 0 ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {stats.admisionesRecientes.map((adm) => (
                              <div
                                key={adm.id}
                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                                onClick={() => navigate(`/admisiones/${adm.id}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {adm.paciente}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {adm.empresa} • {adm.tipoExamen}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {new Date(adm.createdAt).toLocaleDateString("es-PE", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </p>
                                  </div>
                                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(adm.estado)}`}>
                                    {getStatusLabel(adm.estado)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay admisiones recientes</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Pestaña: Lista */}
            {activeTab === "lista" && (
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">
                    Lista de Admisiones
                  </h3>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Actualizar
                  </button>
          </div>

          {/* Búsqueda y filtros */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("common.search")}</label>
                <input
                  type="text"
                  placeholder="Paciente o DNI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admissions.status")}</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t("common.all")}</option>
                  <option value="programado">{t("admissions.programado")}</option>
                  <option value="confirmado">{t("admissions.confirmado")}</option>
                  <option value="en_proceso">{t("admissions.en_proceso")}</option>
                  <option value="completado">{t("admissions.completado")}</option>
                  <option value="cancelado">{t("admissions.cancelado")}</option>
                </select>
            </div>
          </div>

            {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
              </div>
            ) : filteredAdmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">{t("common.noData")}</p>
              </div>
            ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Paciente
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Tipo de Examen
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Empresa
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Fecha Programada
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Médico
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAdmissions.map((admission) => (
                            <tr key={admission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {admission.paciente.usuario.nombres} {admission.paciente.usuario.apellidos}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  DNI: {admission.paciente.usuario.dni}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {admission.tipo_examen}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {admission.empresa?.razon_social || "N/A"}
                          </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {new Date(admission.fecha_programada).toLocaleDateString("es-PE", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                  })}
                          </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(admission.fecha_programada).toLocaleTimeString("es-PE", {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                        </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {admission.medico 
                                    ? `Dr. ${admission.medico.nombres} ${admission.medico.apellidos}`
                                    : "N/A"}
                      </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(admission.estado)}`}>
                          {getStatusLabel(admission.estado)}
                        </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => navigate(`/admisiones/${admission.id}`)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                >
                                  Ver Detalles
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

            {/* Paginación */}
            {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
