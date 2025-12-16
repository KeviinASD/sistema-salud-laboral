import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import { 
  Receipt, 
  User, 
  DollarSign, 
  FileText, 
  Send, 
  Download, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  List,
  Calendar,
  Hash,
  Building2
} from "lucide-react";

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Profesional */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
                <Receipt className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              {t("billing.title")}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Gestión de facturación electrónica y comprobantes</p>
          </div>
          
          {/* Pestañas Modernas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1 mb-6">
            <nav className="flex gap-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("nueva")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === "nueva"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Plus className="h-5 w-5" />
                Nueva Factura
              </button>
              <button
                onClick={() => setActiveTab("lista")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === "lista"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <List className="h-5 w-5" />
                Lista de Facturas
              </button>
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Pestaña: Nueva Factura */}
            {activeTab === "nueva" && (
              <>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("billing.newInvoice")}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={createInvoice} className="grid grid-cols-1 gap-5 max-w-2xl">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("billing.selectPatient")} *
                        </span>
                      </label>
                      <select
                        className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Tipo de Comprobante *
                          </span>
                        </label>
                        <select 
                          className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200" 
                          value={form.type} 
                          onChange={(e) => {
                            const newType = e.target.value;
                            setForm({ 
                              ...form, 
                              type: newType,
                              series: newType === "01" ? "F001" : "B001"
                            });
                          }}
                          required
                        >
                          <option value="01">📄 Factura Electrónica</option>
                          <option value="03">🧾 Boleta de Venta</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          <span className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Serie *
                          </span>
                        </label>
                        <input 
                          className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200" 
                          placeholder={form.type === "01" ? "F001" : "B001"}
                          value={form.series} 
                          onChange={(e) => setForm({ ...form, series: e.target.value.toUpperCase() })} 
                          required
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {t("billing.amount")} (Incluye IGV) *
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">S/</span>
                        <input
                          className="block w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                          placeholder="0.00"
                          type="number"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        El monto total incluye IGV (18%). Subtotal: S/ {form.amount ? (form.amount / 1.18).toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <button
                      className="w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02]"
                      type="submit"
                    >
                      <Receipt className="h-5 w-5" />
                      Crear Factura
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Pestaña: Lista */}
            {activeTab === "lista" && (
              <>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <List className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("billing.invoices")}</h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-12">
                        Gestiona tus comprobantes y envía a SUNAT
                      </p>
                    </div>
                    <button
                      onClick={loadData}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Actualizar
                    </button>
                  </div>
                </div>
                <div className="p-6">

                  {loading ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{t("common.loading")}</p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-16">
                      <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                      <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{t("common.noData")}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Las facturas que crees aparecerán aquí
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                              <tr>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                  <span className="flex items-center gap-1">
                                    <Hash className="h-3.5 w-3.5" />
                                    Número
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3.5 w-3.5" />
                                    Paciente
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    Total
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    IGV
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Estado
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" />
                                    SUNAT
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Fecha
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                  Acciones
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {invoices.map((i) => (
                                <tr key={i.id} className="hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors">
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {i.numero_serie && i.numero_correlativo 
                                        ? `${i.numero_serie}-${String(i.numero_correlativo).padStart(6, '0')}` 
                                        : i.numero_correlativo 
                                        ? `N° ${String(i.numero_correlativo).padStart(6, '0')}` 
                                        : i.numero_serie
                                        ? `${i.numero_serie}-000000`
                                        : i.numero || i.number || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {i.admision?.paciente?.usuario?.nombres || "N/A"} {i.admision?.paciente?.usuario?.apellidos || ""}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      DNI: {i.admision?.paciente?.usuario?.dni || "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-green-600 dark:text-green-400">
                                      S/ {i.total ? Number(i.total).toFixed(2) : "0.00"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {i.igv ? `S/ ${Number(i.igv).toFixed(2)}` : "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                                      i.estado === "pagado" || i.status === "accepted"
                                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                        : i.estado === "rechazado" || i.status === "rejected"
                                          ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                                          : i.estado === "pendiente" || i.status === "new" || i.status === "pending"
                                            ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                                    }`}>
                                      {i.estado === "pagado" || i.status === "accepted" ? <CheckCircle className="h-3.5 w-3.5" /> :
                                       i.estado === "rechazado" || i.status === "rejected" ? <XCircle className="h-3.5 w-3.5" /> :
                                       i.estado === "pendiente" || i.status === "new" || i.status === "pending" ? <Clock className="h-3.5 w-3.5" /> :
                                       <AlertCircle className="h-3.5 w-3.5" />}
                                      {i.estado === "pagado" ? "Pagado" : 
                                       i.estado === "pendiente" ? "Pendiente" : 
                                       i.estado || i.status || t("billing.pending")}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                                    {i.xml_sunat || i.cdr_sunat ? (
                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                                        i.cdr_sunat || i.sunat_status === "accepted"
                                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                          : i.sunat_status === "rejected" || i.sunat_status === "error"
                                            ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                                            : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                      }`}>
                                        {i.cdr_sunat || i.sunat_status === "accepted" ? <CheckCircle className="h-3.5 w-3.5" /> :
                                         i.sunat_status === "rejected" || i.sunat_status === "error" ? <XCircle className="h-3.5 w-3.5" /> :
                                         <Clock className="h-3.5 w-3.5" />}
                                        {i.cdr_sunat ? "CDR" : 
                                         i.sunat_status === "accepted" ? "Aceptado" :
                                         i.sunat_status === "rejected" ? "Rechazado" :
                                         i.sunat_status === "error" ? "Error" :
                                         "Enviado"}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                        No enviado
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {i.fecha_emision 
                                        ? new Date(i.fecha_emision).toLocaleDateString("es-PE", { day: '2-digit', month: '2-digit', year: 'numeric' })
                                        : "N/A"}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {i.id && (
                                        <button
                                          onClick={() => downloadBoleta(i.id, i.numero_correlativo)}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          PDF
                                        </button>
                                      )}
                                      {(i.estado === "pendiente" || i.status === "new" || i.status === "pending") && i.id && (
                                        <button
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-sm transition-all"
                                          onClick={() => {
                                            console.log("Enviando factura a SUNAT, ID:", i.id);
                                            sendSunat(i.id);
                                          }}
                                        >
                                          <Send className="h-3.5 w-3.5" />
                                          SUNAT
                                        </button>
                                      )}
                                      {(i.cdr_sunat || i.cdr_url || i.sunatCdrUrl) && (
                                        <a 
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors" 
                                          href={i.cdr_url || i.sunatCdrUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                          CDR
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
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
