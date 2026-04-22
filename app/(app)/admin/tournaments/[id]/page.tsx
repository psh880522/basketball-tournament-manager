import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import { getTournamentProgressState } from "@/lib/api/tournamentProgress";
import {
  changeTournamentStatus,
  getTournamentForEdit,
  isTournamentStatus,
  softDeleteTournament,
  type TournamentStatus,
} from "@/lib/api/tournaments";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProgressIndicator, {
  type StepWithActions,
} from "./ProgressIndicator";
import { finishTournamentAction } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    finishError?: string;
    finishSuccess?: string;
    statusError?: string;
    statusSuccess?: string;
    deleteError?: string;
    deleteSuccess?: string;
  }>;
};

const statusLabels: Record<TournamentStatus, string> = {
  draft: "준비중",
  open: "모집중",
  closed: "진행중",
  finished: "완료",
};

const statusBadgeClasses: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-emerald-100 text-emerald-700",
  closed: "bg-blue-100 text-blue-700",
  finished: "bg-amber-100 text-amber-700",
};

const statusOptions: TournamentStatus[] = [
  "draft",
  "open",
  "closed",
  "finished",
];

const buildRedirectUrl = (
  tournamentId: string,
  params: Record<string, string>
) => {
  const searchParams = new URLSearchParams(params);
  return `/admin/tournaments/${tournamentId}?${searchParams.toString()}`;
};

const toText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const requiresStatusConfirm = (
  currentStatus: TournamentStatus,
  nextStatus: TournamentStatus
) => {
  if (nextStatus === "finished") return true;
  if (currentStatus === "closed" && nextStatus === "open") return true;
  if (currentStatus === "open" && nextStatus === "draft") return true;
  if (currentStatus === "closed" && nextStatus === "draft") return true;
  return false;
};

async function changeStatusAction(formData: FormData) {
  "use server";

  const tournamentId = toText(formData.get("tournamentId"));
  const nextStatusRaw = toText(formData.get("nextStatus"));
  const confirm = toText(formData.get("confirm"));

  if (!tournamentId) {
    redirect("/admin");
  }

  if (!isTournamentStatus(nextStatusRaw)) {
    redirect(buildRedirectUrl(tournamentId, { statusError: "잘못된 상태 값입니다." }));
  }

  const nextStatus = nextStatusRaw as TournamentStatus;
  const currentResult = await getTournamentForEdit(tournamentId);

  if (currentResult.error || !currentResult.data) {
    redirect(
      buildRedirectUrl(tournamentId, {
        statusError: currentResult.error ?? "대회 정보를 불러오지 못했습니다.",
      })
    );
  }

  const currentStatus = currentResult.data.status;
  if (requiresStatusConfirm(currentStatus, nextStatus) && confirm !== "yes") {
    redirect(
      buildRedirectUrl(tournamentId, {
        statusError: "변경 확인이 필요합니다.",
      })
    );
  }

  const result = await changeTournamentStatus(tournamentId, nextStatus);

  if (!result.ok) {
    redirect(buildRedirectUrl(tournamentId, { statusError: result.error }));
  }

  redirect(buildRedirectUrl(tournamentId, { statusSuccess: "1" }));
}

async function softDeleteAction(formData: FormData) {
  "use server";

  const tournamentId = toText(formData.get("tournamentId"));
  const confirm = toText(formData.get("confirm"));

  if (!tournamentId) {
    redirect("/admin");
  }

  if (confirm !== "yes") {
    redirect(buildRedirectUrl(tournamentId, { deleteError: "삭제 확인이 필요합니다." }));
  }

  const result = await softDeleteTournament(tournamentId);

  if (!result.ok) {
    redirect(buildRedirectUrl(tournamentId, { deleteError: result.error }));
  }

  redirect(buildRedirectUrl(tournamentId, { deleteSuccess: "1" }));
}

