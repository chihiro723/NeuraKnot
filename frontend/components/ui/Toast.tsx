"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ToastProps {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({
  id,
  message,
  type = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-fadeIn min-w-[300px] max-w-md",
        type === "success" &&
          "bg-green-50/90 border border-green-200 text-green-800 dark:bg-green-900/90 dark:border-green-700 dark:text-green-100",
        type === "error" &&
          "bg-red-50/90 border border-red-200 text-red-800 dark:bg-red-900/90 dark:border-red-700 dark:text-red-100",
        type === "info" &&
          "bg-blue-50/90 border border-blue-200 text-blue-800 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-100"
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className="flex-shrink-0 w-5 h-5" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="閉じる"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
