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

type NavSection = {
  title?: string;
  items: NavItem[];
};

type SidebarProps = {
  role: Role | null;
  userEmail: string | null;
  teamRole?: "captain" | "player" | null;
  teamId?: string | null;
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
  teamRole: "captain" | "player" | null,
  teamId: string | null
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
  const hasteam = teamRole !== null && teamId !== null;

  const sections: NavSection[] = [
    { items: [{ label: "대시보드", href: "/dashboard", icon: <IconDashboard /> }] },
    { title: "대회", items: [{ label: "대회 목록", href: "/tournaments", icon: <IconList /> }] },
  ];

  if (!hasteam) {
    sections.push({
      title: "내 팀",
      items: [
        { label: "팀 만들기", href: "/teams/new", icon: <IconPlus /> },
        { label: "팀 찾기", href: "/teams/find", icon: <IconSearch /> },
      ],
    });
    return sections;
  }

  if (teamRole === "captain") {
    sections.push({
      title: "내 팀",
      items: [
        { label: "팀 정보", href: `/teams/${teamId}`, icon: <IconTeam /> },
        { label: "선수 관리", href: "/team/players", icon: <IconUsers /> },
        { label: "합류 신청 관리", href: `/teams/${teamId}/applications`, icon: <IconClipboard /> },
      ],
    });
  } else {
    sections.push({
      title: "내 팀",
      items: [{ label: "팀 정보", href: `/teams/${teamId}`, icon: <IconTeam /> }],
    });
  }

  return sections;
}

export default function Sidebar({ role, userEmail, teamRole = null, teamId = null }: SidebarProps) {
  const pathname = usePathname();
  const sections = buildMenuSections(role, teamRole, teamId);
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
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      {/* 로고 */}
      <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
        <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
          🏀 23BOARD
        </Link>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
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
            </div>
          ))}
        </div>
      </nav>

      {/* 하단 프로필 */}
      <div className="shrink-0 border-t border-slate-200 p-3">
        <ProfilePopup email={userEmail} role={role} />
      </div>
    </aside>
  );
}
