import GlobalHeader from "@/components/nav/GlobalHeader";
import Sidebar from "@/components/layout/Sidebar";
import { getUserWithRole } from "@/src/lib/auth/roles";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userResult = await getUserWithRole();
  const isLoggedIn = userResult.status === "ready";

  return isLoggedIn ? (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        role={userResult.role}
        userEmail={userResult.user?.email ?? null}
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
