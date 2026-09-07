"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { mapAuthError, routeAfterAuth } from "@/lib/auth";

type Step = "landing" | "login" | "signup";

const fieldClass =
  "min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 text-lg text-[#f4f1ea] outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]";

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
        <p className="text-sm text-[#9aa3b2]">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      {step === "landing" ? (
        <>
          <h1 className="text-[2.15rem] font-extrabold leading-[1.1] tracking-tight break-words text-[#f4f1ea]">
            Progressive Overload Tracker
          </h1>
          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => openForm("login")}
              className="min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a]"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => openForm("signup")}
              className="min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] text-base font-extrabold text-[#f4f1ea]"
            >
              Sign up
            </button>
          </div>
        </>
      ) : null}

      {step === "login" ? (
        <>
          <h1 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-tight text-[#f4f1ea]">
            Log in
          </h1>
          <form onSubmit={onLogin} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-[#9aa3b2]">
              Email
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
            <label className="flex flex-col gap-2 text-sm text-[#9aa3b2]">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={fieldClass}
              />
            </label>
            {error ? <p className="text-sm text-[#ff7a6e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a] disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
            <button
              type="button"
              onClick={backToLanding}
              className="text-sm text-[#9aa3b2]"
            >
              Back
            </button>
          </form>
        </>
      ) : null}

      {step === "signup" ? (
        <>
          <h1 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-tight text-[#f4f1ea]">
            Sign up
          </h1>
          <form onSubmit={onSignup} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-[#9aa3b2]">
              Email
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
            <label className="flex flex-col gap-2 text-sm text-[#9aa3b2]">
              Password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={fieldClass}
              />
            </label>
            {error ? <p className="text-sm text-[#ff7a6e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a] disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Sign up"}
            </button>
            <button
              type="button"
              onClick={backToLanding}
              className="text-sm text-[#9aa3b2]"
            >
              Back
            </button>
          </form>
        </>
      ) : null}
    </main>
  );
}
