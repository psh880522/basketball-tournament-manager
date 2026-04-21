import Link from "next/link";
import { getUserWithRole, isPlayerRole, isUserRole, isOperationRole } from "@/src/lib/auth/roles";
import NavMenu from "./NavMenu";

type NavItem = {
  label: string;
  href: string;
  disabled?: boolean;
};

type GlobalHeaderProps = {
  minimal?: boolean;
};

export default async function GlobalHeader({ minimal = false }: GlobalHeaderProps) {
  if (minimal) {
    return (
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-orange-100/50">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link href="/" className="font-space-grotesk text-xl font-black italic uppercase text-[#FF6B00]">
            🏀 23Board
          </Link>
        </div>
      </header>
    );
  }

  const userResult = await getUserWithRole();

  const isLoggedIn =
    userResult.status === "ready" || userResult.status === "empty";
  const role = userResult.role;

  const items: NavItem[] = [
    { label: "홈", href: "/#hero" },
    { label: "대회", href: "/#open-tournaments" },
    { label: "스냅샷", href: "#", disabled: true },
  ];

  if (isUserRole(role)) {
    items.push({ label: "선수 등록하기", href: "/onboarding/profile" });
  } else if (isPlayerRole(role)) {
    items.push({ label: "대시보드", href: "/dashboard" });
  } else if (isOperationRole(role)) {
    items.push({ label: "관리", href: "/admin" });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-orange-100/50">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-space-grotesk text-xl font-black italic uppercase text-[#FF6B00]">
          🏀 23Board
        </Link>

        <NavMenu items={items} isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
