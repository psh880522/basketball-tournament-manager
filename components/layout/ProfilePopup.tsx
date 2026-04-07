"use client";

import { useState, useRef, useEffect } from "react";
import type { Role } from "@/src/lib/auth/roles";
import { logoutAction } from "@/app/actions/auth";

type ProfilePopupProps = {
  email: string | null;
  role: Role | null;
};

const ROLE_LABEL: Record<Role, string> = {
  organizer: "오거나이저",
  manager: "매니저",
  user: "일반 사용자",
  player: "플레이어",
};

export default function ProfilePopup({ email, role }: ProfilePopupProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 팝업 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
      >
        {/* 아바타 */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
          {email ? email[0].toUpperCase() : "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-slate-800">
            {email ?? "사용자"}
          </span>
          {role && (
            <span className="block text-xs text-slate-400">
              {ROLE_LABEL[role]}
            </span>
          )}
        </span>
        {/* 화살표 */}
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 팝업 메뉴 */}
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-md">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
