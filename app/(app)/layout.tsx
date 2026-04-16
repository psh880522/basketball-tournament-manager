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

  let teamRole: "captain" | "player" | null = null;
  let teamId: string | null = null;

  if (isLoggedIn && userResult.role === "player") {
    const { data: teams } = await listMyTeams();
    const firstTeam = teams?.[0] ?? null;
    teamRole = (firstTeam?.role_in_team as "captain" | "player") ?? null;
    teamId = firstTeam?.team_id ?? null;
  }

  return isLoggedIn ? (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={userResult.role}
        userEmail={userResult.user?.email ?? null}
        teamRole={teamRole}
        teamId={teamId}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  ) : (
    <>
      <GlobalHeader />
      {children}
    </>
  );
}
