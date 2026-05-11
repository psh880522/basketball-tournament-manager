"use client";

import { useEffect } from "react";

type ToastType = "success" | "error" | "info";

type ToastProps = {
  message: string;
  type?: ToastType;
  onClose: () => void;
};

const typeStyles: Record<ToastType, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-slate-700 text-white",
};

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`flex items-center gap-3 rounded-lg px-5 py-3 text-sm shadow-lg ${typeStyles[type]}`}
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
