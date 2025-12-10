import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

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
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t("aptitude.title")}</h1>
            <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">{t("aptitude.subtitle")}</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t("aptitude.loading")}</p>
            </div>
          ) : showAdmissionSelector || !admissionId ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t("aptitude.selectAdmission")}</h3>
              {admissions.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t("common.noData")}</p>
              ) : (
                <div className="space-y-2">
                  {admissions.map((adm) => (
                    <div
                      key={adm.id}
                      onClick={() => handleSelectAdmission(adm.id)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {adm.paciente.usuario.nombres} {adm.paciente.usuario.apellidos}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            DNI: {adm.paciente.usuario.dni} • {t("aptitude.examType")}: {adm.tipo_examen}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("aptitude.date")}: {new Date(adm.fecha_programada).toLocaleDateString("es-PE")}
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600">
                          {t("common.select")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : admission && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t("aptitude.patient")}</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("aptitude.patient")}</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {admission.paciente.usuario.nombres} {admission.paciente.usuario.apellidos}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">DNI</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{admission.paciente.usuario.dni}</dd>
                </div>
                {admission.paciente.empresa && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("aptitude.company")}</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{admission.paciente.empresa.razon_social}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("aptitude.examType")}</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{admission.tipo_examen}</dd>
                </div>
              </dl>
            </div>
          )}

          {concepto ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Concepto de Aptitud Emitido</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  concepto.resultado === "apto" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                }`}>
                  {concepto.resultado.toUpperCase()}
                </span>
              </div>

              <dl className="space-y-4">
                {concepto.restricciones && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Restricciones</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{concepto.restricciones}</dd>
                  </div>
                )}
                {concepto.recomendaciones && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Recomendaciones</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{concepto.recomendaciones}</dd>
                  </div>
                )}
                {concepto.fecha_vigencia && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de Vigencia</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(concepto.fecha_vigencia).toLocaleDateString("es-PE")}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Hash de Verificación</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono text-xs break-all">
                    {concepto.hash_verificacion}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={generatePDF}
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
                >
                  📄 {t("aptitude.generatePDF")}
                </button>
                <button
                  onClick={() => navigate(`/admisiones/${admissionId}`)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t("common.view")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Crear Concepto de Aptitud</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("aptitude.result")} *
                  </label>
                  <select
                    value={form.resultado}
                    onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="apto">APTO</option>
                    <option value="apto_con_restricciones">APTO CON RESTRICCIONES</option>
                    <option value="no_apto">NO APTO</option>
                    <option value="pendiente">PENDIENTE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("aptitude.observations")}
                  </label>
                  <textarea
                    value={form.restricciones}
                    onChange={(e) => setForm({ ...form, restricciones: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describa las restricciones laborales si el paciente es apto con restricciones..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recomendaciones
                  </label>
                  <textarea
                    value={form.recomendaciones}
                    onChange={(e) => setForm({ ...form, recomendaciones: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Recomendaciones médicas para el paciente..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha de Vigencia (opcional)
                  </label>
                  <input
                    type="date"
                    value={form.fecha_vigencia}
                    onChange={(e) => setForm({ ...form, fecha_vigencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate("/admisiones")}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                >
                  {submitting ? t("common.save") + "..." : t("aptitude.save")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

