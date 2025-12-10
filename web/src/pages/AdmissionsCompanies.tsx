import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

interface Company {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  telefono?: string;
  contacto_nombre?: string;
  contacto_email?: string;
  activo: boolean;
  fecha_registro: string;
}

export default function AdmissionsCompanies() {
  const { t } = useTranslation();
  const { showSuccess, showError, showConfirm } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    ruc: "",
    razon_social: "",
    nombre_comercial: "",
    direccion: "",
    telefono: "",
    contacto_nombre: "",
    contacto_email: ""
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admissions/companies");
      setCompanies(res.data || []);
    } catch (error) {
      console.error("Error cargando empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await api.put(`/admissions/companies/${editingCompany.id}`, form);
      } else {
        await api.post("/admissions/companies", form);
      }
      setShowForm(false);
      setEditingCompany(null);
      setForm({
        ruc: "",
        razon_social: "",
        nombre_comercial: "",
        direccion: "",
        telefono: "",
        contacto_nombre: "",
        contacto_email: ""
      });
      await loadCompanies();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al guardar empresa");
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({
      ruc: company.ruc,
      razon_social: company.razon_social,
      nombre_comercial: company.nombre_comercial || "",
      direccion: company.direccion || "",
      telefono: company.telefono || "",
      contacto_nombre: company.contacto_nombre || "",
      contacto_email: company.contacto_email || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      "¿Está seguro de eliminar esta empresa?",
      async () => {
        try {
          await api.delete(`/admissions/companies/${id}`);
          await loadCompanies();
          showSuccess("Empresa eliminada exitosamente");
        } catch (error: any) {
          showError(error.response?.data?.error || "Error al eliminar empresa");
        }
      }
    );
  };

  const toggleStatus = async (company: Company) => {
    try {
      await api.put(`/admissions/companies/${company.id}`, {
        activo: !company.activo
      });
      await loadCompanies();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al actualizar estado");
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.ruc.includes(searchQuery) ||
    (company.nombre_comercial && company.nombre_comercial.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Empresas</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">Administración de empresas clientes</p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingCompany(null);
                setForm({
                  ruc: "",
                  razon_social: "",
                  nombre_comercial: "",
                  direccion: "",
                  telefono: "",
                  contacto_nombre: "",
                  contacto_email: ""
                });
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              ➕ Nueva Empresa
            </button>
          </div>

          {/* Formulario */}
          {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingCompany ? "Editar Empresa" : "Nueva Empresa"}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RUC *</label>
                  <input
                    type="text"
                    value={form.ruc}
                    onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                    required
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="12345678901"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                  <input
                    type="text"
                    value={form.razon_social}
                    onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={form.nombre_comercial}
                    onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto - Nombre</label>
                  <input
                    type="text"
                    value={form.contacto_nombre}
                    onChange={(e) => setForm({ ...form, contacto_nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto - Email</label>
                  <input
                    type="email"
                    value={form.contacto_email}
                    onChange={(e) => setForm({ ...form, contacto_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCompany(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    {editingCompany ? "Actualizar" : "Crear"} Empresa
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Búsqueda */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <input
              type="text"
              placeholder="Buscar por RUC, razón social o nombre comercial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Lista de Empresas */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando empresas...</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No se encontraron empresas
              </div>
            ) : (
              <>
                {/* Vista móvil - Cards */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredCompanies.map((company) => (
                    <div key={company.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{company.razon_social}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">RUC: {company.ruc}</p>
                            {company.nombre_comercial && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Nombre Comercial: {company.nombre_comercial}</p>
                            )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            company.activo
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {company.activo ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      {company.contacto_nombre && (
                        <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                          <p className="font-medium">Contacto: {company.contacto_nombre}</p>
                          {company.contacto_email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{company.contacto_email}</p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(company)}
                          className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleStatus(company)}
                          className={`px-3 py-1 text-xs rounded ${
                            company.activo 
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {company.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista desktop - Tabla */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          RUC
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Razón Social
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Nombre Comercial
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Contacto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredCompanies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {company.ruc}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {company.razon_social}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {company.nombre_comercial || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {company.contacto_nombre && (
                              <div>
                                <div>{company.contacto_nombre}</div>
                                {company.contacto_email && (
                                  <div className="text-xs text-gray-400">{company.contacto_email}</div>
                                )}
                              </div>
                            )}
                            {!company.contacto_nombre && "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                company.activo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {company.activo ? "Activa" : "Inactiva"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(company)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => toggleStatus(company)}
                                className={company.activo ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                              >
                                {company.activo ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                onClick={() => handleDelete(company.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

