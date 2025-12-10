import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import PaymentForm from "../components/PaymentForm";

interface AdmissionDetail {
  id: string;
  paciente: {
    usuario: {
      dni: string;
      nombres: string;
      apellidos: string;
      email: string;
      telefono: string;
    };
    empresa?: {
      razon_social: string;
      ruc: string;
    };
  };
  tipo_examen: string;
  estado: string;
  fecha_programada: string;
  motivo_consulta?: string;
  observaciones_admision?: string;
  medico?: {
    nombres: string;
    apellidos: string;
    especialidad?: string;
  };
  factura?: {
    id?: string;
    numero_correlativo?: number;
    total?: number | string;
    estado?: string;
    subtotal?: number | string;
    igv?: number | string;
    metodo_pago?: string;
    fecha_emision?: string;
  };
  documentos?: Array<{
    id: string;
    tipo: string;
    nombre_archivo: string;
    created_at: string;
  }>;
  seguimiento_logistico?: Array<{
    estado: string;
    ubicacion?: string;
    mensaje?: string;
    created_at: string;
  }>;
}

export default function AdmissionsDetail() {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [admission, setAdmission] = useState<AdmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ tipo: "otros", file: null as File | null });
  const [viewingDocument, setViewingDocument] = useState<{ id: string; nombre: string; tipo: string } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ metodo_pago: "efectivo", transaccion_id: "" });

  useEffect(() => {
    if (id) {
      loadAdmission();
    }
  }, [id]);

  const loadAdmission = async () => {
    try {
      const res = await api.get(`/admissions/${id}`);
      setAdmission(res.data);
    } catch (error) {
      console.error("Error cargando admisión:", error);
      showError("Error al cargar la admisión");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await api.put(`/admissions/${id}`, { estado: newStatus });
      await loadAdmission();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al actualizar estado");
    }
  };

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
      console.error("Error descargando boleta:", error);
      showError(error.response?.data?.error || "Error al descargar boleta");
    }
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission?.factura) {
      showWarning("No hay factura asociada");
      return;
    }

    // Si es tarjeta, el PaymentForm manejará el pago
    if (paymentForm.metodo_pago === "tarjeta") {
      return; // El PaymentForm manejará el pago
    }

    // Obtener el ID de la factura
    let facturaId = (admission.factura as any)?.id;
    
    if (!facturaId) {
      try {
        const facturasRes = await api.get(`/facturacion/facturas`);
        const facturas = facturasRes.data?.data || facturasRes.data || [];
        const factura = facturas.find((f: any) => f.admision_id === admission.id);
        if (factura && factura.id) {
          facturaId = factura.id;
        } else {
          showWarning("No se pudo encontrar el ID de la factura. Por favor, intente desde la página de Facturación.");
          return;
        }
      } catch (error) {
        console.error("Error buscando factura:", error);
        showError("Error al buscar la factura. Por favor, intente desde la página de Facturación.");
        return;
      }
    }

    setProcessingPayment(true);
    try {
      await api.post("/facturacion/pagos", {
        factura_id: facturaId,
        monto: admission.factura.total ? Number(admission.factura.total) : 0,
        metodo_pago: paymentForm.metodo_pago,
        transaccion_id: paymentForm.transaccion_id || null
      });
      
      showSuccess("Pago registrado exitosamente");
      setPaymentForm({ metodo_pago: "efectivo", transaccion_id: "" });
      await loadAdmission();
    } catch (error: any) {
      console.error("Error procesando pago:", error);
      showError(error.response?.data?.error || "Error al procesar pago");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    showSuccess("Pago procesado exitosamente");
    setPaymentForm({ metodo_pago: "efectivo", transaccion_id: "" });
    await loadAdmission();
  };

  const handlePaymentError = (error: string) => {
    showError(error);
  };

  const handleManualPayment = async (transaccionId: string) => {
    if (!admission?.factura) {
      showWarning("No hay factura asociada");
      return;
    }

    let facturaId = (admission.factura as any)?.id;
    
    if (!facturaId) {
      try {
        const facturasRes = await api.get(`/facturacion/facturas`);
        const facturas = facturasRes.data?.data || facturasRes.data || [];
        const factura = facturas.find((f: any) => f.admision_id === admission.id);
        if (factura && factura.id) {
          facturaId = factura.id;
        } else {
          showWarning("No se pudo encontrar el ID de la factura.");
          return;
        }
      } catch (error) {
        showError("Error al buscar la factura.");
        return;
      }
    }

    setProcessingPayment(true);
    try {
      await api.post("/facturacion/pagos", {
        factura_id: facturaId,
        monto: admission.factura.total ? Number(admission.factura.total) : 0,
        metodo_pago: paymentForm.metodo_pago,
        transaccion_id: transaccionId || null
      });
      
      showSuccess("Pago registrado exitosamente");
      setPaymentForm({ metodo_pago: "efectivo", transaccion_id: "" });
      await loadAdmission();
    } catch (error: any) {
      console.error("Error procesando pago:", error);
      showError(error.response?.data?.error || "Error al procesar pago");
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusColor = (estado: string) => {
    const colors: { [key: string]: string } = {
      programado: "bg-blue-100 text-blue-800",
      confirmado: "bg-yellow-100 text-yellow-800",
      en_proceso: "bg-purple-100 text-purple-800",
      completado: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800"
    };
    return colors[estado] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando admisión...</p>
        </div>
      </AppLayout>
    );
  }

  if (!admission) {
    return (
      <AppLayout>
        <div className="py-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">Admisión no encontrada</p>
          <button
            onClick={() => navigate("/admisiones")}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            Volver a Admisiones
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate("/admisiones")}
              className="text-indigo-600 hover:text-indigo-700 mb-4"
            >
              ← Volver a Admisiones
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Admisión #{admission.id.substring(0, 8)}
                </h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {admission.paciente.usuario.nombres} {admission.paciente.usuario.apellidos}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(admission.estado)}`}>
                  {admission.estado}
                </span>
                {admission.estado === "programado" && (
                  <button
                    onClick={() => updateStatus("confirmado")}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Confirmar
                  </button>
                )}
                {admission.estado === "confirmado" && (
                  <button
                    onClick={() => updateStatus("en_proceso")}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Iniciar Atención
                  </button>
                )}
                {admission.estado === "en_proceso" && (
                  <button
                    onClick={() => updateStatus("completado")}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Completar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {["info", "documentos", "seguimiento", "factura"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }
                  `}
                >
                  {tab === "info" && "Información"}
                  {tab === "documentos" && "Documentos"}
                  {tab === "seguimiento" && "Seguimiento"}
                  {tab === "factura" && "Facturación"}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "info" && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Datos del Paciente</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">DNI</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{admission.paciente.usuario.dni}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombres Completos</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {admission.paciente.usuario.nombres} {admission.paciente.usuario.apellidos}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{admission.paciente.usuario.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                      <dd className="mt-1 text-sm text-gray-900">{admission.paciente.usuario.telefono}</dd>
                    </div>
                    {admission.paciente.empresa && (
                      <>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                          <dd className="mt-1 text-sm text-gray-900">{admission.paciente.empresa.razon_social}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">RUC</dt>
                          <dd className="mt-1 text-sm text-gray-900">{admission.paciente.empresa.ruc}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Información de la Cita</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Tipo de Examen</dt>
                      <dd className="mt-1 text-sm text-gray-900">{admission.tipo_examen}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Fecha y Hora</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(admission.fecha_programada).toLocaleString("es-PE")}
                      </dd>
                    </div>
                    {admission.medico && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Médico Asignado</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          Dr. {admission.medico.nombres} {admission.medico.apellidos}
                          {admission.medico.especialidad && ` - ${admission.medico.especialidad}`}
                        </dd>
                      </div>
                    )}
                    {admission.motivo_consulta && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Motivo de Consulta</dt>
                        <dd className="mt-1 text-sm text-gray-900">{admission.motivo_consulta}</dd>
                      </div>
                    )}
                    {admission.observaciones_admision && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Observaciones</dt>
                        <dd className="mt-1 text-sm text-gray-900">{admission.observaciones_admision}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => navigate(`/medico?admissionId=${id}`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Ver Historia Clínica
                </button>
                <button
                  onClick={() => navigate(`/concepto-aptitud?admissionId=${id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Generar Concepto de Aptitud
                </button>
              </div>
            </div>
          )}

          {activeTab === "documentos" && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Documentos Adjuntos</h3>
              </div>

              {/* Formulario de subida */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Subir Nuevo Documento</h4>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!uploadForm.file) {
                      showWarning("Seleccione un archivo");
                      return;
                    }
                    setUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", uploadForm.file);
                      formData.append("tipo", uploadForm.tipo);
                      
                      // No especificar Content-Type, axios lo hace automáticamente para FormData
                      await api.post(`/admissions/${id}/documents`, formData);
                      
                      showSuccess("Documento subido exitosamente");
                      setUploadForm({ tipo: "otros", file: null });
                      await loadAdmission();
                    } catch (error: any) {
                      showError(error.response?.data?.error || "Error al subir documento");
                    } finally {
                      setUploading(false);
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <select
                    value={uploadForm.tipo}
                    onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="dni">DNI</option>
                    <option value="carnet_salud">Carnet de Salud</option>
                    <option value="historia_clinica">Historia Clínica</option>
                    <option value="examenes_previos">Exámenes Previos</option>
                    <option value="otros">Otros Documentos</option>
                  </select>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadForm({ ...uploadForm, file });
                      }
                    }}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                      dark:file:bg-indigo-900 dark:file:text-indigo-200"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadForm.file}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? "Subiendo..." : "Subir"}
                  </button>
                </form>
              </div>

              {/* Lista de documentos */}
              {admission.documentos && admission.documentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Nombre del Archivo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha de Subida
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {admission.documentos.map((doc) => {
                        const canView = doc.nombre_archivo?.match(/\.(pdf|jpg|jpeg|png|gif|webp)$/i);
                        const isImage = doc.nombre_archivo?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        const isPdf = doc.nombre_archivo?.match(/\.pdf$/i);
                        const downloadUrl = `/api/public/admissions/${id}/documents/${doc.id}`;
                        const viewUrl = `/api/public/admissions/${id}/documents/${doc.id}?view=true`;
                        
                        return (
                          <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {doc.nombre_archivo}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {doc.tipo}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {new Date(doc.created_at).toLocaleDateString("es-PE", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                {canView && (
                                  <button
                                    onClick={() => setViewingDocument({ id: doc.id, nombre: doc.nombre_archivo, tipo: isPdf ? "pdf" : isImage ? "image" : "other" })}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                  >
                                    Ver
                                  </button>
                                )}
                                <a
                                  href={downloadUrl}
                                  download
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                >
                                  Descargar
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No hay documentos adjuntos</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "seguimiento" && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Seguimiento Logístico</h3>
                <button
                  onClick={loadAdmission}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Actualizar
                </button>
              </div>
              {admission.seguimiento_logistico && admission.seguimiento_logistico.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Ubicación
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Mensaje
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha y Hora
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {admission.seguimiento_logistico.map((event, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                              {event.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {event.ubicacion || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {event.mensaje || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {new Date(event.created_at).toLocaleString("es-PE", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No hay eventos de seguimiento</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    El seguimiento se actualiza automáticamente cuando cambia el estado de la admisión.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "factura" && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Información de Facturación</h3>
              {admission.factura ? (
                <div className="space-y-6">
                  {/* Información de la factura */}
                  <div>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Número de Factura</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">{admission.factura.numero_correlativo}</dd>
                      </div>
                      {admission.factura.fecha_emision && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Emisión</dt>
                          <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                            {new Date(admission.factura.fecha_emision).toLocaleDateString("es-PE")}
                          </dd>
                        </div>
                      )}
                      {admission.factura.subtotal && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal</dt>
                          <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                            S/ {Number(admission.factura.subtotal).toFixed(2)}
                          </dd>
                        </div>
                      )}
                      {admission.factura.igv && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">IGV (18%)</dt>
                          <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                            S/ {Number(admission.factura.igv).toFixed(2)}
                          </dd>
                  </div>
                      )}
                  <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                          S/ {admission.factura.total ? Number(admission.factura.total).toFixed(2) : "0.00"}
                        </dd>
                  </div>
                  <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admission.factura.estado === "pagado" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                              : admission.factura.estado === "pendiente"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}>
                            {admission.factura.estado === "pagado" ? "Pagado" : 
                             admission.factura.estado === "pendiente" ? "Pendiente" : 
                             admission.factura.estado}
                      </span>
                    </dd>
                      </div>
                      {admission.factura.metodo_pago && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Método de Pago</dt>
                          <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                            {admission.factura.metodo_pago}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Formulario de pago - Solo si está pendiente */}
                  {admission.factura.estado === "pendiente" && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Registrar Pago</h4>
                      
                      {/* Selector de método de pago */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Método de Pago *
                        </label>
                        <select
                          value={paymentForm.metodo_pago}
                          onChange={(e) => setPaymentForm({ ...paymentForm, metodo_pago: e.target.value, transaccion_id: "" })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="tarjeta">Tarjeta (Stripe)</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="yape">Yape</option>
                          <option value="plin">Plin</option>
                        </select>
                      </div>

                      {/* Mostrar formulario de Stripe si es tarjeta */}
                      {paymentForm.metodo_pago === "tarjeta" ? (
                        <div>
                          {(() => {
                            let facturaId = (admission.factura as any)?.id;
                            if (!facturaId) {
                              return (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    No se pudo encontrar el ID de la factura. Por favor, intente desde la página de Facturación.
                                  </p>
                                </div>
                              );
                            }
                            return (
                              <PaymentForm
                                facturaId={facturaId}
                                amount={admission.factura.total ? Number(admission.factura.total) : 0}
                                metodoPago={paymentForm.metodo_pago}
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                                onManualPayment={handleManualPayment}
                              />
                            );
                          })()}
                        </div>
                      ) : (
                        /* Formulario para otros métodos de pago */
                        <form onSubmit={processPayment} className="space-y-4">
                          {(paymentForm.metodo_pago === "transferencia" || 
                            paymentForm.metodo_pago === "yape" || 
                            paymentForm.metodo_pago === "plin") && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Número de Transacción / Referencia
                              </label>
                              <input
                                type="text"
                                value={paymentForm.transaccion_id}
                                onChange={(e) => setPaymentForm({ ...paymentForm, transaccion_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ingrese el número de transacción"
                              />
                            </div>
                          )}
                          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total a Pagar:</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                S/ {admission.factura.total ? Number(admission.factura.total).toFixed(2) : "0.00"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={processingPayment}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {processingPayment ? "Procesando..." : "Registrar Pago"}
                          </button>
                        </form>
                      )}

                      <div className="flex justify-end mt-4">
                        <button
                          onClick={async () => {
                            // Buscar el ID de la factura
                            let facturaId = (admission.factura as any)?.id;
                            if (!facturaId) {
                              try {
                                const facturasRes = await api.get(`/facturacion/facturas`);
                                const facturas = facturasRes.data?.data || facturasRes.data || [];
                                const factura = facturas.find((f: any) => f.admision_id === admission.id);
                                if (factura && factura.id) {
                                  facturaId = factura.id;
                                } else {
                                  showWarning("No se encontró la factura para descargar");
                                  return;
                                }
                              } catch (error) {
                                showError("Error al buscar la factura");
                                return;
                              }
                            }
                            await downloadBoleta(facturaId, admission.factura?.numero_correlativo);
                          }}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                        >
                          Descargar boleta PDF
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mensaje si ya está pagado */}
                  {admission.factura?.estado === "pagado" && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Esta factura ya ha sido pagada.
                            {admission.factura?.metodo_pago && ` Método de pago: ${admission.factura.metodo_pago}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No hay factura asociada a esta admisión.</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    La factura se crea automáticamente al crear la admisión si el tipo de examen tiene un precio base configurado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para visualizar documentos */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Fondo oscuro */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setViewingDocument(null)}
            ></div>

            {/* Contenedor del modal */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header del modal */}
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                    {viewingDocument.nombre}
                  </h3>
                  <button
                    onClick={() => setViewingDocument(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Cerrar</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="w-full" style={{ maxHeight: "70vh", overflow: "auto" }}>
                  {viewingDocument.tipo === "pdf" ? (
                    <iframe
                      src={`${api.defaults.baseURL}/admissions/${id}/documents/${viewingDocument.id}?view=true`}
                      className="w-full border-0 rounded"
                      style={{ height: "70vh", minHeight: "500px" }}
                      title={viewingDocument.nombre}
                    />
                  ) : viewingDocument.tipo === "image" ? (
                    <div className="flex justify-center bg-gray-100 dark:bg-gray-900 p-4 rounded">
                      <img
                        src={`${api.defaults.baseURL}/admissions/${id}/documents/${viewingDocument.id}?view=true`}
                        alt={viewingDocument.nombre}
                        className="max-w-full h-auto rounded shadow-lg"
                        style={{ maxHeight: "70vh" }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Este tipo de archivo no se puede visualizar en el navegador.
                      </p>
                      <a
                        href={`${api.defaults.baseURL}/admissions/${id}/documents/${viewingDocument.id}`}
                        download
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Descargar archivo
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer del modal */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setViewingDocument(null)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
                <a
                  href={`${api.defaults.baseURL}/admissions/${id}/documents/${viewingDocument.id}`}
                  download
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                >
                  Descargar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

