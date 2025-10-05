"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "~/components/ui/button";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast = ({ toast, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const duration = toast.duration ?? 5000;
  const autoClose = toast.autoClose !== false;

  useEffect(() => {
    
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); 
  }, [onClose, toast.id]);

  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, autoClose, handleClose]);

  const getToastStyles = () => {
    const baseStyles = "message message-large max-w-md w-full";

    switch (toast.type) {
      case "success":
        return `${baseStyles} message-success`;
      case "error":
        return `${baseStyles} message-error`;
      case "warning":
        return `${baseStyles} message-warning`;
      case "info":
        return `${baseStyles} message-info`;
      default:
        return `${baseStyles} message-info`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <Check className="h-5 w-5" />;
      case "error":
        return <X className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "info":
        return <Info className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`toast-item ${isVisible ? "toast-enter" : ""} ${isExiting ? "toast-exit" : ""}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={getToastStyles()}>
        <div className="message-icon">{getIcon()}</div>

        <div className="message-content">
          <div className="message-title">{toast.title}</div>
          {toast.message && <div className="message-text">{toast.message}</div>}
        </div>

        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          className="message-dismiss"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onRemove} />
      ))}
    </div>,
    document.body,
  );
};

export default Toast;