const buildSteps = (
  tournamentId: string,
  summary: {
    approvedTeams: number;
    totalTeams: number;
    totalMatches: number;
    completedMatches: number;
    standings: number;
    finalExists: boolean;
    courtsCount: number;
    scheduledMatches: number;
    tournamentStatus: TournamentStatus;
  }
): StepWithActions[] => {
  const {
    approvedTeams,
    totalTeams,
    totalMatches,
    completedMatches,
    standings,
    finalExists,
    courtsCount,
    scheduledMatches,
    tournamentStatus,
  } = summary;

  const isFinished = tournamentStatus === "finished";
  const steps: StepWithActions[] = [];

  // 1. 팀 승인
  const approvalDone = approvedTeams > 0 && approvedTeams === totalTeams;
  const approvalActive = approvedTeams === 0 && totalTeams > 0;
  steps.push({
    label: "팀 승인",
    status: approvalDone ? "done" : approvalActive ? "active" : "pending",
    actions: [
      {
        label: "신청 관리",
        href: `/admin/tournaments/${tournamentId}/applications`,
        enabled: true,
        variant: "primary",
      },
      {
        label: "승인팀 보기",
        href: `/admin/tournaments/${tournamentId}/applications?status=approved`,
        enabled: true,
        variant: "secondary",
      },
    ],
  });

  // 2. 경기 생성
  const matchCreatedDone = totalMatches > 0;
  const matchCreatedActive = totalMatches === 0 && approvedTeams > 1;
  steps.push({
    label: "경기 생성",
    status: matchCreatedDone ? "done" : matchCreatedActive ? "active" : "pending",
    actions: [
      {
        label: "경기 생성",
        href: `/admin/tournaments/${tournamentId}/bracket`,
        enabled: !isFinished && approvedTeams >= 2,
        reason: isFinished
          ? "종료된 대회"
          : approvedTeams < 2
          ? "승인 팀 2팀 이상 필요"
          : undefined,
        variant: "primary",
      },
      {
        label: "경기 목록",
        href: `/admin/tournaments/${tournamentId}/matches`,
        enabled: totalMatches > 0,
        reason: totalMatches === 0 ? "생성된 경기가 없습니다" : undefined,
        variant: "secondary",
      },
    ],
  });

  // 3. 스케줄
  const scheduleDone = totalMatches > 0 && scheduledMatches === totalMatches;
  const scheduleActive = !scheduleDone && totalMatches > 0 && courtsCount > 0;
  const scheduleEnabled = !isFinished && totalMatches > 0 && courtsCount > 0;
  const scheduleReason = isFinished
    ? "종료된 대회"
    : totalMatches === 0
    ? "먼저 경기 생성을 완료하세요"
    : courtsCount === 0
    ? "코트를 먼저 추가하세요"
    : undefined;
  steps.push({
    label: "스케줄",
    status: scheduleDone ? "done" : scheduleActive ? "active" : "pending",
    actions: [
      {
        label: "스케줄 생성",
        href: `/admin/tournaments/${tournamentId}/schedule`,
        enabled: scheduleEnabled,
        reason: scheduleReason,
        variant: "primary",
      },
      {
        label: "대회 수정",
        href: `/admin/tournaments/${tournamentId}/edit`,
        enabled: !isFinished,
        reason: isFinished ? "종료된 대회" : undefined,
        variant: "secondary",
      },
    ],
  });

  // 4. 결과
  const resultsDone = totalMatches > 0 && completedMatches === totalMatches;
  const resultsActive = totalMatches > 0 && completedMatches < totalMatches;
  const allMatchesDone = totalMatches > 0 && completedMatches === totalMatches;
  steps.push({
    label: "결과",
    status: resultsDone ? "done" : resultsActive ? "active" : "pending",
    actions: [
      {
        label: "결과 관리",
        href: `/admin/tournaments/${tournamentId}/result`,
        enabled: !isFinished && totalMatches > 0,
        reason: isFinished
          ? "종료된 대회"
          : totalMatches === 0
          ? "경기가 없습니다"
          : undefined,
        variant: "primary",
      },
      {
        label: "결과 보기",
        href: `/tournament/${tournamentId}`,
        enabled: true,
        reason: undefined,
        variant: "secondary",
      },
    ],
  });

  // 5. 종료
  steps.push({
    label: "종료",
    status: tournamentStatus === "finished" ? "done" : "pending",
    actions: [
      {
        label: "대회 종료",
        href: "",
        enabled: !isFinished,
        reason: isFinished ? "이미 종료됨" : undefined,
        variant: "primary",
        isFinishAction: true,
      },
    ],
  });

  return steps;
};

