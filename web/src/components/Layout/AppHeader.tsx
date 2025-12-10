import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Avatar from "react-avatar";
import ThemeToggle from "../ThemeToggle";
import LanguageSelector from "../LanguageSelector";

interface AppHeaderProps {
  user?: {
    name?: string;
    nombres?: string;
    apellidos?: string;
    role?: string;
    rol?: string;
    email: string;
  };
  onMenuClick?: () => void;
}

export default function AppHeader({ user, onMenuClick }: AppHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
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
    if (user?.name) return user.name;
    if (user?.nombres && user?.apellidos) {
      return `${user.nombres} ${user.apellidos}`;
    }
    return user?.email || "Usuario";
  };

  const getUserRole = () => {
    return user?.rol || user?.role || "patient";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-3">
            {/* Botón menú móvil */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Sistema de Salud Laboral</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user && (
              <>
                <LanguageSelector />
                <ThemeToggle />
                <button
                  onClick={() => navigate("/perfil")}
                  className="flex items-center space-x-2 p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title={t("nav.profile")}
                >
                  <Avatar
                    name={getUserName()}
                    size="36"
                    round={true}
                    className="flex-shrink-0"
                    color="#4F46E5"
                  />
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32 lg:max-w-none">{getUserName()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleLabel(getUserRole())}</p>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <span className="hidden sm:inline">{t("common.logout")}</span>
                  <span className="sm:hidden">🚪</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

