import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { listUsersWithRole } from "@/lib/api/users";
import UserRoleForm from "./UserRoleForm";
import EmptyState from "@/components/ui/EmptyState";
import Table from "@/components/ui/Table";
import UserSearchInput from "./UserSearchInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const result = await getUserWithRole();

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-2xl font-semibold">권한 관리</h1>
          <p className="text-sm text-red-600">Failed to load profile: {result.error}</p>
        </div>
      </main>
    );
  }

  if (result.role !== "organizer") redirect("/admin");

  const { data: users, error } = await listUsersWithRole();
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";
  const filtered = query
    ? (users ?? []).filter((u) => u.email?.toLowerCase().includes(query))
    : (users ?? []);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">권한 관리</h1>
          <p className="text-sm text-gray-600">
            사용자 역할을 player ↔ manager로 변경할 수 있습니다.
          </p>
        </header>

        <Suspense>
          <UserSearchInput />
        </Suspense>

        {error && (
          <p className="text-sm text-red-600">사용자 목록을 불러오지 못했습니다: {error}</p>
        )}

        {!error && filtered.length === 0 && (
          <EmptyState message={query ? "검색 결과가 없습니다." : "사용자가 없습니다."} />
        )}

        {filtered.length > 0 && (
          <Table>
            <Table.Head>
              <Table.HeadCell className="text-left">이메일</Table.HeadCell>
              <Table.HeadCell className="text-center">역할</Table.HeadCell>
              <Table.HeadCell className="text-center">변경</Table.HeadCell>
            </Table.Head>
            <Table.Body>
              {filtered.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell className="text-left">{user.email}</Table.Cell>
                  <Table.Cell className="text-center">
                    <RoleBadge role={user.role} />
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    {user.role === "organizer" || user.id === result.user?.id ? (
                      <span className="text-xs text-gray-400">변경 불가</span>
                    ) : (
                      <UserRoleForm
                        userId={user.id}
                        currentRole={user.role}
                      />
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </main>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    organizer: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    player: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    organizer: "오거나이저",
    manager: "매니저",
    player: "플레이어",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[role] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[role] ?? role}
    </span>
  );
}
