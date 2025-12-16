import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { BarChart3, TrendingUp, Settings } from "lucide-react";
// Eliminamos jsPDF y html2canvas ya que ahora usamos solo el PDF del backend

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Reports() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState("estadisticas");
  const [stats, setStats] = useState<any>({ 
    patients: 0, 
    appointments: 0, 
    records: 0, 
    labResults: 0, 
    invoices: 0,
    ingresosMes: 0
  });
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("admisiones_mensual");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const chartRefs = {
    stats: useRef<HTMLDivElement>(null),
    monthly: useRef<HTMLDivElement>(null),
    report: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Cargar estadísticas
      try {
        const statsRes = await api.get("/analytics/dashboards");
        if (statsRes.data) {
          setStats({
            patients: statsRes.data.totalPacientes || 0,
            appointments: statsRes.data.totalAdmisiones || 0,
            records: statsRes.data.conceptosEmitidos || 0,
            labResults: statsRes.data.examenesPendientes || 0,
            invoices: statsRes.data.facturasMes || 0,
            ingresosMes: statsRes.data.ingresosMes || 0
          });
        }
      } catch (error) {
        try {
          const statsRes = await api.get("/reports/dashboard");
          setStats(statsRes.data || { 
            patients: 0, 
            appointments: 0, 
            records: 0, 
            labResults: 0, 
            invoices: 0,
            ingresosMes: 0
          });
        } catch (e) {
          console.error("Error cargando estadísticas:", e);
        }
      }

      // Cargar reporte mensual
      try {
        const monthlyRes = await api.get("/analytics/reports/exams-monthly");
        setMonthly(Array.isArray(monthlyRes.data) ? monthlyRes.data : []);
      } catch (error) {
        try {
          const monthlyRes = await api.get("/reports/exams-monthly");
          setMonthly(Array.isArray(monthlyRes.data) ? monthlyRes.data : []);
        } catch (e) {
          setMonthly([]);
        }
      }
    } catch (error) {
      console.error("Error cargando reportes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const res = await api.post("/analytics/reports", {
        tipo: reportType,
        fecha_desde: dateFrom || undefined,
        fecha_hasta: dateTo || undefined
      });
      setReportData(res.data);
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al generar reporte");
    } finally {
      setLoading(false);
    }
  };

  // Eliminamos la función que genera PDFs como imagen
  // Ahora solo usamos el PDF del backend que es más profesional

  const downloadBackendPDF = async () => {
    try {
      const res = await api.post(
        "/analytics/reports/pdf",
        {
          tipo: reportType,
          fecha_desde: dateFrom || undefined,
          fecha_hasta: dateTo || undefined
        },
        {
          responseType: "blob"
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `reporte_${reportType}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al generar PDF");
    }
  };

  // Datos para gráfica de estadísticas generales
  const statsChartData = {
    labels: ["Pacientes", "Citas", "Historias", "Laboratorio", "Facturas"],
    datasets: [
      {
        label: "Cantidad",
        data: [
          stats.patients,
          stats.appointments,
          stats.records,
          stats.labResults,
          stats.invoices
        ],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(245, 158, 11, 0.8)"
        ],
        borderColor: [
          "rgba(59, 130, 246, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(139, 92, 246, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(245, 158, 11, 1)"
        ],
        borderWidth: 1
      }
    ]
  };

  // Datos para gráfica mensual
  const monthlyChartData = monthly.length > 0 ? {
    labels: monthly.map((m) => m.label || m.mes || "N/A"),
    datasets: [
      {
        label: "Citas",
        data: monthly.map((m) => m.count || m.cantidad || 0),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        tension: 0.4
      }
    ]
  } : null;

  // Datos para gráfica de reporte generado
  const reportChartData = reportData ? (() => {
    switch (reportType) {
      case "admisiones_mensual":
        const meses = Object.keys(reportData.datos || {}).sort();
        return {
          labels: meses,
          datasets: [
            {
              label: "Admisiones",
              data: meses.map((m) => reportData.datos[m]),
              backgroundColor: "rgba(16, 185, 129, 0.6)",
              borderColor: "rgba(16, 185, 129, 1)",
              borderWidth: 2
            }
          ]
        };
      case "conceptos_aptitud":
        const resultados = Object.keys(reportData.porResultado || {});
        return {
          labels: resultados,
          datasets: [
            {
              label: "Cantidad",
              data: resultados.map((r) => reportData.porResultado[r]),
              backgroundColor: [
                "rgba(16, 185, 129, 0.6)",
                "rgba(245, 158, 11, 0.6)",
                "rgba(239, 68, 68, 0.6)",
                "rgba(156, 163, 175, 0.6)"
              ]
            }
          ]
        };
      case "ingresos":
        const metodos = Object.keys(reportData.porMetodoPago || {});
        return {
          labels: metodos,
          datasets: [
            {
              label: "Ingresos (S/)",
              data: metodos.map((m) => reportData.porMetodoPago[m]),
              backgroundColor: "rgba(16, 185, 129, 0.6)",
              borderColor: "rgba(16, 185, 129, 1)",
              borderWidth: 2
            }
          ]
        };
      case "examenes_laboratorio":
        const tipos = Object.keys(reportData.porTipo || {});
        return {
          labels: tipos,
          datasets: [
            {
              label: "Cantidad",
              data: tipos.map((t) => reportData.porTipo[t]),
              backgroundColor: "rgba(139, 92, 246, 0.6)",
              borderColor: "rgba(139, 92, 246, 1)",
              borderWidth: 2
            }
          ]
        };
      default:
        return null;
    }
  })() : null;

  const tabs = [
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
    { id: "mensual", label: "Reporte Mensual", icon: TrendingUp },
    { id: "personalizado", label: "Reporte Personalizado", icon: Settings }
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Header mejorado con diseño profesional */}
          <div className="mb-10">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-blue-600 dark:bg-blue-700 rounded-xl shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        {t("reports.title")}
                      </h1>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Análisis detallado de métricas y estadísticas del sistema
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="hidden lg:flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Panel Activo</span>
                  </div>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Última actualización</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('es-PE')}</p>
                  </div>
                </div>
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

          {/* Contenido de las pestañas */}
          <div className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="text-center py-16 p-4 sm:p-6">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <p className="mt-6 text-lg font-medium text-gray-700 dark:text-gray-300">{t("common.loading")}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando datos...</p>
              </div>
            ) : (
              <>
                {/* Pestaña: Estadísticas */}
                {activeTab === "estadisticas" && (
                  <div className="p-6 sm:p-8 space-y-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                          <svg className="w-7 h-7 mr-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Estadísticas Generales
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Resumen completo del sistema</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.post(
                              "/analytics/reports/pdf",
                              {
                                tipo: "admisiones_mensual",
                                fecha_desde: "",
                                fecha_hasta: ""
                              },
                              { responseType: "blob" }
                            );
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const link = document.createElement("a");
                            link.href = url;
                            link.setAttribute("download", `reporte_estadisticas_${Date.now()}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error: any) {
                            showError(error.response?.data?.error || "Error al generar PDF");
                          }
                        }}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar PDF</span>
                      </button>
                    </div>
                    
                    <div ref={chartRefs.stats} className="space-y-6">
                      {/* Gráfico principal */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumen General</h4>
                        <div className="h-64 sm:h-80">
                          <Bar
                            data={statsChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                title: { 
                                  display: true, 
                                  text: "Distribución de Datos del Sistema",
                                  font: { size: 16, weight: "bold" }
                                },
                                tooltip: {
                                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                                  padding: 12,
                                  titleFont: { size: 14 },
                                  bodyFont: { size: 12 }
                                }
                              },
                              scales: {
                                y: { 
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 1
                                  },
                                  grid: {
                                    color: "rgba(0, 0, 0, 0.05)"
                                  }
                                },
                                x: {
                                  grid: {
                                    display: false
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Cards de métricas con diseño profesional */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {t("dashboard.patients")}
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.patients}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Total registrados</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {t("dashboard.admissions")}
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.appointments}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Total registradas</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Conceptos
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.records}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Emitidos este mes</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {t("dashboard.pendingExams")}
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.labResults}</p>
                              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Requieren atención</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  {t("dashboard.invoices")}
                                </span>
                              </div>
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.invoices}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Facturas este mes</p>
                            </div>
                          </div>
                        </div>
                        
                        {stats.ingresosMes > 0 && (
                          <div className="group bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t("dashboard.income")}
                                  </span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">S/ {Number(stats.ingresosMes || 0).toFixed(2)}</p>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                  </svg>
                                  Ingresos mensuales
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pestaña: Reporte Mensual */}
                {activeTab === "mensual" && (
                  <div className="p-6 sm:p-8 space-y-8">
                    {monthlyChartData ? (
                      <>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                              <svg className="w-7 h-7 mr-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                              </svg>
                              Reporte Mensual
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Análisis de tendencias de los últimos 6 meses</p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.post(
                                  "/analytics/reports/pdf",
                                  {
                                    tipo: "admisiones_mensual",
                                    fecha_desde: "",
                                    fecha_hasta: ""
                                  },
                                  { responseType: "blob" }
                                );
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const link = document.createElement("a");
                                link.href = url;
                                link.setAttribute("download", `reporte_mensual_${Date.now()}.pdf`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              } catch (error: any) {
                                showError(error.response?.data?.error || "Error al generar PDF");
                              }
                            }}
                            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-sm"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Descargar PDF</span>
                          </button>
                        </div>
                        <div ref={chartRefs.monthly} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia Mensual de Admisiones</h4>
                          <div className="h-64 sm:h-80 lg:h-96">
                            <Line
                              data={monthlyChartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: { 
                                    display: true,
                                    position: "top",
                                    labels: {
                                      usePointStyle: true,
                                      padding: 15,
                                      font: { size: 12 }
                                    }
                                  },
                                  title: { 
                                    display: true, 
                                    text: "Evolución de Admisiones en los Últimos 6 Meses",
                                    font: { size: 16, weight: "bold" }
                                  },
                                  tooltip: {
                                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                                    padding: 12,
                                    titleFont: { size: 14 },
                                    bodyFont: { size: 12 }
                                  }
                                },
                                scales: {
                                  y: { 
                                    beginAtZero: true,
                                    ticks: {
                                      stepSize: 1
                                    },
                                    grid: {
                                      color: "rgba(0, 0, 0, 0.05)"
                                    }
                                  },
                                  x: {
                                    grid: {
                                      display: false
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No hay datos mensuales disponibles</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pestaña: Reporte Personalizado */}
                {activeTab === "personalizado" && (
                  <div className="p-6 sm:p-8">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <svg className="w-7 h-7 mr-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generar Reporte Personalizado
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure los parámetros para crear un reporte específico</p>
                    </div>
                    
                <div className="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/20 dark:to-gray-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t("reports.reportType")}
                      </label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="admisiones_mensual">{t("reports.monthlyAdmissions")}</option>
                        <option value="conceptos_aptitud">{t("reports.aptitudeConcepts")}</option>
                        <option value="ingresos">{t("reports.income")}</option>
                        <option value="examenes_laboratorio">{t("reports.labExams")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t("reports.dateFrom")}
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t("reports.dateTo")}
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={generateReport}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span>{t("reports.generate")}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reporte Generado */}
                {reportData && reportChartData && (
                  <div ref={chartRefs.report} className="mt-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/20 dark:to-gray-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                          <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Reporte: {reportType === "admisiones_mensual" ? t("reports.monthlyAdmissions") :
                                   reportType === "conceptos_aptitud" ? t("reports.aptitudeConcepts") :
                                   reportType === "ingresos" ? t("reports.income") : t("reports.labExams")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Datos actualizados y listos para exportar</p>
                      </div>
                      <button
                        onClick={downloadBackendPDF}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Descargar PDF Completo</span>
                      </button>
                    </div>
                    {/* Gráficos mejorados con mejor visualización */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700 mb-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Visualización Gráfica
                      </h4>
                      <div className="h-64 sm:h-80 lg:h-96">
                        {reportType === "conceptos_aptitud" ? (
                          <Doughnut
                            data={reportChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { 
                                  position: "right",
                                  labels: {
                                    usePointStyle: true,
                                    padding: 15,
                                    font: { size: 12 }
                                  }
                                },
                                title: { 
                                  display: true, 
                                  text: "Distribución por Resultado",
                                  font: { size: 16, weight: "bold" }
                                },
                                tooltip: {
                                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                                  padding: 12,
                                  titleFont: { size: 14 },
                                  bodyFont: { size: 12 }
                                }
                              }
                            }}
                          />
                        ) : reportType === "ingresos" ? (
                          <Bar
                            data={reportChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                title: { 
                                  display: true, 
                                  text: "Ingresos por Método de Pago",
                                  font: { size: 16, weight: "bold" }
                                },
                                tooltip: {
                                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                                  padding: 12,
                                  callbacks: {
                                    label: function(context: any) {
                                      return `S/ ${Number(context.parsed.y).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    }
                                  }
                                }
                              },
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
                        ) : (
                          <Bar
                            data={reportChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                title: { 
                                  display: true, 
                                  text: reportType === "admisiones_mensual" ? "Admisiones por Mes" : "Exámenes por Tipo",
                                  font: { size: 16, weight: "bold" }
                                },
                                tooltip: {
                                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                                  padding: 12,
                                  titleFont: { size: 14 },
                                  bodyFont: { size: 12 }
                                }
                              },
                              scales: {
                                y: { 
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 1
                                  }
                                }
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {/* Tabla de datos detallada y análisis estadístico */}
                    <div className="mt-6 space-y-4">
                      {/* Resumen estadístico */}
                      <div className="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/20 dark:to-gray-900/20 rounded-lg p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
                        <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Resumen Estadístico</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {reportData.total !== undefined && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
                              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{reportData.total}</p>
                            </div>
                          )}
                          {reportData.facturas !== undefined && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Facturas</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">{reportData.facturas}</p>
                            </div>
                          )}
                          {reportData.total !== undefined && reportType === "ingresos" && (
                            <>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Ingresos Totales</p>
                                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">S/ {Number(reportData.total).toFixed(2)}</p>
                              </div>
                              {reportData.facturas > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Ticket Promedio</p>
                                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">S/ {(Number(reportData.total) / reportData.facturas).toFixed(2)}</p>
                                </div>
                              )}
                            </>
                          )}
                          {reportType === "admisiones_mensual" && reportData.datos && (() => {
                            const valores = Object.values(reportData.datos) as number[];
                            const total = valores.reduce((a, b) => a + b, 0);
                            const promedio = total / valores.length;
                            const maximo = Math.max(...valores);
                            const minimo = Math.min(...valores);
                            return (
                              <>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Promedio Mensual</p>
                                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{promedio.toFixed(2)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Máximo</p>
                                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{maximo}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Mínimo</p>
                                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{minimo}</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Tabla de datos detallada */}
                      {reportType === "admisiones_mensual" && reportData.datos && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle por Mes</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mes</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cantidad</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Porcentaje</th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tendencia</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {reportData.datos && Object.entries(reportData.datos).sort().map(([mes, cantidad]: [string, any], index, array) => {
                                  const total = Object.values(reportData.datos as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                                  const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(2) : "0.00";
                                  const cantidadAnterior = index > 0 ? (array[index - 1][1] as number) : 0;
                                  const tendencia = index > 0 ? (cantidad > cantidadAnterior ? "↑" : cantidad < cantidadAnterior ? "↓" : "→") : "—";
                                  return (
                                    <tr key={mes} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{mes}</td>
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                          {cantidad}
                                        </span>
                                      </td>
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex items-center">
                                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2" style={{ maxWidth: "100px" }}>
                                            <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" style={{ width: `${porcentaje}%` }}></div>
                                          </div>
                                          <span className="text-xs font-medium">{porcentaje}%</span>
                                        </div>
                                      </td>
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                                          tendencia === "↑" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : 
                                          tendencia === "↓" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : 
                                          "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                        }`}>
                                          {tendencia}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                  <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">TOTAL</td>
                                  <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                    {reportData.datos && Object.values(reportData.datos as Record<string, number>).reduce((a: number, b: number) => a + b, 0)}
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">100.00%</td>
                                  <td className="px-4 sm:px-6 py-3"></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Tabla para otros tipos de reportes */}
                      {(reportType === "conceptos_aptitud" || reportType === "ingresos" || reportType === "examenes_laboratorio") && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {reportType === "conceptos_aptitud" ? "Distribución por Resultado" :
                               reportType === "ingresos" ? "Ingresos por Método de Pago" :
                               "Distribución por Tipo de Examen"}
                            </h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {reportType === "conceptos_aptitud" ? "Resultado" :
                                     reportType === "ingresos" ? "Método de Pago" :
                                     "Tipo de Examen"}
                                  </th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {reportType === "ingresos" ? "Monto (S/)" : "Cantidad"}
                                  </th>
                                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Porcentaje</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {(() => {
                                  const datos = reportType === "conceptos_aptitud" ? reportData.porResultado :
                                               reportType === "ingresos" ? reportData.porMetodoPago :
                                               reportData.porTipo;
                                  const total = reportType === "ingresos" ? Number(reportData.total || 0) :
                                               reportData.total || 0;
                                  return Object.entries(datos || {}).sort((a: any, b: any) => b[1] - a[1]).map(([key, value]: [string, any]) => {
                                    const porcentaje = total > 0 ? ((Number(value) / total) * 100).toFixed(2) : "0.00";
                                    return (
                                      <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{key}</td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                          {reportType === "ingresos" ? `S/ ${Number(value).toFixed(2)}` : value}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{porcentaje}%</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
