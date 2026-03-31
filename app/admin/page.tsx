import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import { listAdminTournaments } from "@/lib/api/tournaments";
import Button from "@/components/ui/Button";
import TournamentList from "./TournamentList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminPageProps = {
  searchParams?: Promise<{
    includeDeleted?: string | string[];
  }>;
};

function resolveIncludeDeleted(value: string | string[] | undefined) {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.includes("1") || value.includes("true");
  }
  return value === "1" || value === "true";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") redirect("/login");

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <p className="text-sm text-red-600">Failed to load profile: {result.error}</p>
        </div>
      </main>
    );
  }

  if (result.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <p className="text-sm text-gray-600">No profile found for this account.</p>
        </div>
      </main>
    );
  }

  if (!isOperationRole(result.role)) redirect("/dashboard");

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const includeDeleted = resolveIncludeDeleted(
    resolvedSearchParams?.includeDeleted
  );
  const { data, error } = await listAdminTournaments({ includeDeleted });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">대회 관리</h1>
            <p className="text-sm text-gray-600">
              운영 중인 대회를 관리하고 새로운 대회를 생성하세요.
            </p>
          </div>
          <Link href="/admin/tournaments/new">
            <Button>대회 생성</Button>
          </Link>
        </header>

        <TournamentList
          includeDeleted={includeDeleted}
          tournaments={data ?? []}
          error={error}
          role={result.role}
        />
      </div>
    </main>
  );
}
