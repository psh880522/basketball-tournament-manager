"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/src/lib/auth/roles";
import ProfilePopup from "./ProfilePopup";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

type SidebarProps = {
  role: Role | null;
  userEmail: string | null;
  hasTeam?: boolean;
  isCaptain?: boolean;
};

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

const IconPlus = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 4v16m8-8H4" />
  </svg>
);

const IconSearch = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconClipboard = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const IconShield = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

function buildMenuSections(
  role: Role | null,
  hasTeam: boolean,
  isCaptain: boolean
): NavSection[] {
  if (role === "organizer" || role === "manager") {
    const sections: NavSection[] = [
      { items: [{ label: "대시보드", href: "/dashboard", icon: <IconDashboard /> }] },
      { title: "대회", items: [{ label: "대회관리", href: "/admin", icon: <IconList /> }] },
    ];
    if (role === "organizer") {
      sections.push({
        title: "운영",
        items: [{ label: "권한관리", href: "/admin/users", icon: <IconShield /> }],
      });
    }
    return sections;
  }

  if (role === "user") {
    return [
      { title: "대회", items: [{ label: "대회 목록", href: "/tournaments", icon: <IconList /> }] },
      { items: [{ label: "선수 등록하기", href: "/onboarding/profile", icon: <IconUsers /> }] },
    ];
  }

  // player
  const tournamentItems: NavItem[] = [
    { label: "대회 목록", href: "/tournaments", icon: <IconList /> },
  ];
  if (isCaptain) {
    tournamentItems.push({ label: "내 신청 현황", href: "/my-applications", icon: <IconClipboard /> });
  }

  const sections: NavSection[] = [
    { items: [{ label: "대시보드", href: "/dashboard", icon: <IconDashboard /> }] },
    { title: "대회", items: tournamentItems },
  ];

  if (!hasTeam) {
    sections.push({
      title: "내 팀",
      items: [
        { label: "팀 만들기", href: "/teams/new", icon: <IconPlus /> },
        { label: "팀 찾기", href: "/teams/find", icon: <IconSearch /> },
      ],
    });
    return sections;
  }

  sections.push({
    title: "내 팀",
    items: [{ label: "내 팀 목록", href: "/teams", icon: <IconTeam /> }],
  });

  return sections;
}

export default function Sidebar({ role, userEmail, hasTeam = false, isCaptain = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const sections = buildMenuSections(role, hasTeam, isCaptain);
  const allItems = sections.flatMap((s) => s.items);

  const matchLength = (href: string) => {
    if (href === "/") return pathname === "/" ? 1 : 0;
    if (pathname === href) return href.length;
    if (pathname.startsWith(href + "/")) return href.length;
    return 0;
  };

  const bestMatchLength = Math.max(...allItems.map((item) => matchLength(item.href)));

  const isActive = (href: string) => {
    const len = matchLength(href);
    return len > 0 && len === bestMatchLength;
  };

  return (
    <aside
      style={{ boxShadow: "4px 0 12px rgba(0,0,0,0.05)", zIndex: 10 }}
      className={`relative flex h-screen flex-col bg-white transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}
    >
      {/* 로고 + 토글 버튼 */}
      <div className="flex h-14 shrink-0 items-center justify-between px-3">
        {!collapsed && (
          <Link href="/" className="text-sm font-bold tracking-tight text-slate-900 font-[var(--font-space-grotesk)]">
            🏀 23BOARD
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className={`flex h-7 w-7 items-center justify-center rounded-[4px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors ${collapsed ? "mx-auto" : ""}`}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-4">
          {sections.map((section, si) => (
            <div key={si}>
              {!collapsed && section.title && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-[4px] px-3 py-2 text-sm transition-colors ${
                        collapsed ? "justify-center" : "gap-3"
                      } ${
                        isActive(item.href)
                          ? "bg-slate-100 font-semibold text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {item.icon}
                      {!collapsed && item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* 하단 프로필 */}
      <div className="shrink-0 p-2">
        <ProfilePopup email={userEmail} role={role} collapsed={collapsed} />
      </div>
    </aside>
  );
}
