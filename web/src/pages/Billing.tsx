import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

export default function Billing() {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState("nueva");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ patientId: "", amount: 0, type: "03", series: "B001" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Cargar pacientes
      const patientsRes = await api.get("/patients");
      setPatients(Array.isArray(patientsRes.data?.data) ? patientsRes.data.data : []);
      
      // Cargar facturas
      try {
        const invoicesRes = await api.get("/facturacion/facturas");
        const invoicesData = Array.isArray(invoicesRes.data?.data) ? invoicesRes.data.data : 
                   (Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
        console.log("Facturas cargadas:", invoicesData.length);
        if (invoicesData.length > 0) {
          console.log("Primera factura de ejemplo:", {
            id: invoicesData[0].id,
            numero_correlativo: invoicesData[0].numero_correlativo,
            total: invoicesData[0].total,
            estado: invoicesData[0].estado
          });
        }
        setInvoices(invoicesData);
      } catch (error) {
        console.error("Error cargando facturas:", error);
        setInvoices([]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      setPatients([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Buscar admisión del paciente
      const admissionsRes = await api.get(`/admissions?paciente_id=${form.patientId}`);
      const admissions = Array.isArray(admissionsRes.data?.data) ? admissionsRes.data.data : 
                        (Array.isArray(admissionsRes.data) ? admissionsRes.data : []);
      const latestAdmission = admissions.length > 0 ? admissions[0] : null;

      if (!latestAdmission) {
        showWarning("El paciente no tiene admisiones. Por favor, cree una admisión primero.");
        return;
      }

      const subtotal = form.amount / 1.18;
      const igv = form.amount * 0.18 / 1.18;
      
      const invoiceData = {
        admision_id: latestAdmission.id,
        tipo_comprobante: form.type,
        numero_serie: form.series || (form.type === "01" ? "F001" : "B001"),
        subtotal: subtotal,
        igv: igv,
        total: form.amount,
        metodo_pago: "efectivo"
      };

      const r = await api.post("/facturacion/facturas", invoiceData);
      await loadData();
      setForm({ patientId: "", amount: 0, type: "03", series: "B001" });
      showSuccess("Factura creada exitosamente");
      setActiveTab("lista"); // Cambiar a la pestaña de lista después de crear
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al crear factura");
    }
  }
  
  async function sendSunat(id: string) {
    try {
      if (!id) {
        console.error("Error: ID de factura no válido", id);
        showError("ID de factura no válido");
        return;
      }
      
      console.log("Enviando factura a SUNAT con ID:", id);
      console.log("Payload que se enviará:", { factura_id: id });
      
      showSuccess("Enviando factura a SUNAT...");
      const r = await api.post(`/facturacion/sunat/enviar`, { factura_id: id });
      await loadData();
      
      // Verificar la respuesta
      if (r.data?.estado === "pagado" || r.data?.cdr_sunat) {
        showSuccess("Factura enviada a SUNAT exitosamente");
      } else if (r.data?.message) {
        showWarning(r.data.message || "La factura se procesó pero puede requerir configuración adicional");
      } else {
        showSuccess("Factura enviada a SUNAT");
      }
    } catch (error: any) {
      console.error("Error enviando a SUNAT:", error);
      console.error("Detalles del error:", error.response?.data);
      
      // Extraer el mensaje de error específico
      let errorMessage = "Error al enviar a SUNAT";
      
      if (error.response?.data) {
        errorMessage = error.response.data.error || error.response.data.message || errorMessage;
        
        // Si hay un mensaje adicional, mostrarlo también
        if (error.response.data.message && error.response.data.message !== errorMessage) {
          errorMessage = `${errorMessage}: ${error.response.data.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
    }
  }

  const downloadBoleta = async (facturaId: string, numeroCorrelativo?: number) => {
    try {
      const response = await api.get(`/facturacion/facturas/${facturaId}/boleta`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `boleta-${numeroCorrelativo || facturaId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al descargar boleta");
    }
  };

  const tabs = [
    { id: "nueva", label: "Nueva Factura" },
    { id: "lista", label: "Lista" }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">{t("billing.title")}</h2>
          
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
            {/* Pestaña: Nueva Factura */}
            {activeTab === "nueva" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">{t("billing.newInvoice")}</h3>
                <form onSubmit={createInvoice} className="grid grid-cols-1 gap-4 max-w-full sm:max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("billing.selectPatient")} *
                    </label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={form.patientId}
                      onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar Paciente</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.usuario?.nombres || ""} {p.usuario?.apellidos || ""} - DNI: {p.usuario?.dni || ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo *
                      </label>
                      <select 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                        value={form.type} 
                        onChange={(e) => {
                          const newType = e.target.value;
                          setForm({ 
                            ...form, 
                            type: newType,
                            series: newType === "01" ? "F001" : "B001" // Auto-completar serie según tipo
                          });
                        }}
                        required
                      >
                        <option value="01">Factura</option>
                        <option value="03">Boleta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serie *
                      </label>
                      <input 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" 
                        placeholder={form.type === "01" ? "F001" : "B001"}
                        value={form.series} 
                        onChange={(e) => setForm({ ...form, series: e.target.value.toUpperCase() })} 
                        required
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("billing.amount")} *
                    </label>
                    <input
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={t("billing.amount")}
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
                      step="0.01"
                      required
                    />
                  </div>
                  <button
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    type="submit"
                  >
                    {t("billing.newInvoice")}
                  </button>
                </form>
              </div>
            )}

            {/* Pestaña: Lista */}
            {activeTab === "lista" && (
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">{t("billing.invoices")}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Para verificar el estado en SUNAT, visita el portal de APISUNAT o revisa la columna "Estado SUNAT"
                    </p>
                  </div>
                  <button
                    onClick={loadData}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Actualizar
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">{t("common.noData")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Número
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                                Paciente
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Total
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                                IGV
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Estado
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                                SUNAT
                              </th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                                Fecha
                              </th>
                              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {invoices.map((i) => (
                          <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                {i.numero_serie && i.numero_correlativo 
                                  ? `${i.numero_serie}-${String(i.numero_correlativo).padStart(6, '0')}` 
                                  : i.numero_correlativo 
                                  ? `N° ${String(i.numero_correlativo).padStart(6, '0')}` 
                                  : i.numero_serie
                                  ? `${i.numero_serie}-000000`
                                  : i.numero || i.number || "N/A"}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                                {i.admision?.paciente?.usuario?.nombres || "N/A"} {i.admision?.paciente?.usuario?.apellidos || ""}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                DNI: {i.admision?.paciente?.usuario?.dni || "N/A"}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                S/ {i.total ? Number(i.total).toFixed(2) : "0.00"}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                                {i.igv ? `S/ ${Number(i.igv).toFixed(2)}` : "N/A"}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                i.estado === "pagado" || i.status === "accepted"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                  : i.estado === "rechazado" || i.status === "rejected"
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                                    : i.estado === "pendiente" || i.status === "new" || i.status === "pending"
                                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                              }`}>
                                {i.estado === "pagado" ? "Pagado" : 
                                 i.estado === "pendiente" ? "Pendiente" : 
                                 i.estado || i.status || t("billing.pending")}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap hidden lg:table-cell">
                              {i.xml_sunat || i.cdr_sunat ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  i.cdr_sunat || i.sunat_status === "accepted"
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                    : i.sunat_status === "rejected" || i.sunat_status === "error"
                                      ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                }`}>
                                  {i.cdr_sunat ? "✓ CDR" : 
                                   i.sunat_status === "accepted" ? "✓ Aceptado" :
                                   i.sunat_status === "rejected" ? "✗ Rechazado" :
                                   i.sunat_status === "error" ? "✗ Error" :
                                   "⏳ Enviado"}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  No enviado
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap hidden md:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                                {i.fecha_emision 
                                  ? new Date(i.fecha_emision).toLocaleDateString("es-PE", { day: '2-digit', month: '2-digit', year: 'numeric' })
                                  : "N/A"}
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                              <div className="flex flex-col sm:flex-row items-end gap-1 sm:gap-2">
                                {i.id && (
                                  <button
                                    onClick={() => downloadBoleta(i.id, i.numero_correlativo)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-xs"
                                  >
                                    Ver
                                  </button>
                                )}
                                {(i.estado === "pendiente" || i.status === "new" || i.status === "pending") && i.id && (
                                  <button
                                    className="bg-blue-600 dark:bg-blue-500 text-white rounded px-2 py-1 text-xs hover:bg-blue-700 dark:hover:bg-blue-600"
                                    onClick={() => {
                                      console.log("Enviando factura a SUNAT, ID:", i.id);
                                      sendSunat(i.id);
                                    }}
                                  >
                                    SUNAT
                                  </button>
                                )}
                                {(i.cdr_sunat || i.cdr_url || i.sunatCdrUrl) && (
                                  <a className="text-blue-600 dark:text-blue-400 hover:underline text-xs" href={i.cdr_url || i.sunatCdrUrl} target="_blank" rel="noopener noreferrer">
                                    Ver CDR
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
