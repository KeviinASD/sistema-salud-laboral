import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import AdmissionsNew from "./pages/AdmissionsNew";
import AdmissionsDetail from "./pages/AdmissionsDetail";
import AdmissionsCalendar from "./pages/AdmissionsCalendar";
import AdmissionsCompanies from "./pages/AdmissionsCompanies";
import Medical from "./pages/Medical";
import Lab from "./pages/Lab";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import ConceptoAptitud from "./pages/ConceptoAptitud";
import Inventory from "./pages/Inventory";
import Biometric from "./pages/Biometric";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/admisiones" element={<Admissions />} />
      <Route path="/admisiones/nueva" element={<AdmissionsNew />} />
      <Route path="/admisiones/:id" element={<AdmissionsDetail />} />
      <Route path="/admisiones/calendario" element={<AdmissionsCalendar />} />
      <Route path="/admisiones/empresas" element={<AdmissionsCompanies />} />
      <Route path="/medico" element={<Medical />} />
      <Route path="/laboratorio" element={<Lab />} />
      <Route path="/facturacion" element={<Billing />} />
      <Route path="/reportes" element={<Reports />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/concepto-aptitud" element={<ConceptoAptitud />} />
      <Route path="/inventario" element={<Inventory />} />
      <Route path="/biometric" element={<Biometric />} />
      <Route path="/perfil" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
