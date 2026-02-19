import { Suspense } from "react";
import Link from "next/link";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getDivisionsByTournament } from "@/lib/api/divisions";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import { getTeamApplicationByTournamentAndCaptain } from "@/lib/api/teams";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function TournamentDetail({ id }: { id: string }) {
  const [tournamentResult, divisionsResult, userResult] = await Promise.all([
    getPublicTournamentById(id),
    getDivisionsByTournament(id),
    getUserWithRole(),
  ]);

  if (tournamentResult.error) {
    return <p style={{ color: "crimson" }}>대회 정보를 불러오지 못했습니다.</p>;
  }

  if (!tournamentResult.data) {
    return <p>존재하지 않는 대회입니다.</p>;
  }

  if (divisionsResult.error) {
    return <p style={{ color: "crimson" }}>부문 정보를 불러오지 못했습니다.</p>;
  }

  const tournament = tournamentResult.data;
  const divisions = divisionsResult.data ?? [];
  const isLoggedIn = userResult.status === "ready";
  const isOrganizer = userResult.status === "ready" && userResult.role === "organizer";
  const isTeamManager = userResult.status === "ready" && userResult.role === "team_manager";

  const teamApplicationResult = isTeamManager && userResult.user
    ? await getTeamApplicationByTournamentAndCaptain(id, userResult.user.id)
    : { data: null, error: null };

  if (teamApplicationResult.error) {
    return <p style={{ color: "crimson" }}>신청 상태를 불러오지 못했습니다.</p>;
  }

  const teamApplication = teamApplicationResult.data;

  const statusLabel =
    tournament.status === "open"
      ? "모집중"
      : tournament.status === "closed"
      ? "모집마감"
      : "준비중";
  const statusColor =
    tournament.status === "open"
      ? { background: "#dcfce7", color: "#166534" }
      : tournament.status === "closed"
      ? { background: "#fee2e2", color: "#991b1b" }
      : { background: "#e5e7eb", color: "#374151" };

  const participationMessage =
    tournament.status === "open"
      ? "현재 팀 참가 신청을 받고 있습니다"
      : tournament.status === "closed"
      ? "참가 신청이 마감되었습니다"
      : "대회 준비중입니다";

  const applyHref = isLoggedIn ? `/tournament/${id}/apply` : "/login";
  const standingsHref = `/tournament/${id}/standings`;
  const adminHref = `/admin/tournaments/${id}`;

  const statusCopy = teamApplication
    ? teamApplication.status === "approved"
      ? "참가 확정"
      : teamApplication.status === "rejected"
      ? "참가 거절됨"
      : "승인 대기 중"
    : null;

  return (
    <main style={{ padding: 24, background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 24 }}>
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h1 style={{ margin: 0 }}>{tournament.name}</h1>
            <span
              style={{
                fontSize: 12,
                padding: "2px 10px",
                borderRadius: 999,
                ...statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          <p style={{ marginTop: 8, color: "#4b5563" }}>
            기간: {tournament.start_date || "TBD"} - {tournament.end_date || "TBD"}
          </p>
          <p style={{ marginTop: 4, color: "#4b5563" }}>
            장소: {tournament.location || "TBD"}
          </p>
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>부문</h2>
          {divisions.length === 0 ? (
            <p>부문 정보가 없습니다.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {divisions.map((division) => (
                <div
                  key={division.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <strong>{division.name}</strong>
                  <div style={{ color: "#6b7280", marginTop: 6 }}>
                    조당 팀 수: {division.group_size ?? "TBD"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>참여 안내</h2>
          <p style={{ color: "#4b5563" }}>{participationMessage}</p>

          {teamApplication && statusCopy ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600 }}>{statusCopy}</div>
              <p style={{ marginTop: 4, color: "#6b7280" }}>
                {teamApplication.team_name}
              </p>
            </div>
          ) : null}

          {tournament.status === "open" && !teamApplication ? (
            <Link href={applyHref}>
              <button type="button" style={{ padding: "10px 16px", marginTop: 8 }}>
                팀 참가 신청
              </button>
            </Link>
          ) : null}

          {teamApplication?.status === "pending" ? (
            <button type="button" disabled style={{ padding: "10px 16px", marginTop: 8 }}>
              승인 대기 중
            </button>
          ) : null}

          {teamApplication?.status === "approved" ? (
            <Link href="/team">
              <button type="button" style={{ padding: "10px 16px", marginTop: 8 }}>
                내 팀 보기
              </button>
            </Link>
          ) : null}

          {teamApplication?.status === "rejected" ? (
            <button type="button" disabled style={{ padding: "10px 16px", marginTop: 8 }}>
              참가 거절됨
            </button>
          ) : null}

          {tournament.status === "closed" && !teamApplication ? (
            <Link href={standingsHref}>
              <button type="button" style={{ padding: "10px 16px", marginTop: 8 }}>
                대회 현황 보기
              </button>
            </Link>
          ) : null}

          {tournament.status === "draft" && isOrganizer ? (
            <Link href={adminHref}>
              <button type="button" style={{ padding: "10px 16px", marginTop: 8 }}>
                관리하기
              </button>
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<p>Loading tournament...</p>}>
      <TournamentDetail id={id} />
    </Suspense>
  );
}
