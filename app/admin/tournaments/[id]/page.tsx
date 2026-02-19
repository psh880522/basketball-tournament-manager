import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTournamentProgressState } from "@/lib/api/tournamentProgress";
import { getPublicTournamentById } from "@/lib/api/tournaments";
import ProgressIndicator from "./ProgressIndicator";
import { finishTournamentAction } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ finishError?: string; finishSuccess?: string }>;
};

type StateCopy = {
  label: string;
  description: string;
};

const stateCopy: Record<string, StateCopy> = {
  TEAM_APPROVAL: {
    label: "팀 승인 대기",
    description: "팀 신청을 확인하고 승인하세요.",
  },
  GROUP_STAGE_GENERATED: {
    label: "조별 리그 준비 완료",
    description: "경기 결과를 입력할 수 있습니다.",
  },
  MATCH_IN_PROGRESS: {
    label: "조별 리그 진행 중",
    description: "완료된 경기 기반으로 순위를 계산하세요.",
  },
  STANDINGS_READY: {
    label: "순위 계산 완료",
    description: "토너먼트를 생성할 준비가 되었습니다.",
  },
  BRACKET_READY: {
    label: "토너먼트 진행 중",
    description: "다음 라운드를 생성하세요.",
  },
  TOURNAMENT_FINISHED: {
    label: "토너먼트 종료",
    description: "모든 라운드가 완료되었습니다.",
  },
};

async function TournamentDashboardContent({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [progress, tournamentResult] = await Promise.all([
    getTournamentProgressState(tournamentId),
    getPublicTournamentById(tournamentId),
  ]);

  if (progress.error) {
    return <p style={{ color: "crimson" }}>{progress.error}</p>;
  }

  if (tournamentResult.error) {
    return <p style={{ color: "crimson" }}>대회 정보를 불러오지 못했습니다.</p>;
  }

  if (!progress.data) {
    return <p>대회 정보를 찾을 수 없습니다.</p>;
  }

  if (!tournamentResult.data) {
    return <p>대회 정보를 찾을 수 없습니다.</p>;
  }

  const copy = stateCopy[progress.data.state];
  const isFinished = tournamentResult.data.status === "finished";
  const action = isFinished
    ? {
        label: "대회 종료",
        url: "",
        disabled: true,
        reason: "대회가 종료되었습니다.",
      }
    : progress.data.nextAction;

  return (
    <div style={{ display: "grid", gap: 24, marginTop: 16 }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          background: "#f9fafb",
        }}
      >
        <h2 style={{ marginTop: 0 }}>{progress.data.tournamentName}</h2>
        <p style={{ marginBottom: 4 }}>현재 상태: {copy.label}</p>
        <p style={{ marginTop: 0, color: "#6b7280" }}>{copy.description}</p>
        {isFinished ? (
          <p style={{ marginTop: 12, color: "#b45309" }}>
            대회가 종료되었습니다. 결과 페이지로 이동하세요.
          </p>
        ) : null}
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>다음 할 일</h3>
        {action.disabled ? (
          <button type="button" disabled style={{ padding: "10px 16px" }}>
            {action.label}
          </button>
        ) : (
          <Link href={action.url}>
            <button type="button" style={{ padding: "10px 16px" }}>
              {action.label}
            </button>
          </Link>
        )}
        {action.reason ? (
          <p style={{ marginTop: 8, color: "#9ca3af" }}>{action.reason}</p>
        ) : null}
        {isFinished ? (
          <div style={{ marginTop: 12 }}>
            <Link href={`/tournament/${tournamentId}/result`}>
              <button type="button" style={{ padding: "10px 16px" }}>
                결과 보기
              </button>
            </Link>
          </div>
        ) : null}
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>진행 단계</h3>
        <ProgressIndicator state={progress.data.state} />
      </section>
    </div>
  );
}

export default async function TournamentDashboardPage({
  params,
  searchParams,
}: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") redirect("/login");

  if (userResult.status === "error") {
    return <p style={{ color: "crimson" }}>{userResult.error}</p>;
  }

  if (userResult.status === "empty") {
    return <p>No profile found for this account.</p>;
  }

  if (userResult.role !== "organizer") redirect("/dashboard");

  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      <FinishSection tournamentId={id} messages={resolvedSearchParams} />
      <Suspense fallback={<p>Loading dashboard...</p>}>
        <TournamentDashboardContent tournamentId={id} />
      </Suspense>
    </main>
  );
}

async function FinishSection({
  tournamentId,
  messages,
}: {
  tournamentId: string;
  messages: { finishError?: string; finishSuccess?: string };
}) {
  const tournamentResult = await getPublicTournamentById(tournamentId);

  if (tournamentResult.error) {
    return <p style={{ color: "crimson" }}>대회 정보를 불러오지 못했습니다.</p>;
  }

  if (!tournamentResult.data) {
    return <p>대회 정보를 찾을 수 없습니다.</p>;
  }

  const isFinished = tournamentResult.data.status === "finished";

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        background: "#fff7ed",
      }}
    >
      <h2 style={{ marginTop: 0 }}>대회 종료</h2>
      {messages.finishError ? (
        <p style={{ marginTop: 0, color: "crimson" }}>{messages.finishError}</p>
      ) : null}
      {messages.finishSuccess ? (
        <p style={{ marginTop: 0, color: "#166534" }}>
          대회 종료가 완료되었습니다.
        </p>
      ) : null}
      {isFinished ? (
        <p style={{ marginTop: 0 }}>이미 종료된 대회입니다.</p>
      ) : (
        <form action={finishTournamentAction}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <p style={{ marginTop: 0 }}>
            종료하면 운영 기능이 잠기고 결과 화면으로 전환됩니다.
          </p>
          <label style={{ display: "block", marginTop: 8 }}>
            <input type="checkbox" name="confirm" value="yes" /> 종료 내용을
            확인했습니다.
          </label>
          <button type="submit" style={{ marginTop: 12, padding: "8px 12px" }}>
            대회 종료
          </button>
        </form>
      )}
    </section>
  );
}
