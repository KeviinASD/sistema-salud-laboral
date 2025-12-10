import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "success", duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "error", duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "warning", duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast(message, "info", duration);
    },
    [showToast]
  );

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void, onCancel?: () => void) => {
      setConfirmDialog({ message, onConfirm, onCancel });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.onConfirm();
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const handleCancel = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.onCancel?.();
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        removeToast
      }}
    >
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full sm:w-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              relative flex items-center p-4 rounded-lg shadow-lg border-l-4 animate-in slide-in-from-right
              ${
                toast.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200"
                  : toast.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200"
                  : toast.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-200"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200"
              }
            `}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-current opacity-70 hover:opacity-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 dark:bg-opacity-75">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

