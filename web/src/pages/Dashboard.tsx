import React, { useEffect, useState, useCallback } from "react";
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
import useEmblaCarousel from "embla-carousel-react";
import { 
  Users, 
  ClipboardList, 
  FileText, 
  DollarSign, 
  AlertCircle,
  Calendar,
  CheckCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from "lucide-react";

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
    { id: "resumen", label: "Resumen", icon: TrendingUp },
    { id: "graficos", label: "Gráficos", icon: BarChart3 }
  ];

  // Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Mejorado */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {t("dashboard.title")}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t("dashboard.subtitle")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadDashboardData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <TrendingUp className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          {/* Pestañas Modernas */}
          <div className="mb-6">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
                      ${
                        activeTab === tab.id
                          ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
            </div>
          ) : (
            <>
              {/* Pestaña: Resumen Rediseñado */}
              {activeTab === "resumen" && stats && (
                <div className="space-y-6">
                  {/* Stats Cards Grid - Diseño mejorado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card Pacientes */}
                    <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Pacientes
                            </span>
                          </div>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {stats.totalPacientes}
                          </p>
                          {stats.pacientesNuevosMes !== undefined && (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                              +{stats.pacientesNuevosMes} este mes
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Admisiones */}
                    <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Admisiones
                            </span>
                          </div>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {stats.totalAdmisiones}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{stats.admisionesMes}</span> este mes
                            {stats.admisionesHoy !== undefined && (
                              <> • <span className="font-medium">{stats.admisionesHoy}</span> hoy</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Conceptos */}
                    <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Conceptos
                            </span>
                          </div>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {stats.conceptosEmitidos}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Emitidos este mes
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Ingresos */}
                    <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                              <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Ingresos
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                            {formatCurrency(Number(stats.ingresosMes))}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{stats.facturasMes}</span> facturas
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segunda fila de stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card Exámenes Pendientes */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Exámenes Pendientes</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.examenesPendientes}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Programadas */}
                    {stats.admisionesProgramadas !== undefined && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Programadas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.admisionesProgramadas}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card Completadas */}
                    {stats.admisionesCompletadas !== undefined && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Completadas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.admisionesCompletadas}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sección de información detallada - Layout mejorado */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Admisiones Recientes */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-blue-600" />
                            Admisiones Recientes
                          </h3>
                          <button
                            onClick={() => navigate("/admisiones")}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline"
                          >
                            Ver todas
                          </button>
                        </div>
                      </div>
                      <div className="p-5">
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
                                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>DNI: {adm.paciente.usuario.dni}</span>
                                    <span>•</span>
                                    <span>{formatDate(adm.fecha_programada)}</span>
                                  </div>
                                </div>
                                <span className={`ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(adm.estado)}`}>
                                  {adm.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay admisiones recientes</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Próximas Citas */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-green-600" />
                            Próximas Citas
                          </h3>
                          <button
                            onClick={() => navigate("/admisiones/calendario")}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline"
                          >
                            Ver calendario
                          </button>
                        </div>
                      </div>
                      <div className="p-5">
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
                                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>{adm.tipo_examen}</span>
                                    <span>•</span>
                                    <span>{formatDate(adm.fecha_programada)}</span>
                                  </div>
                                </div>
                                <span className={`ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(adm.estado)}`}>
                                  {adm.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay citas programadas</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pestaña: Gráficos con Carrusel */}
              {activeTab === "graficos" && chartData && (
                <div className="space-y-6">
                  {/* Carrusel de Gráficos */}
                  <div className="relative">
                    <div className="overflow-hidden rounded-xl" ref={emblaRef}>
                      <div className="flex">
                        {/* Slide 1: Exámenes por Estado */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Exámenes de Laboratorio por Estado
                              </h3>
                            </div>
                            <div className="h-80">
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
                        </div>

                        {/* Slide 2: Admisiones Mensuales */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Admisiones Mensuales
                              </h3>
                            </div>
                            <div className="h-80">
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
                        </div>

                        {/* Slide 3: Ingresos Mensuales */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Ingresos Mensuales
                              </h3>
                            </div>
                            <div className="h-80">
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
                        </div>

                        {/* Slide 4: Pacientes por Empresa */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Top 5 Empresas por Pacientes
                              </h3>
                            </div>
                            <div className="h-80">
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
                        </div>

                        {/* Slide 5: Conceptos por Resultado */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Conceptos de Aptitud por Resultado
                              </h3>
                            </div>
                            <div className="h-80 flex items-center justify-center">
                              <div className="w-full max-w-md">
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
                          </div>
                        </div>

                        {/* Slide 5: Exámenes por Estado */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Exámenes de Laboratorio por Estado
                              </h3>
                            </div>
                            <div className="h-80">
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
                        </div>

                        {/* Slide 6: Tendencias */}
                        <div className="flex-[0_0_100%] min-w-0 px-2">
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Tendencias: Admisiones vs Conceptos
                              </h3>
                            </div>
                            <div className="h-80">
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
                    </div>

                    {/* Botones de navegación del carrusel */}
                    <button
                      onClick={scrollPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={scrollNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
                      aria-label="Siguiente"
                    >
                      <ChevronRight className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  {/* Indicadores del carrusel */}
                  <div className="flex justify-center gap-2">
                    {scrollSnaps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => emblaApi && emblaApi.scrollTo(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === selectedIndex
                            ? "w-8 bg-blue-600 dark:bg-blue-400"
                            : "w-2 bg-gray-300 dark:bg-gray-600"
                        }`}
                        aria-label={`Ir al gráfico ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "graficos" && !chartData && !loading && (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg text-gray-600 dark:text-gray-400">No hay datos de gráficos disponibles</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
