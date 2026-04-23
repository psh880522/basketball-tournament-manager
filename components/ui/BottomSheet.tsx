"use client";

import { useEffect } from "react";

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-slate-300" />
        {children}
      </div>
    </>
  );
}
