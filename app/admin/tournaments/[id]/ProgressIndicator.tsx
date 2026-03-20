"use client";

import Link from "next/link";
import { useTransition } from "react";
import Button from "@/components/ui/Button";
import { finishTournamentAction } from "./actions";
import { STEP_DESCRIPTIONS } from "./StepDescriptions";

export type StepStatus = "done" | "active" | "pending";

export type StepAction = {
  label: string;
  href: string;
  enabled: boolean;
  reason?: string;
  variant: "primary" | "secondary";
  isFinishAction?: boolean;
};

export type StepWithActions = {
  label: string;
  status: StepStatus;
  actions: StepAction[];
};

type ProgressProps = {
  steps: StepWithActions[];
  tournamentId: string;
  finishMessages?: {
    finishError?: string;
    finishSuccess?: string;
  };
};

export default function ProgressIndicator({
  steps,
  tournamentId,
  finishMessages,
}: ProgressProps) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
      {steps.map((step, index) => (
        <StepCard
          key={`${step.label}-${index}`}
          step={step}
          tournamentId={tournamentId}
          finishMessages={
            step.actions.some((a) => a.isFinishAction)
              ? finishMessages
              : undefined
          }
        />
      ))}
    </ol>
  );
}

function StepCard({
  step,
  tournamentId,
  finishMessages,
}: {
  step: StepWithActions;
  tournamentId: string;
  finishMessages?: { finishError?: string; finishSuccess?: string };
}) {
  const statusLabel: Record<StepStatus, string> = {
    done: "완료",
    active: "진행중",
    pending: "대기",
  };
  const dotClass =
    step.status === "active"
      ? "bg-gray-900"
      : step.status === "done"
      ? "bg-emerald-500"
      : "bg-gray-300";
  const colorClass =
    step.status === "active"
      ? "text-gray-900"
      : step.status === "done"
      ? "text-emerald-700"
      : "text-gray-400";
  const weightClass =
    step.status === "active" ? "font-semibold" : "font-medium";

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
          aria-hidden="true"
        />
        <div className="flex flex-col">
          <span className={`text-sm ${weightClass} ${colorClass}`}>
            {step.label}
          </span>
          <span className="text-xs text-gray-400">
            {statusLabel[step.status]}
          </span>
        </div>
      </div>
      {STEP_DESCRIPTIONS[step.label] ? (
        <p className="text-xs text-gray-500">
          {STEP_DESCRIPTIONS[step.label]}
        </p>
      ) : null}
      {step.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {step.actions.map((action) =>
            action.isFinishAction ? (
              <FinishButton
                key={action.label}
                action={action}
                tournamentId={tournamentId}
                messages={finishMessages}
              />
            ) : (
              <ActionLink key={action.label} action={action} />
            )
          )}
        </div>
      )}
    </li>
  );
}

function ActionLink({ action }: { action: StepAction }) {
  if (!action.enabled) {
    return (
      <div>
        <Button variant={action.variant} disabled>
          {action.label}
        </Button>
        {action.reason && (
          <p className="mt-1 text-xs text-gray-400">{action.reason}</p>
        )}
      </div>
    );
  }

  return (
    <Link href={action.href}>
      <Button variant={action.variant}>{action.label}</Button>
    </Link>
  );
}

function FinishButton({
  action,
  tournamentId,
  messages,
}: {
  action: StepAction;
  tournamentId: string;
  messages?: { finishError?: string; finishSuccess?: string };
}) {
  const [isPending, startTransition] = useTransition();

  const handleFinish = () => {
    if (!action.enabled) return;
    if (!window.confirm("대회를 종료하시겠습니까?")) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("tournamentId", tournamentId);
      formData.set("confirm", "yes");
      await finishTournamentAction(formData);
    });
  };

  return (
    <div>
      <Button
        variant={action.variant}
        disabled={!action.enabled || isPending}
        onClick={handleFinish}
      >
        {isPending ? "처리중..." : action.label}
      </Button>
      {!action.enabled && action.reason && (
        <p className="mt-1 text-xs text-gray-400">{action.reason}</p>
      )}
      {messages?.finishError && (
        <p className="mt-1 text-xs text-red-600">{messages.finishError}</p>
      )}
      {messages?.finishSuccess && (
        <p className="mt-1 text-xs text-emerald-600">
          대회가 종료되었습니다.
        </p>
      )}
    </div>
  );
}
