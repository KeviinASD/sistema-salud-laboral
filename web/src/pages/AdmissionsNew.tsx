import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

interface Patient {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  empresa?: {
    razon_social: string;
  };
}

interface ExamType {
  id: string;
  codigo: string;
  nombre: string;
  duracion_minutos: number;
  precio_base?: number;
}

interface Doctor {
  id: string;
  nombres: string;
  apellidos: string;
  especialidad?: string;
}

export default function AdmissionsNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [currentStep, setCurrentStep] = useState(1);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    dni: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    empresa_id: "",
    tipo_sangre: "",
    alergias: "",
    medicamentos_actuales: "",
    antecedentes_familiares: ""
  });
  const [form, setForm] = useState({
    tipo_examen: "",
    fecha_programada: "",
    hora: "",
    medico_id: "",
    motivo_consulta: "",
    tipo_comprobante: "03",
    metodo_pago: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [documents, setDocuments] = useState<{ [key: string]: File }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    }
    const newPatient = searchParams.get("newPatient");
    if (newPatient === "true") {
      setShowNewPatientForm(true);
      loadCompanies();
    }
  }, [patientId, searchParams]);

  useEffect(() => {
    if (form.fecha_programada && form.tipo_examen) {
      loadAvailableSlots();
    }
  }, [form.fecha_programada, form.tipo_examen, form.medico_id]);

  const loadInitialData = async () => {
    try {
      const [examTypesRes, doctorsRes] = await Promise.all([
        api.get("/admissions/exam-types").catch(() => ({ data: [] })),
        api.get("/users?rol=doctor").catch(() => ({ data: [] }))
      ]);

      setExamTypes(examTypesRes.data || []);
      setDoctors(doctorsRes.data?.data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await api.get("/admissions/companies");
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando empresas:", error);
      setCompanies([]);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPatient(true);

    try {
      // Validar DNI
      if (!newPatientForm.dni || newPatientForm.dni.length !== 8) {
        showWarning("El DNI debe tener 8 dígitos");
        setCreatingPatient(false);
        return;
      }

      const patientData = {
        dni: newPatientForm.dni,
        nombres: newPatientForm.nombres,
        apellidos: newPatientForm.apellidos,
        email: newPatientForm.email || `${newPatientForm.dni}@temp.com`,
        telefono: newPatientForm.telefono,
        empresa_id: newPatientForm.empresa_id || null,
        tipo_sangre: newPatientForm.tipo_sangre || null,
        alergias: newPatientForm.alergias || null,
        medicamentos_actuales: newPatientForm.medicamentos_actuales || null,
        antecedentes_familiares: newPatientForm.antecedentes_familiares || null
      };

      const res = await api.post("/patients", patientData);
      
      // Establecer el paciente creado y continuar
      setPatient({
        id: res.data.id,
        dni: res.data.usuario?.dni || newPatientForm.dni,
        nombres: res.data.usuario?.nombres || newPatientForm.nombres,
        apellidos: res.data.usuario?.apellidos || newPatientForm.apellidos,
        empresa: res.data.empresa
      });
      
      setShowNewPatientForm(false);
      setCurrentStep(2);
      showSuccess("Paciente registrado exitosamente");
    } catch (error: any) {
      console.error("Error creando paciente:", error);
      showError(error.response?.data?.error || "Error al registrar paciente");
    } finally {
      setCreatingPatient(false);
    }
  };

  const loadPatient = async (id: string) => {
    try {
      const res = await api.get(`/patients/${id}`);
      setPatient({
        id: res.data.id,
        dni: res.data.usuario?.dni || "",
        nombres: res.data.usuario?.nombres || "",
        apellidos: res.data.usuario?.apellidos || "",
        empresa: res.data.empresa
      });
      setCurrentStep(2);
    } catch (error) {
      console.error("Error cargando paciente:", error);
    }
  };

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get("/patients/search", {
        params: { q: query }
      });
      const pacientes = Array.isArray(res.data) ? res.data : [];
      setSearchResults(pacientes);
      setShowResults(pacientes.length > 0);
    } catch (error) {
      console.error("Error buscando pacientes:", error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si el campo está vacío, limpiar resultados
    if (value.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce: esperar 300ms antes de buscar
    searchTimeoutRef.current = setTimeout(() => {
      searchPatients(value);
    }, 300);
  };

  const selectPatient = (p: any) => {
    setPatient({
      id: p.id,
      dni: p.dni,
      nombres: p.nombres,
      apellidos: p.apellidos,
      empresa: p.razon_social ? { razon_social: p.razon_social } : undefined
    });
    setSearchQuery(`${p.nombres} ${p.apellidos} - DNI: ${p.dni}`);
    setSearchResults([]);
    setShowResults(false);
    setCurrentStep(2);
  };

  const loadAvailableSlots = async () => {
    try {
      const res = await api.get("/admissions/calendar/slots", {
        params: {
          date: form.fecha_programada,
          examType: form.tipo_examen,
          doctorId: form.medico_id || undefined
        }
      });
      setAvailableSlots(res.data || []);
    } catch (error) {
      console.error("Error cargando horarios:", error);
      setAvailableSlots([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post("/admissions", {
        paciente_id: patient!.id,
        tipo_examen: form.tipo_examen,
        fecha_programada: form.fecha_programada,
        hora: form.hora,
        medico_id: form.medico_id || null,
        motivo_consulta: form.motivo_consulta,
        tipo_comprobante: form.tipo_comprobante,
        metodo_pago: form.metodo_pago
      });

      if (res.data.success) {
        const admissionId = res.data.id;
        
        // Subir documentos si hay alguno
        if (Object.keys(documents).length > 0) {
          try {
            const uploadPromises = Object.entries(documents).map(async ([tipo, file]) => {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("tipo", tipo);
              
              // No especificar Content-Type, axios lo hace automáticamente para FormData
              await api.post(`/admissions/${admissionId}/documents`, formData);
            });
            
            await Promise.all(uploadPromises);
          } catch (uploadError) {
            console.error("Error subiendo documentos:", uploadError);
            // No bloqueamos el flujo si falla la subida de documentos
          }
        }
        
        navigate(`/admisiones/${admissionId}`);
      }
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al crear admisión");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { name: "Paciente", completed: currentStep > 1, current: currentStep === 1 },
    { name: "Información", completed: currentStep > 2, current: currentStep === 2 },
    { name: "Documentos", completed: currentStep > 3, current: currentStep === 3 },
    { name: "Confirmación", completed: currentStep > 4, current: currentStep === 4 }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
              {t("admissions.newAdmission")}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Registre una nueva admisión para evaluación ocupacional
            </p>
          </div>

          {/* Pasos */}
          <div className="mb-6 sm:mb-8">
            <nav className="flex items-center justify-center overflow-x-auto" aria-label="Progress">
              <ol className="flex items-center space-x-4 sm:space-x-6 lg:space-x-8 min-w-max">
                {steps.map((step, index) => (
                  <li key={step.name} className="flex items-center">
                    <div className="flex items-center">
                      <span className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                        step.completed ? "bg-green-600" : step.current ? "bg-indigo-600" : "bg-gray-300"
                      }`}>
                        {step.completed ? "✓" : index + 1}
                      </span>
                      <span className={`ml-2 sm:ml-3 text-xs sm:text-sm font-medium ${
                        step.current ? "text-indigo-600 dark:text-indigo-400" : step.completed ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                      }`}>
                        <span className="hidden sm:inline">{step.name}</span>
                        <span className="sm:hidden">{step.name.split(" ")[0]}</span>
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden sm:block ml-4 sm:ml-6 lg:ml-8 w-16 sm:w-24 lg:w-32 h-0.5 bg-gray-300"></div>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Formulario */}
          {showNewPatientForm ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
              <form onSubmit={handleCreatePatient}>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Registrar Nuevo Paciente</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">DNI *</label>
                    <input
                      type="text"
                      value={newPatientForm.dni}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, dni: e.target.value.replace(/\D/g, "") })}
                      maxLength={8}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={newPatientForm.telefono}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombres *</label>
                    <input
                      type="text"
                      value={newPatientForm.nombres}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, nombres: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellidos *</label>
                    <input
                      type="text"
                      value={newPatientForm.apellidos}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, apellidos: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
                  <select
                    value={newPatientForm.empresa_id}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, empresa_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Sin empresa</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.razon_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Sangre</label>
                    <select
                      value={newPatientForm.tipo_sangre}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, tipo_sangre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">No especificado</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alergias</label>
                  <textarea
                    value={newPatientForm.alergias}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, alergias: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medicamentos Actuales</label>
                  <textarea
                    value={newPatientForm.medicamentos_actuales}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, medicamentos_actuales: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antecedentes Familiares</label>
                  <textarea
                    value={newPatientForm.antecedentes_familiares}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, antecedentes_familiares: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPatientForm(false);
                    navigate("/admisiones/nueva");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPatient}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creatingPatient ? "Registrando..." : "Registrar Paciente"}
                </button>
              </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg">
              {currentStep === 1 && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Seleccionar Paciente</h3>
                  
                  {/* Buscador de pacientes */}
                  <div className="mb-4 relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Buscar por DNI, Nombre o Apellido
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Escriba el DNI o nombre del paciente..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => {
                          if (searchResults.length > 0) {
                            setShowResults(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay para permitir el click en los resultados
                          setTimeout(() => setShowResults(false), 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {searching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        </div>
                      )}
                    </div>

                    {/* Lista de resultados */}
                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {searchResults.map((p) => (
                            <li
                              key={p.id}
                              onClick={() => selectPatient(p)}
                              className="px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {p.nombres} {p.apellidos}
                                  </p>
                                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                    <span>DNI: {p.dni}</span>
                                    {p.razon_social && (
                                      <span className="truncate">Empresa: {p.razon_social}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          No se encontraron pacientes con ese criterio de búsqueda
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Paciente seleccionado */}
                  {patient && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Paciente seleccionado:
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            {patient.nombres} {patient.apellidos} - DNI: {patient.dni}
                          </p>
                          {patient.empresa && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Empresa: {patient.empresa.razon_social}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPatient(null);
                            setSearchQuery("");
                            setSearchResults([]);
                            setShowResults(false);
                          }}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
                      ¿No encuentra al paciente?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPatientForm(true);
                        loadCompanies();
                      }}
                      className="w-full bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                    >
                      Registrar Nuevo Paciente
                    </button>
                  </div>
                </div>
              )}

            {currentStep === 2 && patient && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información de la Admisión</h3>
                
                <div className="mb-4 bg-gray-50 rounded-lg p-4">
                  <p className="font-medium">{patient.nombres} {patient.apellidos}</p>
                  <p className="text-sm text-gray-600">DNI: {patient.dni}</p>
                  {patient.empresa && (
                    <p className="text-sm text-gray-600">Empresa: {patient.empresa.razon_social}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Examen *</label>
                    <select
                      value={form.tipo_examen}
                      onChange={(e) => setForm({ ...form, tipo_examen: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Seleccione un tipo</option>
                      {examTypes.map(type => (
                        <option key={type.id} value={type.codigo}>
                          {type.nombre} ({type.duracion_minutos} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                      <input
                        type="date"
                        value={form.fecha_programada}
                        onChange={(e) => setForm({ ...form, fecha_programada: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora *</label>
                      <select
                        value={form.hora}
                        onChange={(e) => setForm({ ...form, hora: e.target.value })}
                        disabled={!form.fecha_programada || availableSlots.length === 0}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Seleccione una hora</option>
                        {availableSlots.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                      {form.fecha_programada && availableSlots.length === 0 && (
                        <p className="mt-1 text-sm text-yellow-600">No hay horarios disponibles</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Médico Asignado</label>
                    <select
                      value={form.medico_id}
                      onChange={(e) => setForm({ ...form, medico_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Auto-asignar</option>
                      {doctors.map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.nombres} {doctor.apellidos} {doctor.especialidad ? `- ${doctor.especialidad}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Consulta</label>
                    <textarea
                      value={form.motivo_consulta}
                      onChange={(e) => setForm({ ...form, motivo_consulta: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Describa el motivo de la consulta..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={!form.tipo_examen || !form.fecha_programada || !form.hora}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Documentos Requeridos</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Puede subir documentos ahora o después de crear la admisión. (Opcional)
                </p>
                
                <div className="space-y-4 mb-6">
                  {[
                    { key: "dni", label: "DNI" },
                    { key: "carnet_salud", label: "Carnet de Salud" },
                    { key: "historia_clinica", label: "Historia Clínica" },
                    { key: "examenes_previos", label: "Exámenes Previos" },
                    { key: "otros", label: "Otros Documentos" }
                  ].map((docType) => (
                    <div key={docType.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {docType.label}
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setDocuments({ ...documents, [docType.key]: file });
                            }
                          }}
                          className="block w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100
                            dark:file:bg-indigo-900 dark:file:text-indigo-200"
                        />
                        {documents[docType.key] && (
                          <span className="text-sm text-green-600 dark:text-green-400">
                            ✓ {documents[docType.key].name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmación y Facturación</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Resumen</h4>
                  <p className="text-sm"><strong>Paciente:</strong> {patient?.nombres} {patient?.apellidos}</p>
                  <p className="text-sm"><strong>DNI:</strong> {patient?.dni}</p>
                  <p className="text-sm"><strong>Tipo de Examen:</strong> {form.tipo_examen}</p>
                  <p className="text-sm"><strong>Fecha y Hora:</strong> {form.fecha_programada} {form.hora}</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Comprobante *</label>
                      <select
                        value={form.tipo_comprobante}
                        onChange={(e) => setForm({ ...form, tipo_comprobante: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="03">Boleta</option>
                        <option value="01">Factura</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                      <select
                        value={form.metodo_pago}
                        onChange={(e) => setForm({ ...form, metodo_pago: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Seleccione</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="yape">Yape</option>
                        <option value="plin">Plin</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.metodo_pago}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? "Procesando..." : "Confirmar y Crear Admisión"}
                  </button>
                </div>
              </div>
            )}
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

