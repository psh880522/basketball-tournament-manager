"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

type NavMenuProps = {
  items: NavItem[];
  isLoggedIn: boolean;
};

export default function NavMenu({ items, isLoggedIn }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `text-sm ${active ? "font-semibold text-slate-900 underline underline-offset-4" : "text-slate-600 hover:text-slate-900"}`;
  };

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-6 md:flex">
        {items.map((item) =>
          item.disabled ? (
            <span key={item.href} className="text-sm text-slate-300 cursor-not-allowed select-none">
              {item.label}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        {isLoggedIn ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm text-[#FF6B00] hover:bg-orange-50"
            >
              로그아웃
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-[#FF6B00] px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            로그인
          </Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        type="button"
        className="md:hidden rounded-lg p-2 hover:bg-gray-100"
        onClick={() => setOpen(!open)}
        aria-label="메뉴 열기"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute left-0 top-14 z-50 w-full border-b bg-white px-4 py-3 shadow-sm md:hidden">
          <nav className="flex flex-col gap-3">
            {items.map((item) =>
              item.disabled ? (
                <span key={item.href} className="text-sm text-slate-300 cursor-not-allowed select-none">
                  {item.label}
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
            {isLoggedIn ? (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-orange-200 px-3 py-1.5 text-sm text-[#FF6B00] hover:bg-orange-50"
                >
                  로그아웃
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="block rounded-lg bg-[#FF6B00] px-3 py-1.5 text-center text-sm text-white hover:opacity-90"
                onClick={() => setOpen(false)}
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
