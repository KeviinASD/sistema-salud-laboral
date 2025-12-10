import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", path: "/", icon: "📊", roles: ["admin", "admissions", "doctor", "lab"] },
  { name: "Admisiones", path: "/admisiones", icon: "📋", roles: ["admin", "admissions"] },
  { name: "Historia Clínica", path: "/medico", icon: "🏥", roles: ["admin", "doctor"] },
  { name: "Laboratorio", path: "/laboratorio", icon: "🔬", roles: ["admin", "lab"] },
  { name: "Concepto Aptitud", path: "/concepto-aptitud", icon: "📄", roles: ["admin", "doctor"] },
  { name: "Facturación", path: "/facturacion", icon: "💰", roles: ["admin"] },
  { name: "Inventario", path: "/inventario", icon: "📦", roles: ["admin"] },
  { name: "Biométrico", path: "/biometric", icon: "👆", roles: ["admin", "admissions"] },
  { name: "Reportes", path: "/reportes", icon: "📈", roles: ["admin"] },
  { name: "Administración", path: "/admin", icon: "⚙️", roles: ["admin"] }
];

interface AppSidebarProps {
  userRole: string;
  onClose?: () => void;
}

export default function AppSidebar({ userRole, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  // Normalizar el rol a minúsculas
  const normalizedRole = userRole?.toLowerCase() || "patient";
  
  const menuItemsTranslated: MenuItem[] = [
    { name: t("nav.dashboard"), path: "/", icon: "📊", roles: ["admin", "admissions", "doctor", "lab"] },
    { name: t("nav.admissions"), path: "/admisiones", icon: "📋", roles: ["admin", "admissions"] },
    { name: t("nav.medical"), path: "/medico", icon: "🏥", roles: ["admin", "doctor"] },
    { name: t("nav.lab"), path: "/laboratorio", icon: "🔬", roles: ["admin", "lab"] },
    { name: t("nav.aptitude"), path: "/concepto-aptitud", icon: "📄", roles: ["admin", "doctor"] },
    { name: t("nav.billing"), path: "/facturacion", icon: "💰", roles: ["admin"] },
    { name: t("nav.inventory"), path: "/inventario", icon: "📦", roles: ["admin"] },
    { name: t("nav.biometric"), path: "/biometric", icon: "👆", roles: ["admin", "admissions"] },
    { name: t("nav.reports"), path: "/reportes", icon: "📈", roles: ["admin"] },
    { name: t("nav.admin"), path: "/admin", icon: "⚙️", roles: ["admin"] }
  ];
  
  // Debug: mostrar el rol en consola (puedes remover esto después)
  React.useEffect(() => {
    console.log("Rol del usuario en Sidebar:", normalizedRole);
    console.log("Menú items disponibles:", menuItems.map(m => m.name));
  }, [normalizedRole]);
  
  const filteredMenu = menuItemsTranslated.filter(item => 
    item.roles.includes(normalizedRole) || normalizedRole === "admin"
  );

  return (
    <nav className="w-64 bg-white dark:bg-gray-800 shadow-lg lg:shadow-sm border-r border-gray-200 dark:border-gray-700 fixed lg:fixed top-14 sm:top-16 left-0 bottom-0 p-4 overflow-y-auto z-40">
      {/* Botón cerrar en móvil */}
      {onClose && (
        <div className="flex justify-between items-center mb-4 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menú</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Cerrar menú"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="space-y-1">
        {filteredMenu.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Separador */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
        
        {/* Enlace al perfil - disponible para todos */}
        <Link
          to="/perfil"
          onClick={onClose}
          className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === "/perfil"
              ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <span className="mr-3 text-lg">👤</span>
          <span className="truncate">{t("nav.profile")}</span>
        </Link>
      </div>
    </nav>
  );
}

