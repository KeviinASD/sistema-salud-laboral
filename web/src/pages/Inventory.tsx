import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";
import { useToast } from "../contexts/ToastContext";

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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Inventario y Logística</h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">Gestión de inventario y seguimiento logístico</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowMovementForm(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                ➕ Movimiento
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                ➕ Nuevo Item
              </button>
            </div>
          </div>

          {/* Alertas de Stock Bajo */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-red-900 mb-2">⚠️ Alertas de Stock Bajo</h3>
              <ul className="list-disc list-inside space-y-1">
                {alerts.map((item) => (
                  <li key={item.id} className="text-sm text-red-800">
                    {item.nombre} ({item.codigo}): {item.stock_actual} {item.unidad_medida} (Mínimo: {item.stock_minimo})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Formulario de Nuevo Item */}
          {showForm && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Nuevo Item de Inventario</h3>
              <form onSubmit={handleCreateItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código *</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                  <select
                    value={form.unidad_medida}
                    onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="caja">Caja</option>
                    <option value="litro">Litro</option>
                    <option value="kilogramo">Kilogramo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    value={form.stock_actual}
                    onChange={(e) => setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={form.stock_minimo}
                    onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precio_unitario}
                    onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={form.ubicacion}
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Crear Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Formulario de Movimiento */}
          {showMovementForm && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Registrar Movimiento</h3>
              <form onSubmit={handleMovement} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                  <select
                    value={movementForm.item_id}
                    onChange={(e) => setMovementForm({ ...movementForm, item_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Seleccione un item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} ({item.codigo}) - Stock: {item.stock_actual}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento *</label>
                  <select
                    value={movementForm.tipo_movimiento}
                    onChange={(e) => setMovementForm({ ...movementForm, tipo_movimiento: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    value={movementForm.cantidad}
                    onChange={(e) => setMovementForm({ ...movementForm, cantidad: parseInt(e.target.value) || 0 })}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                  <input
                    type="text"
                    value={movementForm.motivo}
                    onChange={(e) => setMovementForm({ ...movementForm, motivo: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: Compra, Uso, Ajuste..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowMovementForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Registrar Movimiento
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de Items */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Items de Inventario</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Mínimo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item) => (
                      <tr key={item.id} className={isLowStock(item) ? "bg-red-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.codigo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.categoria}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.stock_actual} {item.unidad_medida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.stock_minimo} {item.unidad_medida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.precio_unitario ? `S/ ${Number(item.precio_unitario).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLowStock(item) ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Stock Bajo
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
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

