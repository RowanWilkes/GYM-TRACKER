"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { mapAuthError, routeAfterAuth } from "@/lib/auth";

type Step = "landing" | "login" | "signup";

const fieldClass =
  "t-value min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]";

export function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!hasSupabaseConfig()) {
        setCheckingSession(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        await routeAfterAuth(router);
        return;
      }
      setCheckingSession(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function openForm(next: "login" | "signup") {
    setStep(next);
    setPassword("");
    setError("");
  }

  function backToLanding() {
    setStep("landing");
    setPassword("");
    setError("");
  }

  function validate(): string | null {
    if (!hasSupabaseConfig()) {
      return "Add your Supabase URL and anon key to .env.local, then restart the app.";
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      return "Enter a valid email address.";
    }
    if (!password) {
      return "Enter a password.";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    return null;
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setLoading(true);
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      await routeAfterAuth(router);
    } catch (err) {
      setError(mapAuthError(err, "login"));
      setLoading(false);
    }
  }

  async function onSignup(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setLoading(true);
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password,
      });
      if (signUpError) {
        throw signUpError;
      }
      if (!data.session) {
        setError("Account created, but you still need to log in. If that fails, turn off Confirm email in Supabase Auth settings.");
        setLoading(false);
        return;
      }
      router.replace("/onboarding");
    } catch (err) {
      setError(mapAuthError(err, "signup"));
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
        <p className="t-meta">Checking your session…</p>
      </main>
    );
  }

  if (step === "landing") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col overflow-y-auto px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col justify-center py-6">
          <div
            className="mb-5 grid h-[46px] w-[46px] place-items-center bg-[var(--accent)] text-[#14180a]"
            style={{ borderRadius: 13 }}
            aria-hidden="true"
          >
            <TrendIcon />
          </div>
          <h1 className="max-w-[16ch] font-semibold tracking-[-0.03em] text-[var(--text-primary)] [font-size:clamp(1.625rem,4.6vw+0.7rem,2rem)] leading-[1.08]">
            Know exactly what to lift next
          </h1>
          <p className="t-body mt-3 max-w-[34ch] leading-relaxed text-[var(--text-muted)]">
            Log your sets, and the app tells you the weight and reps to hit next session. No more guessing.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center text-[var(--accent)]" aria-hidden="true">
                <BoltIcon />
              </span>
              <span className="t-body">Log a full set in a couple taps</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center text-[var(--accent)]" aria-hidden="true">
                <TargetIcon />
              </span>
              <span className="t-body">Auto-calculated progression targets</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center text-[var(--accent)]" aria-hidden="true">
                <PhoneIcon />
              </span>
              <span className="t-body">Built for your phone at the rack</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => openForm("signup")}
            className="t-value min-h-14 rounded-2xl bg-[var(--accent)] text-[#14180a]!"
          >
            Create free account
          </button>
          <button
            type="button"
            onClick={() => openForm("login")}
            className="t-value min-h-14 rounded-2xl border border-[#2a313c] bg-transparent text-[var(--text-primary)]"
          >
            Log in
          </button>
          <p className="t-meta mt-1 text-center">Free · 30 seconds</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      {step === "login" ? (
        <>
          <h1 className="t-title leading-[1.15]">
            Log in
          </h1>
          <form onSubmit={onLogin} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="t-label">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="t-label">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={fieldClass}
              />
            </label>
            {error ? <p className="t-body text-[#ff7a6e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="t-value min-h-14 rounded-2xl bg-[#c9f24d] text-[#14180a]! disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
            <button
              type="button"
              onClick={backToLanding}
              className="t-meta"
            >
              Back
            </button>
          </form>
        </>
      ) : null}

      {step === "signup" ? (
        <>
          <h1 className="t-title leading-[1.15]">
            Sign up
          </h1>
          <form onSubmit={onSignup} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="t-label">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="t-label">Password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={fieldClass}
              />
            </label>
            {error ? <p className="t-body text-[#ff7a6e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="t-value min-h-14 rounded-2xl bg-[#c9f24d] text-[#14180a]! disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Sign up"}
            </button>
            <button
              type="button"
              onClick={backToLanding}
              className="t-meta"
            >
              Back
            </button>
          </form>
        </>
      ) : null}
    </main>
  );
}

function TrendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 16.5 9 11l3.5 3.5L20 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 7H20v5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="2.75" width="10" height="18.5" rx="2.4" stroke="currentColor" strokeWidth="2" />
      <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
