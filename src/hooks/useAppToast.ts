"use client";

import { useMemo } from "react";

import type { ToastMessage } from "~/components/common/Toast";
import { useToast } from "~/components/common/ToastProvider";
import { getErrorMessage } from "~/lib/utils/error";

type ToastOptions = Partial<ToastMessage>;

export function useAppToast() {
  const toast = useToast();

  return useMemo(
    () => ({
      success: (title: string, message?: string, options?: ToastOptions) =>
        toast.showSuccess(title, message, options),
      error: (title: string, message?: string, options?: ToastOptions) =>
        toast.showError(title, message, options),
      info: (title: string, message?: string, options?: ToastOptions) =>
        toast.showInfo(title, message, options),
      warning: (title: string, message?: string, options?: ToastOptions) =>
        toast.showWarning(title, message, options),
      errorFromUnknown: (
        title: string,
        error: unknown,
        fallback = "An unexpected error occurred.",
        options?: ToastOptions,
      ) => toast.showError(title, getErrorMessage(error, fallback), options),
      clearAll: toast.clearAll,
    }),
    [toast],
  );
}
