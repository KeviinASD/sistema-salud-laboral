import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

export default function Medical() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();
  const [activeTab, setActiveTab] = useState("informacion");
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ patientId: "", diagnosis: "", aptitude: "APTO", notes: "" });
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  // Estado separado para el formulario de laboratorio
  const [labForm, setLabForm] = useState<any>({ patientId: "" });
  const [labAppointments, setLabAppointments] = useState<any[]>([]);
  const [uploadingLab, setUploadingLab] = useState(false);
  const [labExams, setLabExams] = useState<any[]>([]);
  const [loadingLabExams, setLoadingLabExams] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Cargar pacientes - el endpoint devuelve { data: [...], meta: {...} }
      const patientsRes = await api.get("/patients");
      setPatients(Array.isArray(patientsRes.data?.data) ? patientsRes.data.data : []);
      
      // Cargar historias clínicas
      try {
        const recordsRes = await api.get("/medical/history");
        setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
      } catch (error) {
        console.log("Error cargando historias clínicas:", error);
        setRecords([]);
      }

      // Cargar exámenes de laboratorio
      await loadLabExams();
    } catch (error) {
      console.error("Error cargando datos:", error);
      setPatients([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form.patientId) {
      // Cargar admisiones del paciente para historia clínica
      api.get(`/admissions?paciente_id=${form.patientId}`)
        .then((r) => {
          const admissions = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
          setAppointments(admissions);
        })
        .catch(() => setAppointments([]));
    } else {
      setAppointments([]);
    }
  }, [form.patientId]);

  useEffect(() => {
    if (labForm.patientId) {
      // Cargar admisiones del paciente para laboratorio
      api.get(`/admissions?paciente_id=${labForm.patientId}`)
        .then((r) => {
          const admissions = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
          setLabAppointments(admissions);
        })
        .catch(() => setLabAppointments([]));
    } else {
      setLabAppointments([]);
    }
  }, [labForm.patientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Buscar la admisión más reciente del paciente
      const latestAdmission = appointments.length > 0 ? appointments[0] : null;
      
      if (!latestAdmission) {
        showWarning("El paciente no tiene admisiones. Por favor, cree una admisión primero.");
        return;
      }

      // Crear historia clínica usando el endpoint correcto
      const historyData = {
        admision_id: latestAdmission.id,
        sintomas: form.notes,
        diagnostico: form.diagnosis,
        tratamiento: "",
        observaciones: form.notes
      };

      const r = await api.post("/medical/history", historyData);
      
      // Si hay concepto de aptitud, crearlo también
      if (form.aptitude) {
        try {
          await api.post("/concepto-aptitud", {
            admision_id: latestAdmission.id,
            concepto: form.aptitude,
            observaciones: form.notes
          });
        } catch (error) {
          console.error("Error creando concepto de aptitud:", error);
        }
      }

      await loadData();
      setForm({ patientId: "", diagnosis: "", aptitude: "APTO", notes: "" });
      showSuccess("Historia clínica guardada correctamente");
    } catch (error: any) {
      console.error("Error:", error);
      showError(error.response?.data?.error || "Error al guardar historia clínica");
    }
  }

  async function uploadLab(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !labForm.patientId) {
      showWarning("Por favor, seleccione un paciente y un archivo");
      return;
    }
    
    setUploadingLab(true);
    try {
      // Buscar la admisión más reciente del paciente
      const latestAdmission = labAppointments.length > 0 ? labAppointments[0] : null;
      
      if (!latestAdmission) {
        showWarning("El paciente no tiene admisiones. Por favor, cree una admisión primero.");
        setUploadingLab(false);
        return;
      }
      
      const fd = new FormData();
      fd.append("patientId", labForm.patientId);
      fd.append("testName", "Informe PDF");
      fd.append("sampleId", "N/A");
      fd.append("result", "");
      fd.append("file", file);
      
      await api.post("/lab-results", fd);
      showSuccess("Resultado de laboratorio subido exitosamente");
      setFile(null);
      setLabForm({ patientId: "" });
      await loadLabExams(); // Recargar exámenes de laboratorio
    } catch (error: any) {
      console.error("Error subiendo resultado de laboratorio:", error);
      showError(error.response?.data?.error || "Error al subir resultado de laboratorio");
    } finally {
      setUploadingLab(false);
    }
  }

  const loadLabExams = async () => {
    try {
      setLoadingLabExams(true);
      const res = await api.get("/laboratory/samples");
      setLabExams(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando exámenes de laboratorio:", error);
      setLabExams([]);
    } finally {
      setLoadingLabExams(false);
    }
  };

  const downloadLabDocument = async (examId: string) => {
    try {
      const response = await api.get(`/laboratory/exams/${examId}/document`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `examen-laboratorio-${examId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error descargando documento:", error);
      showError(error.response?.data?.error || "Error al descargar documento");
    }
  };

  const tabs = [
    { id: "informacion", label: "Información" },
    { id: "documentos", label: "Documentos" },
    { id: "laboratorio", label: "Laboratorio" },
    { id: "lista", label: "Lista" }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">{t("medical.title")}</h2>
          
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
            {/* Pestaña: Información */}
            {activeTab === "informacion" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">
                  {t("medical.createRecord")}
                </h3>
                <form onSubmit={submit} className="grid grid-cols-1 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("medical.selectPatient")} *
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
                  
                  {appointments.length > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Admisiones del Paciente:
                        </label>
                        <ul className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-900">
                          {appointments.map((a) => (
                            <li key={a.id} className="text-sm text-gray-700 dark:text-gray-300 py-1">
                              {new Date(a.fecha_programada || a.date || Date.now()).toLocaleString("es-PE")} — 
                              {a.tipo_examen || a.examType || "Examen"} — 
                              {a.estado || a.status || "N/A"}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {appointments[0]?.motivo_consulta && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Motivo de Consulta (de la admisión):
                          </label>
                          <div className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 sm:text-sm">
                            {appointments[0].motivo_consulta || "No especificado"}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("medical.diagnosis")} *
                    </label>
                    <input
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={t("medical.diagnosis")}
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Concepto de Aptitud
                    </label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={form.aptitude}
                      onChange={(e) => setForm({ ...form, aptitude: e.target.value })}
                    >
                      <option value="APTO">{t("medical.apto")}</option>
                      <option value="NO APTO">{t("medical.noApto")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("medical.notes")}
                    </label>
                    <textarea
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={t("medical.notes")}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <button
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    type="submit"
                  >
                    {t("medical.createRecord")}
                  </button>
                </form>
              </div>
            )}

            {/* Pestaña: Documentos */}
            {activeTab === "documentos" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">
                  Subir Documento a Laboratorio
                </h3>
                <form onSubmit={uploadLab} className="grid grid-cols-1 gap-4 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Seleccionar Paciente *
                    </label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={labForm.patientId}
                      onChange={(e) => setLabForm({ ...labForm, patientId: e.target.value })}
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

                  {labAppointments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Admisiones del Paciente:
                      </label>
                      <ul className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-900">
                        {labAppointments.map((a) => (
                          <li key={a.id} className="text-sm text-gray-700 dark:text-gray-300 py-1">
                            {new Date(a.fecha_programada || a.date || Date.now()).toLocaleString("es-PE")} — 
                            {a.tipo_examen || a.examType || "Examen"} — 
                            {a.estado || a.status || "N/A"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Seleccionar Archivo PDF *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700 dark:file:bg-indigo-900 dark:file:text-indigo-200
                        hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800"
                      required
                    />
                    {file && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Archivo seleccionado: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingLab}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingLab ? "Subiendo..." : "Subir PDF a Laboratorio"}
                  </button>
                </form>
              </div>
            )}

            {/* Pestaña: Laboratorio */}
            {activeTab === "laboratorio" && (
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">
                    Exámenes de Laboratorio
                  </h3>
                  <button
                    onClick={loadLabExams}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Actualizar
                  </button>
                </div>

                {loadingLabExams ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando exámenes...</p>
                  </div>
                ) : labExams.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No hay exámenes de laboratorio registrados</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Los documentos que subas aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Paciente
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tipo de Examen
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estado
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fecha Muestra
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fecha Resultado
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Resultado
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {labExams.map((exam) => (
                          <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {exam.admision?.paciente?.usuario?.nombres || "N/A"} {exam.admision?.paciente?.usuario?.apellidos || ""}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                DNI: {exam.admision?.paciente?.usuario?.dni || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {exam.tipo_examen || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                exam.estado === "completado" 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : exam.estado === "pendiente"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : exam.estado === "procesando"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              }`}>
                                {exam.estado || "N/A"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {exam.fecha_muestra 
                                  ? new Date(exam.fecha_muestra).toLocaleDateString("es-PE")
                                  : "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {exam.fecha_resultado 
                                  ? new Date(exam.fecha_resultado).toLocaleDateString("es-PE")
                                  : "Pendiente"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                {exam.resultado_final || "Sin resultado"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {exam.archivo_resultado && (
                                <button
                                  onClick={() => downloadLabDocument(exam.id)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                                >
                                  Descargar PDF
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/admisiones/${exam.admision_id}`)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                              >
                                Ver Admisión
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: Lista */}
            {activeTab === "lista" && (
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">
                    {t("medical.medicalRecords")}
                  </h3>
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
                ) : records.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">{t("common.noData")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Paciente
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Diagnóstico
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Motivo Consulta
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Observaciones
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {records.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {r.admision?.paciente?.usuario?.nombres || "N/A"} {r.admision?.paciente?.usuario?.apellidos || ""}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                DNI: {r.admision?.paciente?.usuario?.dni || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {r.diagnostico || r.diagnosis || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {r.admision?.motivo_consulta || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {r.created_at 
                                  ? new Date(r.created_at).toLocaleDateString("es-PE", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric"
                                    })
                                  : "N/A"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {r.created_at 
                                  ? new Date(r.created_at).toLocaleTimeString("es-PE", {
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })
                                  : ""}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                {r.observaciones || r.anamnesis || "Sin observaciones"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => navigate(`/admisiones/${r.admision_id || r.id}`)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                              >
                                Ver Detalles
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
