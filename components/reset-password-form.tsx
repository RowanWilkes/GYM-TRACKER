"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { isRateLimited } from "@/lib/auth";
import { resetLinkErrorMessage, validateEmail } from "@/lib/passwordReset";

const fieldClass =
  "t-value min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = resetLinkErrorMessage(params.get("error"));
    if (message) setError(message);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!hasSupabaseConfig()) {
      setError("Add your Supabase URL and anon key to .env.local, then restart the app.");
      return;
    }
    const message = validateEmail(email);
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setLoading(true);
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
      });
      if (resetError) {
        throw resetError;
      }
      setSentTo(trimmed);
      setLoading(false);
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Could not send reset link.";
      setError(isRateLimited(err) ? "Too many attempts. Wait a minute and try again." : fallback);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-4 py-12">
      <h1 className="t-title leading-[1.15]">Forgot password</h1>
      {sentTo ? (
        <div className="mt-8 flex flex-col gap-4">
          <p className="t-body">{`Check your email — sent a link to ${sentTo}.`}</p>
          <Link href="/" className="t-meta">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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
          {error ? <p className="t-body text-[#ff7a6e]">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="t-value min-h-14 rounded-2xl bg-[#c4f042] text-[#14180a]! disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <Link href="/" className="t-meta">
            Back to log in
          </Link>
        </form>
      )}
    </main>
  );
}
