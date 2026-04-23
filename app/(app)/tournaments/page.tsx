import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";

import PageHeader from "./_components/PageHeader";
import SearchBar from "./_components/SearchBar";
import FilterTabBar from "./_components/FilterTabBar";
import FilterPanel from "./_components/FilterPanel";
import FilterChips from "./_components/FilterChips";
import TournamentListSection from "./_components/TournamentListSection";
import TournamentListSkeleton from "./_components/TournamentListSkeleton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TournamentsPageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
    q?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
  }>;
};

function firstString(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const result = await getUserWithRole();
  if (result.status === "unauthenticated") redirect("/login");
  if (isOperationRole(result.role)) redirect("/admin");

  const resolvedParams = searchParams ? await searchParams : {};

  const tab = firstString(resolvedParams.tab) ?? "all";
  const q = firstString(resolvedParams.q)?.trim() || undefined;
  const dateFrom = firstString(resolvedParams.dateFrom) || undefined;
  const dateTo = firstString(resolvedParams.dateTo) || undefined;

  const activeFilterCount = [q, dateFrom, dateTo].filter(Boolean).length;
  const searchParamsKey = [tab, q ?? "", dateFrom ?? "", dateTo ?? ""].join("|");

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PageHeader
          activeFilterCount={activeFilterCount}
          current={{ dateFrom, dateTo }}
        />
        <SearchBar defaultValue={q} />
        <FilterTabBar currentTab={tab} />
        <FilterPanel current={{ dateFrom, dateTo }} />
        <FilterChips dateFrom={dateFrom} dateTo={dateTo} />
        <Suspense key={searchParamsKey} fallback={<TournamentListSkeleton />}>
          <TournamentListSection
            tab={tab}
            q={q}
            dateFrom={dateFrom}
            dateTo={dateTo}
            role={result.role}
          />
        </Suspense>
      </div>
    </main>
  );
}
