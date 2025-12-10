import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    api
      .get("/me")
      .then((res) => {
        const userData = res.data.user;
        // Normalizar el objeto usuario para tener ambos campos (rol y role)
        if (userData) {
          userData.role = userData.rol || userData.role;
          userData.name = `${userData.nombres || userData.name || ""} ${userData.apellidos || ""}`.trim() || userData.name;
        }
        setUser(userData);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Normalizar el rol a minúsculas para que coincida con el sidebar
  const userRole = user?.rol?.toLowerCase() || user?.role?.toLowerCase() || "patient";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Sidebar Desktop - Fijo */}
      <div className="hidden lg:block">
        <AppSidebar userRole={userRole} />
      </div>
      
      {/* Sidebar Mobile - Overlay */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden top-14 sm:top-16">
            <AppSidebar userRole={userRole} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
      
      {/* Contenido principal con scroll */}
      <main className="pt-14 sm:pt-16 lg:pl-64 min-h-screen overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

