import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import { 
  FileCheck, 
  User, 
  Building2, 
  Calendar, 
  ClipboardCheck, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Download, 
  ArrowLeft, 
  Shield,
  RefreshCw,
  FileSignature
} from "lucide-react";

interface Admission {
  id: string;
  paciente: {
    usuario: {
      dni: string;
      nombres: string;
      apellidos: string;
    };
    empresa?: {
      razon_social: string;
    };
  };
  tipo_examen: string;
  fecha_programada: string;
}

interface Concepto {
  id: string;
  resultado: string;
  restricciones?: string;
  recomendaciones?: string;
  fecha_vigencia?: string;
  hash_verificacion: string;
  pdf_generado?: boolean;
}

export default function ConceptoAptitud() {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const admissionId = searchParams.get("admissionId");

  const [admission, setAdmission] = useState<Admission | null>(null);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [concepto, setConcepto] = useState<Concepto | null>(null);
  const [form, setForm] = useState({
    resultado: "apto",
    restricciones: "",
    recomendaciones: "",
    fecha_vigencia: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdmissionSelector, setShowAdmissionSelector] = useState(!admissionId);

  useEffect(() => {
    if (admissionId) {
      loadAdmission();
      loadConcepto();
    } else {
      loadAdmissions();
    }
  }, [admissionId]);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admissions");
      const admissionsList = Array.isArray(res.data?.data) ? res.data.data : 
                            (Array.isArray(res.data) ? res.data : []);
      setAdmissions(admissionsList);
    } catch (error) {
      console.error("Error cargando admisiones:", error);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmission = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admissions/${admissionId}`);
      setAdmission(res.data);
      await loadConcepto();
    } catch (error) {
      console.error("Error cargando admisión:", error);
      showError("Error al cargar la admisión. Por favor, seleccione una admisión de la lista.");
      setShowAdmissionSelector(true);
      await loadAdmissions();
    } finally {
      setLoading(false);
    }
  };

  const loadConcepto = async () => {
    try {
      const res = await api.get(`/concepto-aptitud?admission_id=${admissionId}`);
      if (res.data) {
        setConcepto(res.data);
        setForm({
          resultado: res.data.resultado,
          restricciones: res.data.restricciones || "",
          recomendaciones: res.data.recomendaciones || "",
          fecha_vigencia: res.data.fecha_vigencia ? res.data.fecha_vigencia.split("T")[0] : ""
        });
      }
    } catch (error) {
      // No existe concepto aún
      console.log("No existe concepto para esta admisión");
    }
  };

  const handleSelectAdmission = (id: string) => {
    navigate(`/concepto-aptitud?admissionId=${id}`);
    setShowAdmissionSelector(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post("/concepto-aptitud", {
        admision_id: admissionId,
        ...form
      });
      setConcepto(res.data);
      showSuccess("Concepto de aptitud creado exitosamente");
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al crear concepto");
    } finally {
      setSubmitting(false);
    }
  };

  const generatePDF = async () => {
    if (!concepto) return;
    try {
      const res = await api.post("/concepto-aptitud/generate-pdf", {
        concept_id: concepto.id
      }, {
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `concepto_aptitud_${concepto.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al generar PDF");
    }
  };

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Profesional */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
                    <FileCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  {t("aptitude.title")}
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("aptitude.subtitle")}</p>
              </div>
              {admissionId && (
                <button
                  onClick={() => {
                    setShowAdmissionSelector(true);
                    navigate('/concepto-aptitud');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cambiar Admisión
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 dark:border-green-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{t("aptitude.loading")}</p>
            </div>
          ) : showAdmissionSelector || !admissionId ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("aptitude.selectAdmission")}</h3>
                </div>
              </div>
              <div className="p-6">
                {admissions.length === 0 ? (
                  <div className="text-center py-16">
                    <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{t("common.noData")}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      No hay admisiones disponibles
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {admissions.map((adm) => (
                      <div
                        key={adm.id}
                        onClick={() => handleSelectAdmission(adm.id)}
                        className="p-5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md cursor-pointer transition-all duration-200 transform hover:scale-[1.01]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <p className="font-semibold text-gray-900 dark:text-white text-lg">
                                {adm.paciente.usuario.nombres} {adm.paciente.usuario.apellidos}
                              </p>
                            </div>
                            <div className="space-y-1 ml-7">
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <FileSignature className="h-4 w-4" />
                                <span className="font-medium">DNI:</span> {adm.paciente.usuario.dni}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4" />
                                <span className="font-medium">{t("aptitude.examType")}:</span> {adm.tipo_examen}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{t("aptitude.date")}:</span> {new Date(adm.fecha_programada).toLocaleDateString("es-PE")}
                              </p>
                            </div>
                          </div>
                          <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0">
                            {t("common.select")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : admission && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información del Paciente</h3>
                </div>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <dt className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {t("aptitude.patient")}
                    </dt>
                    <dd className="text-base font-medium text-gray-900 dark:text-white">
                      {admission.paciente.usuario.nombres} {admission.paciente.usuario.apellidos}
                    </dd>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                    <dt className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <FileSignature className="h-3.5 w-3.5" />
                      DNI
                    </dt>
                    <dd className="text-base font-medium text-gray-900 dark:text-white">{admission.paciente.usuario.dni}</dd>
                  </div>
                  {admission.paciente.empresa && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                      <dt className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {t("aptitude.company")}
                      </dt>
                      <dd className="text-base font-medium text-gray-900 dark:text-white">{admission.paciente.empresa.razon_social}</dd>
                    </div>
                  )}
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                    <dt className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {t("aptitude.examType")}
                    </dt>
                    <dd className="text-base font-medium text-gray-900 dark:text-white">{admission.tipo_examen}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {concepto ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Concepto de Aptitud Emitido</h3>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md ${
                    concepto.resultado === "apto" ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" : 
                    concepto.resultado === "apto_con_restricciones" ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white" :
                    concepto.resultado === "no_apto" ? "bg-gradient-to-r from-red-500 to-rose-500 text-white" :
                    "bg-gradient-to-r from-gray-500 to-slate-500 text-white"
                  }`}>
                    {concepto.resultado === "apto" && <CheckCircle className="h-5 w-5" />}
                    {concepto.resultado === "apto_con_restricciones" && <AlertCircle className="h-5 w-5" />}
                    {concepto.resultado === "no_apto" && <XCircle className="h-5 w-5" />}
                    {concepto.resultado === "pendiente" && <Clock className="h-5 w-5" />}
                    {concepto.resultado.toUpperCase().replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <dl className="space-y-4">
                  {concepto.restricciones && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <dt className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Restricciones
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white leading-relaxed">{concepto.restricciones}</dd>
                    </div>
                  )}
                  {concepto.recomendaciones && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <dt className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Recomendaciones
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white leading-relaxed">{concepto.recomendaciones}</dd>
                    </div>
                  )}
                  {concepto.fecha_vigencia && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                      <dt className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de Vigencia
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white font-medium">
                        {new Date(concepto.fecha_vigencia).toLocaleDateString("es-PE")}
                      </dd>
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                    <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Hash de Verificación
                    </dt>
                    <dd className="text-xs text-gray-900 dark:text-white font-mono break-all bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      {concepto.hash_verificacion}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    <Download className="h-5 w-5" />
                    {t("aptitude.generatePDF")}
                  </button>
                  <button
                    onClick={() => navigate(`/admisiones/${admissionId}`)}
                    className="flex items-center gap-2 px-5 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
                  >
                    <FileText className="h-5 w-5" />
                    Ver Detalles
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Crear Concepto de Aptitud</h3>
                </div>
              </div>
              <div className="p-6">

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        {t("aptitude.result")} *
                      </span>
                    </label>
                    <select
                      value={form.resultado}
                      onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm"
                    >
                      <option value="apto">✓ APTO</option>
                      <option value="apto_con_restricciones">⚠ APTO CON RESTRICCIONES</option>
                      <option value="no_apto">✗ NO APTO</option>
                      <option value="pendiente">⏳ PENDIENTE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {t("aptitude.observations")}
                      </span>
                    </label>
                    <textarea
                      value={form.restricciones}
                      onChange={(e) => setForm({ ...form, restricciones: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm"
                      placeholder="Describa las restricciones laborales si el paciente es apto con restricciones..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Recomendaciones
                      </span>
                    </label>
                    <textarea
                      value={form.recomendaciones}
                      onChange={(e) => setForm({ ...form, recomendaciones: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm"
                      placeholder="Recomendaciones médicas para el paciente..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de Vigencia (opcional)
                      </span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha_vigencia}
                      onChange={(e) => setForm({ ...form, fecha_vigencia: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm"
                    />
                  </div>
                </div>

              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/admisiones")}
                    className="flex items-center gap-2 px-5 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <FileCheck className="h-5 w-5" />
                    {submitting ? t("common.save") + "..." : t("aptitude.save")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

