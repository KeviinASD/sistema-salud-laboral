import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">{t("lab.title")}</h2>
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">{t("lab.newResult")}</h3>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 max-w-full sm:max-w-md">
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            required
          >
            <option value="">{t("lab.selectPatient")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.usuario?.nombres || ""} {p.usuario?.apellidos || ""} - DNI: {p.usuario?.dni || ""}
              </option>
            ))}
          </select>
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={t("lab.testName")}
            value={form.testName}
            onChange={(e) => setForm({ ...form, testName: e.target.value })}
            required
          />
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={t("lab.sampleId")}
            value={form.sampleId}
            onChange={(e) => setForm({ ...form, sampleId: e.target.value })}
            required
          />
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={t("lab.result")}
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
            required
          />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{t("lab.attachFile")}</label>
          <input
            className="mt-1 block w-full text-sm text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="submit"
          >
            {t("lab.submit")}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">{t("lab.results")}</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
          </div>
        ) : results.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t("lab.noResults")}</p>
        ) : (
          <ul>
            {results.map((r) => (
              <li key={r.id} className="py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-gray-800 dark:text-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-medium">{r.testName || r.tipo_examen || "Examen"}</span>
                  {r.sampleId && <span> - {t("lab.sampleId")}: {r.sampleId}</span>}
                  {r.result && <span> - {t("lab.result")}: {r.result}</span>}
                  {r.resultado_final && <span> - {t("lab.result")}: {r.resultado_final}</span>}
                </div>
                {(r.fileUrl || r.archivo_resultado) && (
                  <a 
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm" 
                    href={r.fileUrl || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {t("common.view")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
        </div>
      </div>
    </AppLayout>
  );
}
