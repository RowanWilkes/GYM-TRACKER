"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { isRateLimited, mapAuthError, routeAfterAuth } from "@/lib/auth";

type Step = "landing" | "code";

export function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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

  async function sendCode(nextEmail: string) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: { shouldCreateUser: true },
    });
    if (otpError) {
      throw otpError;
    }
  }

  async function onEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!hasSupabaseConfig()) {
      setError("Add your Supabase URL and anon key to .env.local, then restart the app.");
      return;
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await sendCode(trimmed);
      setEmail(trimmed);
      setStep("code");
      setCode("");
    } catch (err) {
      setEmail(trimmed);
      if (isRateLimited(err)) {
        setStep("code");
        setCode("");
        setError("");
        setInfo(
          "A code may already be in your inbox. Enter it below, or wait a minute before resending."
        );
      } else {
        setError(mapAuthError(err, "email"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onCodeSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (verifyError) {
        throw verifyError;
      }
      await routeAfterAuth(router);
    } catch (err) {
      setError(mapAuthError(err, "code"));
      setLoading(false);
    }
  }

  async function onResend() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await sendCode(email);
      setInfo("A new code is on the way.");
    } catch (err) {
      setError(mapAuthError(err, "email"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
        <p className="text-sm text-[#9aa3b2]">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9aa3b2]">
        Progressive Overload Tracker
      </p>

      {step === "landing" ? (
        <>
          <h1 className="text-[2.15rem] font-extrabold leading-[1.1] tracking-tight text-[#f4f1ea]">
            Lift smarter every session
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#9aa3b2]">
            Log the weight, rate how it felt, and get tomorrow’s target — no
            notes app, no password.
          </p>
          <form onSubmit={onEmailSubmit} className="mt-8 flex flex-col gap-4">
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
                className="min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 text-lg text-[#f4f1ea] outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]"
              />
            </label>
            {error ? <p className="text-sm text-[#ff7a6e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a] disabled:opacity-60"
            >
              {loading ? "Sending code…" : "Get started"}
            </button>
            <p className="text-center text-sm text-[#9aa3b2]">
              No password. We&apos;ll email you a code.
            </p>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-tight text-[#f4f1ea]">
            Check your email — we sent a 6-digit code to {email}
          </h1>
          <form onSubmit={onCodeSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-[#9aa3b2]">
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="min-h-16 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 text-center text-3xl font-semibold tracking-[0.4em] text-[#f4f1ea] outline-none placeholder:tracking-[0.4em] placeholder:text-[#6b7380] focus:border-[#c9f24d]"
              />
            </label>
            {error ? <p className="text-sm text-[#ff7a6e]">{error}</p> : null}
            {info ? <p className="text-sm text-[#c9f24d]">{info}</p> : null}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a] disabled:opacity-60"
            >
              {loading ? "Checking…" : "Continue"}
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={loading}
              className="min-h-12 text-sm font-semibold text-[#c9f24d] disabled:opacity-60"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("landing");
                setCode("");
                setError("");
                setInfo("");
              }}
              className="text-sm text-[#9aa3b2]"
            >
              Use a different email
            </button>
          </form>
        </>
      )}
    </main>
  );
}
