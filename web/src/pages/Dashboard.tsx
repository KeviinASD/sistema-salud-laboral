import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  totalPacientes: number;
  totalAdmisiones: number;
  admisionesMes: number;
  conceptosEmitidos: number;
  facturasMes: number;
  ingresosMes: number;
  examenesPendientes: number;
  admisionesHoy?: number;
  admisionesProgramadas?: number;
  admisionesCompletadas?: number;
  admisionesCanceladas?: number;
  ingresosAnio?: number;
  pacientesNuevosMes?: number;
}

interface ChartData {
  admisionesMensuales: Array<{ mes: string; cantidad: number }>;
  pacientesPorEmpresa: Array<{ empresa: string; cantidad: number }>;
  conceptosPorResultado: Array<{ resultado: string; cantidad: number }>;
  ingresosMensuales: Array<{ mes: string; monto: number }>;
  examenesPorEstado: Array<{ estado: string; cantidad: number }>;
  conceptosMensuales: Array<{ mes: string; cantidad: number }>;
}

interface RecentAdmission {
  id: string;
  paciente: {
    usuario: {
      nombres: string;
      apellidos: string;
      dni: string;
    };
  };
  fecha_programada: string;
  estado: string;
  tipo_examen: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("resumen");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [recentAdmissions, setRecentAdmissions] = useState<RecentAdmission[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<RecentAdmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [analyticsRes, chartsRes, admissionsStatsRes, recentRes, upcomingRes] = await Promise.all([
        api.get("/analytics/dashboards").catch(() => ({ data: null })),
        api.get("/analytics/dashboard/charts").catch(() => ({ data: null })),
        api.get("/admissions/stats").catch(() => ({ data: null })),
        api.get("/admissions?limit=5&page=1").catch(() => ({ data: { data: [] } })),
        api.get("/admissions?limit=5&page=1&estado=programado").catch(() => ({ data: { data: [] } }))
      ]);

      if (analyticsRes.data) {
        const statsData = analyticsRes.data;
        if (admissionsStatsRes.data) {
          setStats({
            ...statsData,
            admisionesHoy: admissionsStatsRes.data.hoy || 0,
            admisionesProgramadas: admissionsStatsRes.data.programadas || 0,
            admisionesCompletadas: admissionsStatsRes.data.completadas || 0,
            admisionesCanceladas: admissionsStatsRes.data.canceladas || 0
          });
        } else {
          setStats(statsData);
        }
      }

      if (chartsRes.data) {
        setChartData(chartsRes.data);
      }

      if (recentRes.data?.data) {
        setRecentAdmissions(recentRes.data.data.slice(0, 5));
      }

      if (upcomingRes.data?.data) {
        const upcoming = upcomingRes.data.data
          .filter((adm: any) => new Date(adm.fecha_programada) >= new Date())
          .sort((a: any, b: any) => new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime())
          .slice(0, 5);
        setUpcomingAppointments(upcoming);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (estado: string) => {
    const colors: { [key: string]: string } = {
      programado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      completado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      en_proceso: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    };
    return colors[estado] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Configuración de gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        }
      }
    }
  };

  const tabs = [
    { id: "resumen", label: "Resumen", icon: "📊" },
    { id: "graficos", label: "Gráficos", icon: "📈" }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400">
              {t("dashboard.subtitle")}
            </p>
          </div>

          {/* Pestañas */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-sm sm:text-base flex items-center gap-2
                    ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }
                  `}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido */}
          {loading ? (
            <div className="text-center py-12 sm:py-16 lg:py-20">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
            </div>
          ) : (
            <>
              {/* Pestaña: Resumen */}
              {activeTab === "resumen" && stats && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Cards principales - Grid responsivo mejorado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {/* Pacientes */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800 hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            {t("dashboard.patients")}
                          </p>
                          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {stats.totalPacientes}
                          </p>
                          {stats.pacientesNuevosMes !== undefined && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                              +{stats.pacientesNuevosMes} este mes
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 bg-blue-500 rounded-lg p-3 sm:p-4">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Admisiones */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-green-200 dark:border-green-800 hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                            {t("dashboard.admissions")}
                          </p>
                          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {stats.totalAdmisiones}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              Este mes: <span className="font-semibold">{stats.admisionesMes}</span>
                            </p>
                            {stats.admisionesHoy !== undefined && (
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                Hoy: <span className="font-semibold">{stats.admisionesHoy}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 bg-green-500 rounded-lg p-3 sm:p-4">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Conceptos */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-purple-200 dark:border-purple-800 hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                            {t("dashboard.concepts")}
                          </p>
                          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {stats.conceptosEmitidos}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Este mes
                          </p>
                        </div>
                        <div className="flex-shrink-0 bg-purple-500 rounded-lg p-3 sm:p-4">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Ingresos */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-yellow-200 dark:border-yellow-800 hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                            {t("dashboard.income")}
                          </p>
                          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-2">
                            {formatCurrency(Number(stats.ingresosMes))}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              Facturas: <span className="font-semibold">{stats.facturasMes}</span>
                            </p>
                            {stats.ingresosAnio !== undefined && (
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                Año: <span className="font-semibold">{formatCurrency(Number(stats.ingresosAnio))}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 bg-yellow-500 rounded-lg p-3 sm:p-4">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Exámenes Pendientes */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-red-200 dark:border-red-800 hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                            {t("dashboard.pendingExams")}
                          </p>
                          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">
                            {stats.examenesPendientes}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Requieren atención
                          </p>
                        </div>
                        <div className="flex-shrink-0 bg-red-500 rounded-lg p-3 sm:p-4">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Estadísticas de Admisiones */}
                    {stats.admisionesProgramadas !== undefined && (
                      <>
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200 dark:border-indigo-800 hover:shadow-xl transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                Programadas
                              </p>
                              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">
                                {stats.admisionesProgramadas}
                              </p>
                            </div>
                            <div className="flex-shrink-0 bg-indigo-500 rounded-lg p-3 sm:p-4">
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-emerald-200 dark:border-emerald-800 hover:shadow-xl transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs sm:text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                Completadas
                              </p>
                              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">
                                {stats.admisionesCompletadas}
                              </p>
                            </div>
                            <div className="flex-shrink-0 bg-emerald-500 rounded-lg p-3 sm:p-4">
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sección de información detallada - Grid responsivo */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Admisiones Recientes */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                            Admisiones Recientes
                          </h3>
                          <button
                            onClick={() => navigate("/admisiones")}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                          >
                            Ver todas →
                          </button>
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        {recentAdmissions.length > 0 ? (
                          <div className="space-y-3">
                            {recentAdmissions.map((adm) => (
                              <div
                                key={adm.id}
                                onClick={() => navigate(`/admisiones/${adm.id}`)}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border border-gray-100 dark:border-gray-700"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {adm.paciente.usuario.nombres} {adm.paciente.usuario.apellidos}
                                  </p>
                                  <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>DNI: {adm.paciente.usuario.dni}</span>
                                    <span>•</span>
                                    <span>{formatDate(adm.fecha_programada)}</span>
                                  </div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(adm.estado)}`}>
                                    {adm.estado}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            No hay admisiones recientes
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Próximas Citas */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                            Próximas Citas
                          </h3>
                          <button
                            onClick={() => navigate("/admisiones/calendario")}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                          >
                            Ver calendario →
                          </button>
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        {upcomingAppointments.length > 0 ? (
                          <div className="space-y-3">
                            {upcomingAppointments.map((adm) => (
                              <div
                                key={adm.id}
                                onClick={() => navigate(`/admisiones/${adm.id}`)}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border border-gray-100 dark:border-gray-700"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {adm.paciente.usuario.nombres} {adm.paciente.usuario.apellidos}
                                  </p>
                                  <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{adm.tipo_examen}</span>
                                    <span>•</span>
                                    <span>{formatDate(adm.fecha_programada)}</span>
                                  </div>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(adm.estado)}`}>
                                    {adm.estado}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            No hay citas programadas
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pestaña: Gráficos */}
              {activeTab === "graficos" && chartData && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Gráfico de Admisiones Mensuales */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Admisiones Mensuales
                      </h3>
                      <div className="h-64 sm:h-80">
                        <Line
                          data={{
                            labels: chartData.admisionesMensuales.map((d) => d.mes),
                            datasets: [
                              {
                                label: "Admisiones",
                                data: chartData.admisionesMensuales.map((d) => d.cantidad),
                                borderColor: "rgb(59, 130, 246)",
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                fill: true,
                                tension: 0.4
                              }
                            ]
                          }}
                          options={chartOptions}
                        />
                      </div>
                    </div>

                    {/* Gráfico de Ingresos Mensuales */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Ingresos Mensuales
                      </h3>
                      <div className="h-64 sm:h-80">
                        <Line
                          data={{
                            labels: chartData.ingresosMensuales.map((d) => d.mes),
                            datasets: [
                              {
                                label: "Ingresos (S/)",
                                data: chartData.ingresosMensuales.map((d) => d.monto),
                                borderColor: "rgb(34, 197, 94)",
                                backgroundColor: "rgba(34, 197, 94, 0.1)",
                                fill: true,
                                tension: 0.4
                              }
                            ]
                          }}
                          options={{
                            ...chartOptions,
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: function(value: any) {
                                    return `S/ ${value.toLocaleString("es-PE")}`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Gráfico de Pacientes por Empresa */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Top 5 Empresas por Pacientes
                      </h3>
                      <div className="h-64 sm:h-80">
                        <Bar
                          data={{
                            labels: chartData.pacientesPorEmpresa.map((d) =>
                              d.empresa.length > 15 ? d.empresa.substring(0, 15) + "..." : d.empresa
                            ),
                            datasets: [
                              {
                                label: "Pacientes",
                                data: chartData.pacientesPorEmpresa.map((d) => d.cantidad),
                                backgroundColor: [
                                  "rgba(59, 130, 246, 0.8)",
                                  "rgba(34, 197, 94, 0.8)",
                                  "rgba(251, 191, 36, 0.8)",
                                  "rgba(239, 68, 68, 0.8)",
                                  "rgba(168, 85, 247, 0.8)"
                                ]
                              }
                            ]
                          }}
                          options={chartOptions}
                        />
                      </div>
                    </div>

                    {/* Gráfico de Conceptos por Resultado */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Conceptos de Aptitud por Resultado
                      </h3>
                      <div className="h-64 sm:h-80">
                        <Doughnut
                          data={{
                            labels: chartData.conceptosPorResultado.map((d) => d.resultado),
                            datasets: [
                              {
                                data: chartData.conceptosPorResultado.map((d) => d.cantidad),
                                backgroundColor: [
                                  "rgba(34, 197, 94, 0.8)",
                                  "rgba(251, 191, 36, 0.8)",
                                  "rgba(239, 68, 68, 0.8)",
                                  "rgba(59, 130, 246, 0.8)",
                                  "rgba(168, 85, 247, 0.8)"
                                ]
                              }
                            ]
                          }}
                          options={chartOptions}
                        />
                      </div>
                    </div>

                    {/* Gráfico de Exámenes por Estado */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Exámenes de Laboratorio por Estado
                      </h3>
                      <div className="h-64 sm:h-80">
                        <Bar
                          data={{
                            labels: chartData.examenesPorEstado.map((d) => d.estado),
                            datasets: [
                              {
                                label: "Cantidad",
                                data: chartData.examenesPorEstado.map((d) => d.cantidad),
                                backgroundColor: [
                                  "rgba(239, 68, 68, 0.8)",
                                  "rgba(34, 197, 94, 0.8)",
                                  "rgba(251, 191, 36, 0.8)"
                                ]
                              }
                            ]
                          }}
                          options={chartOptions}
                        />
                      </div>
                    </div>

                    {/* Gráfico de Tendencias */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Tendencias: Admisiones vs Conceptos
                      </h3>
                      <div className="h-64 sm:h-80">
                        <Line
                          data={{
                            labels: chartData.admisionesMensuales.map((d) => d.mes),
                            datasets: [
                              {
                                label: "Admisiones",
                                data: chartData.admisionesMensuales.map((d) => d.cantidad),
                                borderColor: "rgb(59, 130, 246)",
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                fill: false,
                                tension: 0.4
                              },
                              {
                                label: "Conceptos Emitidos",
                                data: chartData.conceptosMensuales.map((d) => d.cantidad),
                                borderColor: "rgb(168, 85, 247)",
                                backgroundColor: "rgba(168, 85, 247, 0.1)",
                                fill: false,
                                tension: 0.4
                              }
                            ]
                          }}
                          options={chartOptions}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "graficos" && !chartData && !loading && (
                <div className="text-center py-12 sm:py-16 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-lg">No hay datos de gráficos disponibles</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
