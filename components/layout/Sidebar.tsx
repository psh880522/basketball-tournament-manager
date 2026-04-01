"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/src/lib/auth/roles";
import ProfilePopup from "./ProfilePopup";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type SidebarProps = {
  role: Role | null;
  userEmail: string | null;
};

const IconTournament = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconDashboard = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const IconUsers = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconTeam = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconList = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

function buildMenuItems(role: Role | null): NavItem[] {
  if (role === "organizer" || role === "manager") {
    const items: NavItem[] = [
       { label: "대시보드", href: "/dashboard", icon: <IconDashboard /> },
      { label: "대회관리", href: "/admin", icon: <IconDashboard /> },
    ];
    if (role === "organizer") {
      items.push({ label: "권한관리", href: "/admin/users", icon: <IconUsers /> });
    }
    return items;
  }

  // player
  return [
    { label: "대시보드", href: "/dashboard", icon: <IconDashboard /> },
    { label: "내팀", href: "/team", icon: <IconTeam /> },
  ];
}

export default function Sidebar({ role, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const menuItems = buildMenuItems(role);

  const matchLength = (href: string) => {
    if (href === "/") return pathname === "/" ? 1 : 0;
    if (pathname === href) return href.length;
    if (pathname.startsWith(href + "/")) return href.length;
    return 0;
  };

  const bestMatchLength = Math.max(...menuItems.map((item) => matchLength(item.href)));

  const isActive = (href: string) => {
    const len = matchLength(href);
    return len > 0 && len === bestMatchLength;
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      {/* 로고 */}
      <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          🏀 23BOARD
        </Link>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-slate-100 font-semibold text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 하단 프로필 */}
      <div className="shrink-0 border-t border-slate-200 p-3">
        <ProfilePopup email={userEmail} role={role} />
      </div>
    </aside>
  );
}
