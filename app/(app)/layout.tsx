import GlobalHeader from "@/components/nav/GlobalHeader";
import Sidebar from "@/components/layout/Sidebar";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listMyTeams } from "@/lib/api/teams";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userResult = await getUserWithRole();
  const isLoggedIn = userResult.status === "ready";

  let isCaptain = false;

  if (isLoggedIn && userResult.role === "player") {
    const { data: teams } = await listMyTeams();
    isCaptain = (teams ?? []).some((t) => t.role_in_team === "captain");
  }

  return isLoggedIn ? (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={userResult.role}
        userEmail={userResult.user?.email ?? null}
        isCaptain={isCaptain}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  ) : (
    <div style={{ "--header-height": "4rem" } as React.CSSProperties}>
      <GlobalHeader />
      {children}
    </div>
  );
}
