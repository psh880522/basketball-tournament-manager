"use client";

import StepIndicator from "@/components/ui/StepIndicator";

export const ONBOARDING_STEPS = ["회원가입", "선수 등록", "팀 등록"];

const STEP_KEYS = ["signup", "player", "team"];

export default function OnboardingStepIndicator({
  currentStep,
}: {
  currentStep: string;
}) {
  const currentIndex = STEP_KEYS.indexOf(currentStep);

  return <StepIndicator steps={ONBOARDING_STEPS} currentStep={currentIndex} />;
}
