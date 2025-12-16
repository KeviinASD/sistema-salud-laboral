import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  ClipboardList, 
  Stethoscope, 
  Beaker, 
  FileCheck2,
  Receipt,
  Package,
  Fingerprint,
  TrendingUp,
  Settings,
  User,
  X,
  LucideIcon
} from "lucide-react";

interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
  roles: string[];
  badge?: number;
}

interface AppSidebarProps {
  userRole: string;
  onClose?: () => void;
}

export default function AppSidebar({ userRole, onClose }: AppSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const normalizedRole = userRole?.toLowerCase() || "patient";
  
  const menuItemsTranslated: MenuItem[] = [
    { 
      name: t("nav.dashboard"), 
      path: "/", 
      icon: LayoutDashboard, 
      roles: ["admin", "admissions", "doctor", "lab"]
    },
    { 
      name: t("nav.admissions"), 
      path: "/admisiones", 
      icon: ClipboardList, 
      roles: ["admin", "admissions"]
    },
    { 
      name: t("nav.medical"), 
      path: "/medico", 
      icon: Stethoscope, 
      roles: ["admin", "doctor"]
    },
    { 
      name: t("nav.lab"), 
      path: "/laboratorio", 
      icon: Beaker, 
      roles: ["admin", "lab"]
    },
    { 
      name: t("nav.aptitude"), 
      path: "/concepto-aptitud", 
      icon: FileCheck2, 
      roles: ["admin", "doctor"]
    },
    { 
      name: t("nav.billing"), 
      path: "/facturacion", 
      icon: Receipt, 
      roles: ["admin"]
    },
    { 
      name: t("nav.inventory"), 
      path: "/inventario", 
      icon: Package, 
      roles: ["admin"]
    },
    { 
      name: t("nav.biometric"), 
      path: "/biometric", 
      icon: Fingerprint, 
      roles: ["admin", "admissions"]
    },
    { 
      name: t("nav.reports"), 
      path: "/reportes", 
      icon: TrendingUp, 
      roles: ["admin"]
    },
    { 
      name: t("nav.admin"), 
      path: "/admin", 
      icon: Settings, 
      roles: ["admin"]
    }
  ];
  
  React.useEffect(() => {
    console.log("Rol del usuario en Sidebar:", normalizedRole);
  }, [normalizedRole]);
  
  const filteredMenu = menuItemsTranslated.filter(item => 
    item.roles.includes(normalizedRole) || normalizedRole === "admin"
  );

  return (
    <nav className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed lg:fixed top-14 sm:top-16 left-0 bottom-0 overflow-y-auto z-40">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-gray-900 dark:text-white text-sm font-semibold">Menú</h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 capitalize">{normalizedRole}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-3 space-y-1">
        {filteredMenu.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium 
                transition-colors duration-150
                ${isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }
              `}
            >
              <Icon 
                className="h-5 w-5 flex-shrink-0"
                strokeWidth={2}
              />
              <span className="truncate">{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        
        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800 my-3"></div>
        
        {/* Profile Link */}
        <Link
          to="/perfil"
          onClick={onClose}
          className={`
            group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium 
            transition-colors duration-150
            ${location.pathname === "/perfil"
              ? "bg-blue-600 text-white"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }
          `}
        >
          <User 
            className="h-5 w-5 flex-shrink-0"
            strokeWidth={2}
          />
          <span className="truncate">{t("nav.profile")}</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
          <p className="font-medium">Sistema de Salud Laboral</p>
          <p className="text-[10px] mt-0.5 opacity-75">v1.0.0</p>
        </div>
      </div>
    </nav>
  );
}

