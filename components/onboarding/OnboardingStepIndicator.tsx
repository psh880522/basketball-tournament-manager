"use client";

type Step = {
  key: string;
  label: string;
};

export const ONBOARDING_STEPS: Step[] = [
  { key: "signup", label: "회원가입" },
  { key: "player", label: "선수 등록" },
  { key: "team", label: "팀 등록" },
];

export default function OnboardingStepIndicator({
  currentStep,
}: {
  currentStep: string;
}) {
  const currentIndex = ONBOARDING_STEPS.findIndex(
    (s) => s.key === currentStep
  );

  return (
    <div className="flex overflow-x-auto border-b border-gray-200">
      {ONBOARDING_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = step.key === currentStep;

        return (
          <span
            key={step.key}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium select-none ${
              isActive
                ? "border-b-2 border-blue-600 text-blue-600"
                : isDone
                ? "text-gray-400"
                : "text-gray-300"
            }`}
          >
            {isDone ? "✓ " : ""}{step.label}
          </span>
        );
      })}
    </div>
  );
}