const resolveCurrentStage = (steps: StepWithActions[]) => {
  const activeStep = steps.find((step) => step.status === "active");
  if (activeStep) return activeStep.label;

  const lastDone = [...steps].reverse().find((step) => step.status === "done");
  return lastDone?.label ?? "대기";
};

async function TournamentDashboardContent({
  tournamentId,
  messages,
}: {
  tournamentId: string;
  messages: {
    finishError?: string;
    finishSuccess?: string;
    statusError?: string;
    statusSuccess?: string;
    deleteError?: string;
    deleteSuccess?: string;
  };
}) {
  const progress = await getTournamentProgressState(tournamentId);

  if (progress.error) {
    return (
      <Card className="text-sm text-red-600">
        {progress.error}
      </Card>
    );
  }

  if (!progress.data) {
    return (
      <Card className="text-sm text-gray-600">
        대회 정보를 찾을 수 없습니다.
      </Card>
    );
  }

  const summary = progress.data.summary;
  const steps = buildSteps(tournamentId, {
    approvedTeams: summary.approvedTeams,
    totalTeams: summary.totalTeams,
    totalMatches: summary.totalMatches,
    completedMatches: summary.completedMatches,
    standings: summary.standings,
    finalExists: summary.finalExists,
    courtsCount: summary.courtsCount,
    scheduledMatches: summary.scheduledMatches,
    tournamentStatus: summary.tournamentStatus,
  });
  const currentStage = resolveCurrentStage(steps);
  const isFinished = summary.tournamentStatus === "finished";
  const completedTournamentMatches = Math.max(
    summary.completedMatches - summary.completedGroupMatches,
    0
  );

  const readinessKpis = [
    {
      label: "승인 팀",
      value: `${summary.approvedTeams}/${summary.totalTeams}`,
      subtext: "승인/전체",
    },
    {
      label: "승인 대기",
      value: `${Math.max(summary.totalTeams - summary.approvedTeams, 0)}`,
      subtext: "대기 팀",
    },
    {
      label: "코트 수",
      value: `${summary.courtsCount}`,
      subtext: "등록된 코트",
    },
    {
      label: "스케줄 배정",
      value: `${summary.scheduledMatches}/${summary.totalMatches}`,
      subtext: "배정/전체",
    },
  ];

  const progressKpis = [
    {
      label: "리그 경기",
      value: `${summary.completedGroupMatches}/${summary.groupMatches}`,
      subtext: "완료/전체",
    },
    {
      label: "토너먼트 경기",
      value: `${completedTournamentMatches}/${summary.tournamentMatches}`,
      subtext: "완료/전체",
    },
    {
      label: "진행/전체",
      value: `${summary.completedMatches}/${summary.totalMatches}`,
      subtext: "완료/전체",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {progress.data.tournamentName}
              </h1>
              <Badge className={statusBadgeClasses[summary.tournamentStatus]}>
                {statusLabels[summary.tournamentStatus]}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">현재 단계: {currentStage}</p>
          </div>
          <Card variant="highlight" className="min-w-[240px] space-y-2">
            <p className="text-xs font-semibold text-amber-800">다음 행동</p>
            <p className="text-base font-semibold text-gray-900">
              {progress.data.nextAction.label}
            </p>
            {progress.data.nextAction.disabled || !progress.data.nextAction.url ? (
              <Button variant="secondary" disabled>
                이동
              </Button>
            ) : (
              <Link href={progress.data.nextAction.url}>
                <Button>이동</Button>
              </Link>
            )}
            {progress.data.nextAction.reason ? (
              <p className="text-xs text-gray-500">
                {progress.data.nextAction.reason}
              </p>
            ) : null}
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="space-y-3">
            <div>
              <p className="text-sm font-semibold">운영 준비도</p>
              <p className="text-xs text-gray-500">운영을 시작하기 위한 기준</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {readinessKpis.map((item) => (
                <Card key={item.label} variant="muted" className="space-y-1">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {item.value}
                  </p>
                  <p className="text-xs text-gray-400">{item.subtext}</p>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div>
              <p className="text-sm font-semibold">진행 현황</p>
              <p className="text-xs text-gray-500">경기 진행 및 토너먼트 상태</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {progressKpis.map((item) => (
                <Card key={item.label} variant="muted" className="space-y-1">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {item.value}
                  </p>
                  <p className="text-xs text-gray-400">{item.subtext}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">진행 단계</h2>
        <ProgressIndicator
          steps={steps}
          tournamentId={tournamentId}
          finishMessages={{
            finishError: messages.finishError,
            finishSuccess: messages.finishSuccess,
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">운영 위험 작업</h2>
          <Badge variant="warning">주의</Badge>
        </div>
        <Card variant="muted" className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">상태 변경</p>
              <Badge variant="warning">중요</Badge>
            </div>
            <form action={changeStatusAction} className="space-y-2">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-amber-200 bg-white px-2 py-2 text-sm"
                  name="nextStatus"
                  defaultValue={summary.tournamentStatus}
                  disabled={isFinished}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" disabled={isFinished}>
                  상태 적용
                </Button>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" name="confirm" value="yes" />
                위험 전이 시 확인이 필요합니다.
              </label>
              {isFinished ? (
                <p className="text-xs text-gray-600">
                  종료된 대회는 변경할 수 없습니다.
                </p>
              ) : null}
              {messages.statusError ? (
                <p className="text-sm text-red-600">{messages.statusError}</p>
              ) : null}
              {messages.statusSuccess ? (
                <p className="text-sm text-emerald-600">상태 변경이 완료되었습니다.</p>
              ) : null}
            </form>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">대회 종료</p>
              <Badge variant="danger">위험</Badge>
            </div>
            {messages.finishError ? (
              <p className="text-sm text-red-600">{messages.finishError}</p>
            ) : null}
            {messages.finishSuccess ? (
              <p className="text-sm text-emerald-600">대회 종료가 완료되었습니다.</p>
            ) : null}
            {isFinished ? (
              <p className="text-xs text-gray-600">이미 종료된 대회입니다.</p>
            ) : (
              <form action={finishTournamentAction} className="space-y-2">
                <input type="hidden" name="tournamentId" value={tournamentId} />
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" name="confirm" value="yes" />
                  종료 내용을 확인했습니다.
                </label>
                <Button type="submit" variant="secondary">
                  대회 종료
                </Button>
              </form>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">대회 삭제</p>
              <Badge variant="danger">위험</Badge>
            </div>
            <form action={softDeleteAction} className="space-y-2">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" name="confirm" value="yes" />
                삭제 확인이 필요합니다.
              </label>
              <Button type="submit" variant="secondary">
                삭제
              </Button>
              {messages.deleteError ? (
                <p className="text-sm text-red-600">{messages.deleteError}</p>
              ) : null}
              {messages.deleteSuccess ? (
                <p className="text-sm text-emerald-600">대회가 삭제되었습니다.</p>
              ) : null}
            </form>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default async function TournamentDashboardPage({
  params,
  searchParams,
}: PageProps) {
  const userResult = await getUserWithRole();

  if (userResult.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <Card className="text-sm text-red-600">
            {userResult.error ?? "사용자 정보를 불러오지 못했습니다."}
          </Card>
        </div>
      </main>
    );
  }

  if (userResult.status === "empty") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <Card className="text-sm text-gray-600">
            프로필이 없습니다.
          </Card>
        </div>
      </main>
    );
  }

  if (!isOperationRole(userResult.role)) redirect("/dashboard");

  const { id } = await params;
  const messages = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="text-sm text-gray-500">
            ← 목록으로
          </Link>
        </div>
        <TournamentDashboardContent tournamentId={id} messages={messages} />
      </div>
    </main>
  );
}
