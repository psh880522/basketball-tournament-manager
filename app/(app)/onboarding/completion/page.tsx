import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserWithRole, isPlayerRole } from "@/src/lib/auth/roles";
import Button from "@/components/ui/Button";
import OnboardingStepIndicator from "@/components/onboarding/OnboardingStepIndicator";

export const dynamic = "force-dynamic";

const STEP_CONFIG = {
  signup: {
    completedStep: "signup" as const,
    title: "회원가입이 완료되었습니다!",
    desc: "선수 등록을 완료하면 대회에 참가할 수 있습니다.\n다음 단계를 진행하시겠습니까?",
    primaryLabel: "선수 등록 시작하기",
    primaryHref: "/onboarding/profile",
  },
  player: {
    completedStep: "player" as const,
    title: "선수 등록이 완료되었습니다!",
    desc: "팀을 만들거나 팀에 합류하면 대회에 참가할 수 있습니다.\n다음 단계를 진행하시겠습니까?",
    primaryLabel: "팀 등록 시작하기",
    primaryHref: "/onboarding/team-choice",
  },
} as const;

type StepKey = keyof typeof STEP_CONFIG;

function isValidStep(step: string | undefined): step is StepKey {
  return step === "signup" || step === "player";
}

export default async function OnboardingCompletionPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated" || result.status === "empty") {
    redirect("/login");
  }

  if (result.status === "error") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      </main>
    );
  }

  const { step } = await searchParams;

  // step=player는 선수(player)만 접근 가능
  if (step === "player" && !isPlayerRole(result.role)) {
    redirect("/onboarding/profile");
  }

  // step=signup은 user만 접근 가능 (player면 이미 등록 완료)
  if (step === "signup" && isPlayerRole(result.role)) {
    redirect("/onboarding/completion?step=player");
  }

  // 운영/관리 역할 → 홈
  if (result.role !== "user" && result.role !== "player") redirect("/");

  // step이 없거나 잘못된 경우 role 기반으로 적절한 단계로 이동
  if (!isValidStep(step)) {
    redirect(
      isPlayerRole(result.role)
        ? "/onboarding/completion?step=player"
        : "/onboarding/completion?step=signup"
    );
  }

  const config = STEP_CONFIG[step];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <OnboardingStepIndicator currentStep={config.completedStep} />

        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="text-5xl">✓</span>
          <h1 className="text-2xl font-semibold text-slate-900">
            {config.title}
          </h1>
          {config.desc.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-slate-500">
              {line}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link href={config.primaryHref}>
            <Button className="w-full">{config.primaryLabel}</Button>
          </Link>
          <Link
            href="/dashboard"
            className="text-center text-sm text-slate-500 hover:text-slate-700"
          >
            나중에 하기
          </Link>
        </div>
      </div>
    </main>
  );
}
