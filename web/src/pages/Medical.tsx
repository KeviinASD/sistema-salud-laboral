import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import { 
  FileText, 
  Upload, 
  TestTube, 
  List, 
  Calendar,
  User,
  Activity,
  Download,
  RefreshCw
} from "lucide-react";

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
    { id: "informacion", label: "Información", icon: FileText },
    { id: "documentos", label: "Documentos", icon: Upload },
    { id: "laboratorio", label: "Laboratorio", icon: TestTube },
    { id: "lista", label: "Lista", icon: List }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Mejorado */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {t("medical.title")}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Gestión de historias clínicas y resultados de laboratorio
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
          <div className="space-y-6">
            {/* Pestaña: Información */}
            {activeTab === "informacion" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("medical.createRecord")}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={submit} className="grid grid-cols-1 gap-5 max-w-3xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t("medical.selectPatient")} *
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
                  
                  {appointments.length > 0 && (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
                          <Calendar className="h-4 w-4" />
                          Admisiones del Paciente:
                        </label>
                        <ul className="max-h-32 overflow-y-auto space-y-2">
                          {appointments.map((a) => (
                            <li key={a.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {a.tipo_examen || a.examType || "Examen"}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(a.fecha_programada || a.date || Date.now()).toLocaleString("es-PE")}
                                  </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  a.estado === "completado" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                  a.estado === "en_proceso" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                                  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                }`}>
                                  {a.estado || a.status || "N/A"}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {appointments[0]?.motivo_consulta && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                          <label className="flex items-center gap-2 text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
                            <Activity className="h-4 w-4" />
                            Motivo de Consulta:
                          </label>
                          <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                            {appointments[0].motivo_consulta || "No especificado"}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {t("medical.diagnosis")} *
                    </label>
                    <input
                      className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                      placeholder={t("medical.diagnosis")}
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Concepto de Aptitud
                    </label>
                    <select
                      className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                      value={form.aptitude}
                      onChange={(e) => setForm({ ...form, aptitude: e.target.value })}
                    >
                      <option value="APTO">{t("medical.apto")}</option>
                      <option value="NO APTO">{t("medical.noApto")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {t("medical.notes")}
                    </label>
                    <textarea
                      className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                      placeholder={t("medical.notes")}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <button
                    className="w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-[1.02]"
                    type="submit"
                  >
                    <FileText className="h-5 w-5" />
                    {t("medical.createRecord")}
                  </button>
                </form>
                </div>
              </div>
            )}

            {/* Pestaña: Documentos */}
            {activeTab === "documentos" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Upload className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Subir Documento a Laboratorio
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={uploadLab} className="grid grid-cols-1 gap-5 max-w-3xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Seleccionar Paciente *
                      </span>
                    </label>
                    <select
                      className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
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
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3">
                        <Calendar className="h-4 w-4" />
                        Admisiones del Paciente:
                      </label>
                      <ul className="max-h-32 overflow-y-auto space-y-2">
                        {labAppointments.map((a) => (
                          <li key={a.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {a.tipo_examen || a.examType || "Examen"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(a.fecha_programada || a.date || Date.now()).toLocaleString("es-PE")}
                                </p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                a.estado === "completado" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                a.estado === "en_proceso" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                                "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              }`}>
                                {a.estado || a.status || "N/A"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      Seleccionar Archivo PDF *
                    </label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-3 file:px-6
                        file:rounded-xl file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-600 file:text-white
                        hover:file:bg-indigo-700 file:cursor-pointer
                        cursor-pointer"
                      required
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
                    type="submit"
                    disabled={uploadingLab}
                    className="w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {uploadingLab ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Subir PDF a Laboratorio
                      </>
                    )}
                  </button>
                </form>
                </div>
              </div>
            )}

            {/* Pestaña: Laboratorio */}
            {activeTab === "laboratorio" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <TestTube className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Exámenes de Laboratorio
                      </h3>
                    </div>
                    <button
                      onClick={loadLabExams}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Actualizar
                    </button>
                  </div>
                </div>
                <div className="p-6">

                {loadingLabExams ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 dark:border-green-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Cargando exámenes...</p>
                  </div>
                ) : labExams.length === 0 ? (
                  <div className="text-center py-16">
                    <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">No hay exámenes de laboratorio registrados</p>
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
                              <div className="flex items-center justify-end gap-2">
                                {exam.archivo_resultado && (
                                  <button
                                    onClick={() => downloadLabDocument(exam.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                  >
                                    <Download className="h-4 w-4" />
                                    PDF
                                  </button>
                                )}
                                <button
                                  onClick={() => navigate(`/admisiones/${exam.admision_id}`)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                  Ver
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Pestaña: Lista */}
            {activeTab === "lista" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <List className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("medical.medicalRecords")}
                      </h3>
                    </div>
                    <button
                      onClick={loadData}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Actualizar
                    </button>
                  </div>
                </div>
                <div className="p-6">

                {loading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{t("common.loading")}</p>
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-16">
                    <List className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{t("common.noData")}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Las historias clínicas que crees aparecerán aquí
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
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
