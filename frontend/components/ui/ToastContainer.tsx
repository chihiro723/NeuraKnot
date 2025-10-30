"use client";

import { useState, useCallback } from "react";
import { Toast, ToastProps } from "./Toast";

export interface ToastData {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

let toastId = 0;
let addToastFn: ((toast: ToastData) => void) | null = null;

export function showToast(toast: ToastData) {
  if (addToastFn) {
    addToastFn(toast);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<
    Array<Omit<ToastProps, "onClose"> & { id: string }>
  >([]);

  const addToast = useCallback((toast: ToastData) => {
    const id = `toast-${toastId++}`;
    setToasts((prev) => [...prev, { id, ...toast }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // グローバル関数として登録
  if (typeof window !== "undefined") {
    addToastFn = addToast;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
}
