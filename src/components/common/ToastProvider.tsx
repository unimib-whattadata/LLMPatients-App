"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ToastContainer, type ToastMessage } from "./Toast";

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  showSuccess: (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => void;
  showError: (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => void;
  showInfo: (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => void;
  showWarning: (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const showToast = (toast: Omit<ToastMessage, "id">) => {
    const newToast: ToastMessage = {
      id: generateId(),
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const showSuccess = (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => {
    showToast({
      type: "success",
      title,
      message: message || "",
      ...options,
    });
  };

  const showError = (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => {
    showToast({
      type: "error",
      title,
      message: message || "",
      ...options,
    });
  };

  const showInfo = (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => {
    showToast({
      type: "info",
      title,
      message: message || "",
      ...options,
    });
  };

  const showWarning = (
    title: string,
    message?: string,
    options?: Partial<ToastMessage>,
  ) => {
    showToast({
      type: "warning",
      title,
      message: message || "",
      ...options,
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  const contextValue: ToastContextValue = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export default ToastProvider;
