import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

export default function Admin() {
  const { t } = useTranslation();
  const { showSuccess, showError, showConfirm } = useToast();
  const [activeTab, setActiveTab] = useState("usuarios");
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ email: "", name: "", password: "", dni: "", role: "ADMISSIONS" });
  const [settings, setSettings] = useState<any>({});
  const [settingEdit, setSettingEdit] = useState<any>({ key: "clinic_name", value: "" });
  const [items, setItems] = useState<any[]>([]);
  const [itemForm, setItemForm] = useState<any>({ name: "", sku: "", unit: "unidad", stock: 0, minStock: 0 });
  const [movementForm, setMovementForm] = useState<any>({ itemId: "", type: "in", quantity: 1, note: "" });
  const [shifts, setShifts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [shiftForm, setShiftForm] = useState<any>({
    medico_id: "",
    dia_semana: 1,
    hora_inicio: "08:00:00",
    hora_fin: "17:00:00",
    duracion_cita: 30,
    max_citas_dia: 20,
    activo: true
  });
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [examTypeForm, setExamTypeForm] = useState<any>({
    codigo: "",
    nombre: "",
    descripcion: "",
    duracion_minutos: 30,
    requiere_laboratorio: false,
    requiere_radiografia: false,
    precio_base: "",
    activo: true
  });
  const [editingExamType, setEditingExamType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clinicConfig, setClinicConfig] = useState<any>({ name: "", ruc: "", address: "", phone: "", email: "" });
  const [loadingClinicConfig, setLoadingClinicConfig] = useState(false);

  useEffect(() => {
    loadData();
    loadClinicConfig();
  }, []);

  const loadClinicConfig = async () => {
    try {
      const res = await api.get("/clinic/config");
      if (res.data) {
        setClinicConfig({
          name: res.data.name || "",
          ruc: res.data.ruc || "",
          address: res.data.address || "",
          phone: res.data.phone || "",
          email: res.data.email || ""
        });
      }
    } catch (error) {
      console.error("Error cargando configuración de clínica:", error);
    }
  };

  const saveClinicConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingClinicConfig(true);
    try {
      await api.put("/clinic/config", clinicConfig);
      showSuccess("Configuración de clínica guardada exitosamente");
      await loadClinicConfig();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al guardar configuración");
    } finally {
      setLoadingClinicConfig(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Cargar usuarios
      try {
        const usersRes = await api.get("/users");
        setUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : 
                 (Array.isArray(usersRes.data) ? usersRes.data : []));
      } catch (error) {
        setUsers([]);
      }

      // Cargar configuración
      try {
        const settingsRes = await api.get("/admin/settings");
        setSettings(settingsRes.data || {});
      } catch (error) {
        // Intentar endpoint alternativo
        try {
          const settingsRes = await api.get("/settings");
          setSettings(settingsRes.data || {});
        } catch (e) {
          setSettings({});
        }
      }

      // Cargar inventario
      try {
        const itemsRes = await api.get("/inventario/items");
        setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      } catch (error) {
        try {
          const itemsRes = await api.get("/inventory/items");
          setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
        } catch (e) {
          setItems([]);
        }
      }

      // Cargar turnos/horarios
      try {
        const shiftsRes = await api.get("/admissions/shifts");
        setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : []);
      } catch (error) {
        setShifts([]);
      }

      // Cargar doctores
      try {
        const doctorsRes = await api.get("/users?rol=doctor");
        setDoctors(Array.isArray(doctorsRes.data?.data) ? doctorsRes.data.data : 
                   (Array.isArray(doctorsRes.data) ? doctorsRes.data : []));
      } catch (error) {
        setDoctors([]);
      }

      // Cargar tipos de examen
      try {
        const examTypesRes = await api.get("/admissions/exam-types");
        setExamTypes(Array.isArray(examTypesRes.data) ? examTypesRes.data : []);
      } catch (error) {
        setExamTypes([]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const userData = {
        email: form.email,
        nombres: form.name.split(" ")[0] || form.name,
        apellidos: form.name.split(" ").slice(1).join(" ") || "",
        password: form.password,
        rol: form.role.toLowerCase(),
        dni: form.dni || "00000000",
        telefono: "",
        activo: true
      };
      const r = await api.post("/users", userData);
      await loadData();
      setForm({ email: "", name: "", password: "", dni: "", role: "ADMISSIONS" });
      showSuccess("Usuario creado exitosamente");
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al crear usuario");
    }
  }
  async function saveSetting(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.put("/admin/settings", settingEdit);
      await loadData();
      setSettingEdit({ key: "clinic_name", value: "" });
      showSuccess("Configuración guardada");
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al guardar configuración");
    }
  }
  
  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const itemData = {
        codigo: itemForm.sku,
        nombre: itemForm.name,
        categoria: "general",
        stock_actual: itemForm.stock,
        stock_minimo: itemForm.minStock,
        unidad_medida: itemForm.unit
      };
      await api.post("/inventario/items", itemData);
      await loadData();
      setItemForm({ name: "", sku: "", unit: "unidad", stock: 0, minStock: 0 });
      showSuccess("Item creado exitosamente");
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al crear item");
    }
  }
  
  async function recordMovement(e: React.FormEvent) {
    e.preventDefault();
    try {
      const movementData = {
        item_id: movementForm.itemId,
        tipo_movimiento: movementForm.type === "in" ? "entrada" : "salida",
        cantidad: movementForm.quantity,
        motivo: movementForm.note
      };
      await api.post("/inventario/movimientos", movementData);
      await loadData();
      setMovementForm({ itemId: "", type: "in", quantity: 1, note: "" });
      showSuccess("Movimiento registrado");
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al registrar movimiento");
    }
  }

  const diasSemana = [
    { value: 0, label: "Domingo" },
    { value: 1, label: "Lunes" },
    { value: 2, label: "Martes" },
    { value: 3, label: "Miércoles" },
    { value: 4, label: "Jueves" },
    { value: 5, label: "Viernes" },
    { value: 6, label: "Sábado" }
  ];

  async function saveShift(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingShift) {
        await api.put(`/admissions/shifts/${editingShift}`, shiftForm);
        showSuccess("Horario actualizado exitosamente");
      } else {
        await api.post("/admissions/shifts", shiftForm);
        showSuccess("Horario creado exitosamente");
      }
      await loadData();
      setShiftForm({
        medico_id: "",
        dia_semana: 1,
        hora_inicio: "08:00:00",
        hora_fin: "17:00:00",
        duracion_cita: 30,
        max_citas_dia: 20,
        activo: true
      });
      setEditingShift(null);
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al guardar horario");
    }
  }

  async function deleteShift(id: string) {
    showConfirm(
      "¿Está seguro de eliminar este horario?",
      async () => {
        try {
          await api.delete(`/admissions/shifts/${id}`);
          await loadData();
          showSuccess("Horario eliminado exitosamente");
        } catch (error: any) {
          showError(error.response?.data?.error || "Error al eliminar horario");
        }
      }
    );
  }

  function editShift(shift: any) {
    setShiftForm({
      medico_id: shift.medico_id || "",
      dia_semana: shift.dia_semana,
      hora_inicio: shift.hora_inicio,
      hora_fin: shift.hora_fin,
      duracion_cita: shift.duracion_cita,
      max_citas_dia: shift.max_citas_dia,
      activo: shift.activo
    });
    setEditingShift(shift.id);
  }

  async function saveExamType(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingExamType) {
        await api.put(`/admissions/exam-types/${editingExamType}`, examTypeForm);
        showSuccess("Tipo de examen actualizado exitosamente");
      } else {
        await api.post("/admissions/exam-types", examTypeForm);
        showSuccess("Tipo de examen creado exitosamente");
      }
      await loadData();
      setExamTypeForm({
        codigo: "",
        nombre: "",
        descripcion: "",
        duracion_minutos: 30,
        requiere_laboratorio: false,
        requiere_radiografia: false,
        precio_base: "",
        activo: true
      });
      setEditingExamType(null);
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al guardar tipo de examen");
    }
  }

  async function deleteExamType(id: string) {
    showConfirm(
      "¿Está seguro de desactivar este tipo de examen?",
      async () => {
        try {
          await api.delete(`/admissions/exam-types/${id}`);
          await loadData();
          showSuccess("Tipo de examen desactivado exitosamente");
        } catch (error: any) {
          showError(error.response?.data?.error || "Error al desactivar tipo de examen");
        }
      }
    );
  }

  function editExamType(examType: any) {
    setExamTypeForm({
      codigo: examType.codigo,
      nombre: examType.nombre,
      descripcion: examType.descripcion || "",
      duracion_minutos: examType.duracion_minutos,
      requiere_laboratorio: examType.requiere_laboratorio,
      requiere_radiografia: examType.requiere_radiografia,
      precio_base: examType.precio_base || "",
      activo: examType.activo
    });
    setEditingExamType(examType.id);
  }

  const tabs = [
    { id: "usuarios", label: "Usuarios" },
    { id: "clinica", label: "Configuración Clínica" },
    { id: "horarios", label: "Horarios" },
    { id: "examenes", label: "Tipos de Examen" },
    { id: "inventario", label: "Inventario" }
  ];

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">{t("admin.title")}</h2>
          
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
            {/* Pestaña: Usuarios */}
            {activeTab === "usuarios" && (
              <div className="p-4 sm:p-6">
                <div className="mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">{t("admin.newUser")}</h3>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 max-w-full sm:max-w-md">
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={t("admin.email")}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            type="email"
            required
          />
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={t("admin.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="DNI"
            type="text"
            value={form.dni}
            onChange={(e) => setForm({ ...form, dni: e.target.value })}
            maxLength={8}
          />
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="ADMISSIONS">ADMISSIONS</option>
            <option value="DOCTOR">DOCTOR</option>
            <option value="LAB">LAB</option>
            <option value="PATIENT">PATIENT</option>
          </select>
          <button
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            type="submit"
          >
            {t("admin.newUser")}
          </button>
        </form>
      </div>
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white">{t("admin.users")}</h3>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Actualizar
                    </button>
      </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t("common.noData")}</p>
        ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Email
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Rol
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {u.nombres || u.name} {u.apellidos || ""}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {u.email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {u.rol || u.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  u.activo !== false 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}>
                                  {u.activo !== false ? "Activo" : "Inactivo"}
                                </span>
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

            {/* Pestaña: Configuración Clínica */}
            {activeTab === "clinica" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">Configuración de la Clínica</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Estos datos aparecerán en las boletas y facturas generadas.
        </p>
        <form onSubmit={saveClinicConfig} className="grid grid-cols-1 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la Clínica *
            </label>
            <input
              type="text"
              value={clinicConfig.name}
              onChange={(e) => setClinicConfig({ ...clinicConfig, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ej: Clínica San José"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              RUC *
            </label>
            <input
              type="text"
              value={clinicConfig.ruc}
              onChange={(e) => setClinicConfig({ ...clinicConfig, ruc: e.target.value })}
              required
              maxLength={11}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="12345678901"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={clinicConfig.address}
              onChange={(e) => setClinicConfig({ ...clinicConfig, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ej: Av. Principal 123, Lima"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={clinicConfig.phone}
                onChange={(e) => setClinicConfig({ ...clinicConfig, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ej: 01-2345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={clinicConfig.email}
                onChange={(e) => setClinicConfig({ ...clinicConfig, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ej: contacto@clinica.com"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loadingClinicConfig}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 dark:bg-green-600 hover:bg-green-800 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loadingClinicConfig ? "Guardando..." : "Guardar Configuración"}
          </button>
        </form>
              </div>
            )}

            {/* Pestaña: Horarios */}
            {activeTab === "horarios" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">Configuración de Horarios Disponibles</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Configure los horarios disponibles para las citas. Si no hay horarios configurados, no se podrán crear nuevas admisiones.
                </p>
                <form onSubmit={saveShift} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <select
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={shiftForm.medico_id}
                    onChange={(e) => setShiftForm({ ...shiftForm, medico_id: e.target.value })}
                  >
                    <option value="">Todos los médicos</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.nombres} {doc.apellidos}
                      </option>
                    ))}
                  </select>
                  <select
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={shiftForm.dia_semana}
                    onChange={(e) => setShiftForm({ ...shiftForm, dia_semana: parseInt(e.target.value) })}
                    required
                  >
                    {diasSemana.map((dia) => (
                      <option key={dia.value} value={dia.value}>
                        {dia.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    step="1"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={shiftForm.hora_inicio.substring(0, 5)}
                    onChange={(e) => setShiftForm({ ...shiftForm, hora_inicio: `${e.target.value}:00` })}
                    required
                  />
                  <input
                    type="time"
                    step="1"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={shiftForm.hora_fin.substring(0, 5)}
                    onChange={(e) => setShiftForm({ ...shiftForm, hora_fin: `${e.target.value}:00` })}
                    required
                  />
                  <input
                    type="number"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Duración cita (min)"
                    value={shiftForm.duracion_cita}
                    onChange={(e) => setShiftForm({ ...shiftForm, duracion_cita: parseInt(e.target.value) || 30 })}
                    min="15"
                    step="15"
                    required
                  />
                  <input
                    type="number"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Max citas/día"
                    value={shiftForm.max_citas_dia}
                    onChange={(e) => setShiftForm({ ...shiftForm, max_citas_dia: parseInt(e.target.value) || 20 })}
                    min="1"
                    required
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="activo"
                      className="mr-2"
                      checked={shiftForm.activo}
                      onChange={(e) => setShiftForm({ ...shiftForm, activo: e.target.checked })}
                    />
                    <label htmlFor="activo" className="text-gray-700 dark:text-gray-300">Activo</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      {editingShift ? "Actualizar" : "Crear"} Horario
                    </button>
                    {editingShift && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShift(null);
                          setShiftForm({
                            medico_id: "",
                            dia_semana: 1,
                            hora_inicio: "08:00:00",
                            hora_fin: "17:00:00",
                            duracion_cita: 30,
                            max_citas_dia: 20,
                            activo: true
                          });
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-gray-700 dark:text-white">Horarios Configurados</h4>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Actualizar
                    </button>
                  </div>
                  {shifts.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay horarios configurados</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Día
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Médico
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Horario
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Duración
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {shifts.map((shift) => (
                            <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {diasSemana.find(d => d.value === shift.dia_semana)?.label}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {shift.medico ? `Dr. ${shift.medico.nombres} ${shift.medico.apellidos}` : "Todos"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {shift.hora_inicio.substring(0, 5)} - {shift.hora_fin.substring(0, 5)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {shift.duracion_cita} min
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  shift.activo 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {shift.activo ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => editShift(shift)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => deleteShift(shift.id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                >
                                  Eliminar
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

            {/* Pestaña: Tipos de Examen */}
            {activeTab === "examenes" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">Tipos de Examen</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure los tipos de examen disponibles para las admisiones.
        </p>
        <form onSubmit={saveExamType} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Código (ej: ING001)"
            value={examTypeForm.codigo}
            onChange={(e) => setExamTypeForm({ ...examTypeForm, codigo: e.target.value })}
            required
          />
          <input
            type="text"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Nombre del examen"
            value={examTypeForm.nombre}
            onChange={(e) => setExamTypeForm({ ...examTypeForm, nombre: e.target.value })}
            required
          />
          <input
            type="text"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Descripción"
            value={examTypeForm.descripcion}
            onChange={(e) => setExamTypeForm({ ...examTypeForm, descripcion: e.target.value })}
          />
          <input
            type="number"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Duración (minutos)"
            value={examTypeForm.duracion_minutos}
            onChange={(e) => setExamTypeForm({ ...examTypeForm, duracion_minutos: parseInt(e.target.value) || 30 })}
            min="15"
            step="15"
            required
          />
          <input
            type="number"
            step="0.01"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Precio base (opcional)"
            value={examTypeForm.precio_base}
            onChange={(e) => setExamTypeForm({ ...examTypeForm, precio_base: e.target.value })}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={examTypeForm.requiere_laboratorio}
                onChange={(e) => setExamTypeForm({ ...examTypeForm, requiere_laboratorio: e.target.checked })}
              />
              <span className="text-gray-700 dark:text-gray-300">Requiere Laboratorio</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={examTypeForm.requiere_radiografia}
                onChange={(e) => setExamTypeForm({ ...examTypeForm, requiere_radiografia: e.target.checked })}
              />
              <span className="text-gray-700 dark:text-gray-300">Requiere Radiografía</span>
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="examTypeActivo"
              className="mr-2"
              checked={examTypeForm.activo}
              onChange={(e) => setExamTypeForm({ ...examTypeForm, activo: e.target.checked })}
            />
            <label htmlFor="examTypeActivo" className="text-gray-700 dark:text-gray-300">Activo</label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {editingExamType ? "Actualizar" : "Crear"} Tipo
            </button>
            {editingExamType && (
              <button
                type="button"
                onClick={() => {
                  setEditingExamType(null);
                  setExamTypeForm({
                    codigo: "",
                    nombre: "",
                    descripcion: "",
                    duracion_minutos: 30,
                    requiere_laboratorio: false,
                    requiere_radiografia: false,
                    precio_base: "",
                    activo: true
                  });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-gray-700 dark:text-white">Tipos de Examen Configurados</h4>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Actualizar
                    </button>
                  </div>
                  {examTypes.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay tipos de examen configurados</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Código
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Duración
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Precio
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {examTypes.map((examType) => (
                            <tr key={examType.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{examType.codigo}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-white">{examType.nombre}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{examType.duracion_minutos} min</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {examType.precio_base ? `S/ ${examType.precio_base}` : "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  examType.activo 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {examType.activo ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => editExamType(examType)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => deleteExamType(examType.id)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                >
                                  Desactivar
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

            {/* Pestaña: Inventario */}
            {activeTab === "inventario" && (
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-white mb-4">{t("admin.inventory")}</h3>
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 dark:text-white mb-3">Crear Item</h4>
                  <form onSubmit={createItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="Nombre" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="SKU" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} required />
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="Unidad" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" type="number" placeholder="Stock" value={itemForm.stock} onChange={(e) => setItemForm({ ...itemForm, stock: parseInt(e.target.value || "0") })} />
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" type="number" placeholder="Stock mínimo" value={itemForm.minStock} onChange={(e) => setItemForm({ ...itemForm, minStock: parseInt(e.target.value || "0") })} />
                    <button className="bg-blue-700 dark:bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-800 dark:hover:bg-blue-700" type="submit">{t("common.create")}</button>
                  </form>
                </div>
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 dark:text-white mb-3">Registrar Movimiento</h4>
                  <form onSubmit={recordMovement} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={movementForm.itemId} onChange={(e) => setMovementForm({ ...movementForm, itemId: e.target.value })} required>
                      <option value="">Selecciona ítem</option>
                      {items.map((it) => (<option key={it.id} value={it.id}>{it.nombre || it.name} ({it.codigo || it.sku})</option>))}
                    </select>
                    <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}>
                      <option value="in">Entrada</option>
                      <option value="out">Salida</option>
                    </select>
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" type="number" placeholder="Cantidad" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value || "0") })} required />
                    <input className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" placeholder="Nota" value={movementForm.note} onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} />
                    <button className="bg-indigo-700 dark:bg-indigo-600 text-white rounded px-3 py-2 hover:bg-indigo-800 dark:hover:bg-indigo-700 col-span-full md:col-span-1" type="submit">Registrar Movimiento</button>
                  </form>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold text-gray-700 dark:text-white">Inventario</h4>
                    <button
                      onClick={loadData}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Actualizar
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t("common.noData")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              SKU/Código
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Stock Actual
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Stock Mínimo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Unidad
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {items.map((it) => {
                            const stockActual = it.stock_actual || it.stock || 0;
                            const stockMinimo = it.stock_minimo || 0;
                            const stockBajo = stockMinimo > 0 && stockActual < stockMinimo;
                            return (
                              <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {it.nombre || it.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 dark:text-white">
                                    {it.codigo || it.sku || "N/A"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {stockActual}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 dark:text-white">
                                    {stockMinimo || "—"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900 dark:text-white">
                                    {it.unidad_medida || it.unit || "unidad"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {stockBajo ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                      Stock Bajo
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      Normal
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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
