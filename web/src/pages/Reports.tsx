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
    { id: "estadisticas", label: "Estadísticas" },
    { id: "mensual", label: "Reporte Mensual" },
    { id: "personalizado", label: "Reporte Personalizado" }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">{t("reports.title")}</h2>
          
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
            {loading ? (
              <div className="text-center py-12 p-4 sm:p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
              </div>
            ) : (
              <>
                {/* Pestaña: Estadísticas */}
                {activeTab === "estadisticas" && (
                  <div className="p-4 sm:p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">Estadísticas Generales</h3>
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
                        className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm font-medium"
                      >
                        📄 Descargar Reporte PDF
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
                      
                      {/* Cards de métricas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t("dashboard.patients")}</p>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-2">{stats.patients}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">{t("dashboard.admissions")}</p>
                          <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-2">{stats.appointments}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Historias Clínicas</p>
                          <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-2">{stats.records}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">{t("dashboard.pendingExams")}</p>
                          <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-2">{stats.labResults}</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">{t("dashboard.invoices")}</p>
                          <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 mt-2">{stats.invoices}</p>
                        </div>
                        {stats.ingresosMes > 0 && (
                          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{t("dashboard.income")}</p>
                            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mt-2">S/ {Number(stats.ingresosMes || 0).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pestaña: Reporte Mensual */}
                {activeTab === "mensual" && (
                  <div className="p-4 sm:p-6 space-y-6">
                    {monthlyChartData ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">Citas por Mes (Últimos 6 meses)</h3>
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
                            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm font-medium"
                          >
                            📄 Descargar Reporte PDF
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
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">Generar Reporte Personalizado</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("reports.reportType")}</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="admisiones_mensual">{t("reports.monthlyAdmissions")}</option>
                      <option value="conceptos_aptitud">{t("reports.aptitudeConcepts")}</option>
                      <option value="ingresos">{t("reports.income")}</option>
                      <option value="examenes_laboratorio">{t("reports.labExams")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("reports.dateFrom")}</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("reports.dateTo")}</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={generateReport}
                      className="w-full px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
                    >
                      {t("reports.generate")}
                    </button>
                  </div>
                </div>

                {/* Reporte Generado */}
                {reportData && reportChartData && (
                  <div ref={chartRefs.report} className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-700 dark:text-white">
                        Reporte: {reportType === "admisiones_mensual" ? t("reports.monthlyAdmissions") :
                                   reportType === "conceptos_aptitud" ? t("reports.aptitudeConcepts") :
                                   reportType === "ingresos" ? t("reports.income") : t("reports.labExams")}
                      </h3>
                      <button
                        onClick={downloadBackendPDF}
                        className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 text-sm font-medium"
                      >
                        📄 Descargar Reporte PDF Completo
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
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 sm:p-6 border border-indigo-200 dark:border-indigo-800">
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
                                {Object.entries(reportData.datos).sort().map(([mes, cantidad]: [string, any], index, array) => {
                                  const total = Object.values(reportData.datos).reduce((a: any, b: any) => a + b, 0);
                                  const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(2) : "0.00";
                                  const tendencia = index > 0 ? (cantidad > array[index - 1][1] ? "↑" : cantidad < array[index - 1][1] ? "↓" : "→") : "—";
                                  return (
                                    <tr key={mes} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{mes}</td>
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{cantidad}</td>
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{porcentaje}%</td>
                                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`font-semibold ${tendencia === "↑" ? "text-green-600 dark:text-green-400" : tendencia === "↓" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
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
                                    {Object.values(reportData.datos).reduce((a: any, b: any) => a + b, 0)}
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
