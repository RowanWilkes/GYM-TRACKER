"use client";

import { AuthGate } from "@/components/auth-gate";
import { TrainingDaysEditor } from "@/components/training-days-editor";
import "../tracker.css";
import "../training-days.css";

export default function TrainingDaysPage() {
  return (
    <AuthGate requireOnboarded>
      <TrainingDaysEditor />
    </AuthGate>
  );
}
