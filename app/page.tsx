import Link from "next/link";
import { Suspense } from "react";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getOpenTournaments } from "@/lib/api/tournaments";

const formatDateRange = (start: string | null, end: string | null) => {
  const startLabel = start || "TBD";
  const endLabel = end || "TBD";
  return `${startLabel} - ${endLabel}`;
};

async function OpenTournamentsList() {
  const { data, error } = await getOpenTournaments();

  if (error) {
    return <p style={{ color: "crimson" }}>대회 정보를 불러오지 못했습니다.</p>;
  }

  if (!data || data.length === 0) {
    return <p>현재 모집 중인 대회가 없습니다.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      {data.map((tournament) => (
        <div
          key={tournament.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Link href={`/tournament/${tournament.id}`}>
              <strong>{tournament.name}</strong>
            </Link>
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: "#dcfce7",
                color: "#166534",
              }}
            >
              모집 중
            </span>
          </div>
          <div style={{ marginTop: 8, color: "#4b5563" }}>
            일정: {formatDateRange(tournament.start_date, tournament.end_date)}
          </div>
          <div style={{ color: "#4b5563" }}>
            장소: {tournament.location || "TBD"}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const userResult = await getUserWithRole();
  const isLoggedIn = userResult.status === "ready";
  const participateHref = isLoggedIn ? "#open-tournaments" : "/login";
  const operateHref = isLoggedIn ? "/admin" : "/login";

  return (
    <main style={{ padding: 24, background: "#f3f4f6", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 32 }}>
        <section
          style={{
            borderRadius: 12,
            padding: 24,
            background: "linear-gradient(135deg, #fff7ed 0%, #fff 60%)",
            border: "1px solid #fde68a",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28 }}>
            조별 리그 기반 농구대회를 한 번에 관리하세요
          </h1>
          <p style={{ marginTop: 8, color: "#6b7280" }}>
            참가 신청부터 대회 운영, 결과 확인까지 한 곳에서 진행할 수 있습니다.
          </p>
          <p style={{ marginTop: 4, color: "#6b7280" }}>
            운영자는 다음 단계만 집중하면 됩니다.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <Link href={participateHref}>
              <button type="button" style={{ padding: "10px 16px" }}>
                대회 참가하기
              </button>
            </Link>
            <Link href={operateHref}>
              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "#fff",
                }}
              >
                대회 운영하기
              </button>
            </Link>
          </div>
        </section>

        <section id="open-tournaments">
          <h2 style={{ marginBottom: 8 }}>현재 모집 중인 대회</h2>
          <Suspense fallback={<p>대회 목록을 불러오는 중...</p>}>
            <OpenTournamentsList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
