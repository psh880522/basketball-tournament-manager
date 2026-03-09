import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import NavMenu from "./NavMenu";

type NavItem = {
  label: string;
  href: string;
};

export default async function GlobalHeader() {
  const userResult = await getUserWithRole();

  const isLoggedIn =
    userResult.status === "ready" || userResult.status === "empty";
  const role = userResult.role;

  const items: NavItem[] = [{ label: "대회", href: "/" }];

  if (isLoggedIn) {
    items.push({ label: "대시보드", href: "/dashboard" });
  }

  if (role === "organizer") {
    items.push({ label: "Admin", href: "/admin" });
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-base font-bold tracking-tight">
          🏀 Basketball TM
        </Link>

        <NavMenu items={items} isLoggedIn={isLoggedIn} />
      </div>
    </header>
  );
}
