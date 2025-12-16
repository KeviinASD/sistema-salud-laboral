import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import { 
  Package, 
  Plus, 
  ArrowUpDown, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Barcode, 
  Tag, 
  Layers, 
  DollarSign, 
  MapPin, 
  Building2, 
  Hash, 
  X,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Archive
} from "lucide-react";

interface InventoryItem {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
  precio_unitario?: number;
  proveedor?: string;
  ubicacion?: string;
}

interface Movement {
  id: string;
  tipo_movimiento: string;
  cantidad: number;
  motivo: string;
  created_at: string;
}

export default function Inventory() {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    categoria: "",
    stock_actual: 0,
    stock_minimo: 5,
    unidad_medida: "unidad",
    precio_unitario: "",
    proveedor: "",
    ubicacion: ""
  });
  const [movementForm, setMovementForm] = useState({
    item_id: "",
    tipo_movimiento: "entrada",
    cantidad: 1,
    motivo: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, alertsRes] = await Promise.all([
        api.get("/inventario/items"),
        api.get("/inventario/alerts")
      ]);
      setItems(itemsRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/inventario/items", form);
      setShowForm(false);
      setForm({
        codigo: "",
        nombre: "",
        categoria: "",
        stock_actual: 0,
        stock_minimo: 5,
        unidad_medida: "unidad",
        precio_unitario: "",
        proveedor: "",
        ubicacion: ""
      });
      await loadData();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al crear item");
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/inventario/movimientos", movementForm);
      setShowMovementForm(false);
      setMovementForm({
        item_id: "",
        tipo_movimiento: "entrada",
        cantidad: 1,
        motivo: ""
      });
      await loadData();
    } catch (error: any) {
      showError(error.response?.data?.error || "Error al registrar movimiento");
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.stock_actual <= item.stock_minimo;
  };

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          {/* Header Profesional */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl">
                    <Package className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  Inventario y Logística
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Gestión completa de inventario y seguimiento logístico</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMovementForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <ArrowUpDown className="h-5 w-5" />
                  Movimiento
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5" />
                  Nuevo Item
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{items.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alertas de Stock</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{alerts.length}</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {items.reduce((sum, item) => sum + item.stock_actual, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Archive className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Inventario</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      S/ {items.reduce((sum, item) => sum + (item.stock_actual * (item.precio_unitario || 0)), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas de Stock Bajo */}
          {alerts.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-5 mb-6 shadow-md">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
                    Alertas de Stock Bajo
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">{alerts.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {alerts.map((item) => (
                      <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="font-semibold text-gray-900 dark:text-white">{item.nombre}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">({item.codigo})</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                {item.stock_actual} {item.unidad_medida}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                (Mínimo: {item.stock_minimo})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Nuevo Item */}
          {showForm && (
            <>
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                  {/* Overlay */}
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={() => setShowForm(false)}
                  ></div>
                  
                  {/* Modal */}
                  <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden z-10">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nuevo Item de Inventario</h3>
                      </div>
                      <button
                        onClick={() => setShowForm(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                      <form onSubmit={handleCreateItem} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Barcode className="h-4 w-4" />
                        Código *
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="Ej: MED-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Nombre *
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="Nombre del producto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Categoría
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="Ej: Medicamentos, Equipos..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Unidad de Medida
                      </span>
                    </label>
                    <select
                      value={form.unidad_medida}
                      onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                    >
                      <option value="unidad">📦 Unidad</option>
                      <option value="caja">📦 Caja</option>
                      <option value="litro">🧫 Litro</option>
                      <option value="kilogramo">⚖️ Kilogramo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Stock Inicial
                      </span>
                    </label>
                    <input
                      type="number"
                      value={form.stock_actual}
                      onChange={(e) => setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Stock Mínimo
                      </span>
                    </label>
                    <input
                      type="number"
                      value={form.stock_minimo}
                      onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Precio Unitario
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.precio_unitario}
                        onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Proveedor
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.proveedor}
                      onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Ubicación
                      </span>
                    </label>
                    <input
                      type="text"
                      value={form.ubicacion}
                      onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200"
                      placeholder="Ej: Almacén A, Estante 3"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Crear Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

          {/* Modal de Movimiento */}
          {showMovementForm && (
            <>
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center p-4">
                  {/* Overlay */}
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={() => setShowMovementForm(false)}
                  ></div>
                  
                  {/* Modal */}
                  <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden z-10">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <ArrowUpDown className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Registrar Movimiento</h3>
                      </div>
                      <button
                        onClick={() => setShowMovementForm(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                      <form onSubmit={handleMovement} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Item *
                      </span>
                    </label>
                    <select
                      value={movementForm.item_id}
                      onChange={(e) => setMovementForm({ ...movementForm, item_id: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                    >
                      <option value="">Seleccione un item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({item.codigo}) - Stock: {item.stock_actual} {item.unidad_medida}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Tipo de Movimiento *
                      </span>
                    </label>
                    <select
                      value={movementForm.tipo_movimiento}
                      onChange={(e) => setMovementForm({ ...movementForm, tipo_movimiento: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                    >
                      <option value="entrada">⬆️ Entrada (Compra/Recepción)</option>
                      <option value="salida">⬇️ Salida (Uso/Venta)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Cantidad *
                      </span>
                    </label>
                    <input
                      type="number"
                      value={movementForm.cantidad}
                      onChange={(e) => setMovementForm({ ...movementForm, cantidad: parseInt(e.target.value) || 0 })}
                      required
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                      placeholder="1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Motivo *
                      </span>
                    </label>
                    <input
                      type="text"
                      value={movementForm.motivo}
                      onChange={(e) => setMovementForm({ ...movementForm, motivo: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200"
                      placeholder="Ej: Compra, Uso en consulta, Ajuste de inventario..."
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowMovementForm(false)}
                      className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Registrar Movimiento
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          </div>
        </>
      )}

          {/* Lista de Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items de Inventario</h3>
              </div>
            </div>
            {loading ? (
              <div className="p-16 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Cargando inventario...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-16 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">No hay items en el inventario</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Agrega tu primer item para comenzar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3.5 w-3.5" />
                          Código
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          Nombre
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />
                          Categoría
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Archive className="h-3.5 w-3.5" />
                          Stock
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Mínimo
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          Precio
                        </span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item) => (
                      <tr key={item.id} className={`hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors ${
                        isLowStock(item) ? "bg-red-50 dark:bg-red-900/10" : ""
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {item.codigo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.categoria || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                          {item.stock_actual} {item.unidad_medida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.stock_minimo} {item.unidad_medida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.precio_unitario ? `S/ ${Number(item.precio_unitario).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLowStock(item) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Stock Bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

