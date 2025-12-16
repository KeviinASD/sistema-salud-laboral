import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Avatar from "react-avatar";
import { LogOut, User } from "lucide-react";
// import ThemeToggle from "../ThemeToggle";
// import LanguageSelector from "../LanguageSelector";

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y título */}
          <div className="flex items-center gap-4">
            {/* Botón menú móvil */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo/Icono */}
            <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            {/* Título */}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">
                Sistema de Salud Laboral
              </h1>
              <p className="hidden md:block text-xs text-blue-100">Gestión Integral</p>
            </div>
          </div>

          {/* Acciones del usuario */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <>
                {/* Selector de idioma - Comentado */}
                {/* <LanguageSelector /> */}
                
                {/* Toggle de tema - Comentado */}
                {/* <ThemeToggle /> */}

                {/* Perfil del usuario */}
                <button
                  onClick={() => navigate("/perfil")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                  title={t("nav.profile")}
                >
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-semibold text-white truncate max-w-40">
                      {getUserName()}
                    </p>
                    <p className="text-xs text-blue-100">
                      {getRoleLabel(getUserRole())}
                    </p>
                  </div>
                  <Avatar
                    name={getUserName()}
                    size="40"
                    round={true}
                    className="flex-shrink-0 ring-2 ring-white/20"
                    color="#3B82F6"
                  />
                </button>

                {/* Botón cerrar sesión */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-red-600 text-white font-medium transition-colors backdrop-blur-sm"
                  title={t("common.logout")}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{t("common.logout")}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

