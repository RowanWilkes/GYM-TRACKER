"use client";

import { AuthGate } from "@/components/auth-gate";
import { OnboardingSplit } from "@/components/onboarding-split";

export default function OnboardingPage() {
  return (
    <AuthGate redirectIfOnboarded>
      <OnboardingSplit />
    </AuthGate>
  );
}
