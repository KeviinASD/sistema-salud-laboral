import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import { 
  TestTube, 
  Upload, 
  User, 
  FileText, 
  RefreshCw,
  Calendar,
  Download
} from "lucide-react";

export default function Lab() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ patientId: "", testName: "", sampleId: "", result: "" });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Cargar pacientes - el endpoint devuelve { data: [...], meta: {...} }
      const patientsRes = await api.get("/patients");
      setPatients(Array.isArray(patientsRes.data?.data) ? patientsRes.data.data : []);
      
      // Cargar resultados de laboratorio
      const resultsRes = await api.get("/lab-results");
      setResults(Array.isArray(resultsRes.data) ? resultsRes.data : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      setPatients([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Primero necesitamos obtener una admisión del paciente
      // Por ahora, usamos el endpoint legacy pero con la estructura correcta
      const fd = new FormData();
      fd.append("patientId", form.patientId);
      fd.append("testName", form.testName);
      fd.append("sampleId", form.sampleId);
      fd.append("result", form.result);
      if (file) fd.append("file", file);
      
      const r = await api.post("/lab-results", fd, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });
      
      setResults([r.data, ...results]);
      setForm({ patientId: "", testName: "", sampleId: "", result: "" });
      setFile(null);
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al guardar resultado");
    }
  }
  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Mejorado */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {t("lab.title")}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Registro y gestión de resultados de laboratorio
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          {/* Formulario de Nuevo Resultado */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("lab.newResult")}
                </h3>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={submit} className="grid grid-cols-1 gap-5 max-w-3xl">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("lab.selectPatient")} *
                    </span>
                  </label>
                  <select
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <TestTube className="h-4 w-4" />
                      {t("lab.testName")} *
                    </span>
                  </label>
                  <input
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: Hemograma completo"
                    value={form.testName}
                    onChange={(e) => setForm({ ...form, testName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("lab.sampleId")} *
                    </span>
                  </label>
                  <input
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Ej: LAB-2024-001"
                    value={form.sampleId}
                    onChange={(e) => setForm({ ...form, sampleId: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("lab.result")} *
                  </label>
                  <textarea
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Descripción del resultado del examen"
                    value={form.result}
                    onChange={(e) => setForm({ ...form, result: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    {t("lab.attachFile")}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-3 file:px-6
                      file:rounded-xl file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-700 file:cursor-pointer
                      cursor-pointer"
                  />
                  {file && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span><span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)</span>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  className="w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02]"
                  type="submit"
                >
                  <TestTube className="h-5 w-5" />
                  {t("lab.submit")}
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("lab.results")}
                </h3>
              </div>
            </div>
            <div className="p-6">{
              loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{t("common.loading")}</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-16">
                  <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{t("lab.noResults")}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Los resultados que registres aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r) => (
                    <div 
                      key={r.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                            <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {r.testName || r.tipo_examen || "Examen"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              {r.sampleId && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {t("lab.sampleId")}: {r.sampleId}
                                </span>
                              )}
                              {(r.result || r.resultado_final) && (
                                <span className="flex items-center gap-1">
                                  {t("lab.result")}: {r.result || r.resultado_final}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {(r.fileUrl || r.archivo_resultado) && (
                        <a 
                          className="ml-4 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0" 
                          href={r.fileUrl || "#"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          {t("common.view")}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
