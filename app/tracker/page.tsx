"use client";

import { AuthGate } from "@/components/auth-gate";
import { TrackerApp } from "@/components/tracker-app";
import "../tracker.css";

export default function TrackerPage() {
  return (
    <AuthGate requireOnboarded>
      <TrackerApp />
    </AuthGate>
  );
}
