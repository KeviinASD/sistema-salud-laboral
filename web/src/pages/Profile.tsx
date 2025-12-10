import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import Avatar from "react-avatar";

interface UserProfile {
  id: string;
  dni: string;
  email: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  rol: string;
  especialidad: string | null;
  colegiatura: string | null;
  activo: boolean;
}

export default function Profile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    especialidad: "",
    colegiatura: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/me");
      const userData = res.data.user;
      setProfile(userData);
      setFormData({
        email: userData.email || "",
        nombres: userData.nombres || "",
        apellidos: userData.apellidos || "",
        telefono: userData.telefono || "",
        especialidad: userData.especialidad || "",
        colegiatura: userData.colegiatura || ""
      });
    } catch (error: any) {
      setError("Error al cargar el perfil: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.put("/profile", formData);
      setProfile(res.data.user);
      setSuccess("Perfil actualizado correctamente");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      setError("Error al actualizar el perfil: " + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      await api.put("/profile/password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess("Contraseña actualizada correctamente");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      setError("Error al actualizar la contraseña: " + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "Usuario";
    const normalizedRole = role.toLowerCase();
    const roles: { [key: string]: string } = {
      admin: "Administrador",
      admissions: "Admisiones",
      doctor: "Médico",
      lab: "Laboratorio",
      patient: "Paciente"
    };
    return roles[normalizedRole] || role;
  };

  const getUserName = () => {
    if (profile?.nombres && profile?.apellidos) {
      return `${profile.nombres} ${profile.apellidos}`;
    }
    return profile?.email || "Usuario";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-4 sm:py-6">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t("profile.title")}</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">{t("profile.subtitle")}</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          {profile && (
            <div className="space-y-6">
              {/* Información del perfil */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                  <Avatar
                    name={getUserName()}
                    size="120"
                    round={true}
                    className="flex-shrink-0"
                    color="#4F46E5"
                  />
                  <div className="text-center sm:text-left flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getUserName()}</h2>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">{getRoleLabel(profile.rol)}</p>
                    <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
                    {profile.dni && (
                      <p className="text-sm text-gray-500 mt-1">DNI: {profile.dni}</p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="nombres" className="block text-sm font-medium text-gray-700 mb-1">
                        Nombres
                      </label>
                      <input
                        type="text"
                        id="nombres"
                        name="nombres"
                        value={formData.nombres}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700 mb-1">
                        Apellidos
                      </label>
                      <input
                        type="text"
                        id="apellidos"
                        name="apellidos"
                        value={formData.apellidos}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {(profile.rol === "doctor" || profile.rol === "DOCTOR") && (
                      <>
                        <div>
                          <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 mb-1">
                            Especialidad
                          </label>
                          <input
                            type="text"
                            id="especialidad"
                            name="especialidad"
                            value={formData.especialidad}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="colegiatura" className="block text-sm font-medium text-gray-700 mb-1">
                            Colegiatura
                          </label>
                          <input
                            type="text"
                            id="colegiatura"
                            name="colegiatura"
                            value={formData.colegiatura}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Cambiar contraseña */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h3>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {showPasswordForm ? "Ocultar" : "Mostrar"}
                  </button>
                </div>

                {showPasswordForm && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña Actual
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Nueva Contraseña
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "Actualizando..." : "Actualizar Contraseña"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

