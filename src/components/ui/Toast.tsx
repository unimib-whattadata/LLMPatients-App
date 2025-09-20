"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  CheckIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
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

  const duration = toast.duration || 5000;
  const autoClose = toast.autoClose !== false;

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, autoClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    const baseStyles = "flex items-start p-4 rounded-lg border-l-4 max-w-md w-full";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-success-50 border-success-500 text-success-700`;
      case 'error':
        return `${baseStyles} bg-error-50 border-error-500 text-error-700`;
      case 'warning':
        return `${baseStyles} bg-warning-50 border-warning-500 text-warning-700`;
      case 'info':
        return `${baseStyles} bg-info-50 border-info-500 text-info-700`;
      default:
        return `${baseStyles} bg-background-secondary border-border-primary text-text-primary`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <CheckIcon className="w-5 h-5 text-success-500" />
        );
      case 'error':
        return (
          <XMarkIcon className="w-5 h-5 text-error-500" />
        );
      case 'warning':
        return (
          <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />
        );
      case 'info':
        return (
          <InformationCircleIcon className="w-5 h-5 text-info-500" />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`toast-item ${isVisible ? 'toast-enter' : ''} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={getToastStyles()}>
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-sm opacity-90 mt-1">
              {toast.message}
            </p>
          )}
        </div>
        
        <div className="flex-shrink-0 ml-3">
          <button
            onClick={handleClose}
            className="inline-flex text-text-tertiary hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-border-hover rounded"
            aria-label="Close notification"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
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
        <Toast
          key={toast.id}
          toast={toast}
          onClose={onRemove}
        />
      ))}
    </div>,
    document.body
  );
};

export default Toast;
