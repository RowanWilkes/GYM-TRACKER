"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toSentenceCase } from "@/lib/types";

type SplitId = "full" | "upper-lower" | "classic" | "ppl" | "custom";

type SplitOption = {
  id: SplitId;
  title: string;
  label?: string;
  days: string[] | null;
};

const SPLITS: SplitOption[] = [
  { id: "full", title: "Full body", days: ["Full Body"] },
  { id: "upper-lower", title: "Upper / Lower", days: ["Upper", "Lower"] },
  {
    id: "classic",
    title: "Chest / Back / Legs",
    label: "the classic split",
    days: ["Chest & Tris", "Back & Bis", "Legs & Shoulders"],
  },
  { id: "ppl", title: "Push / Pull / Legs", days: ["Push", "Pull", "Legs"] },
  { id: "custom", title: "Build my own", days: null },
];

export function OnboardingSplit() {
  const router = useRouter();
  const [selected, setSelected] = useState<SplitId | null>(null);
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewDays = useMemo(() => {
    if (!selected) return [];
    if (selected === "custom") return customDays;
    return SPLITS.find((s) => s.id === selected)?.days ?? [];
  }, [selected, customDays]);

  const canContinue = selected !== null && previewDays.length > 0;

  function addCustomDay(event?: FormEvent) {
    event?.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    if (customDays.some((d) => d.toLowerCase() === name.toLowerCase())) {
      setDraftName("");
      return;
    }
    setCustomDays((prev) => [...prev, name]);
    setDraftName("");
    setError("");
  }

  async function onContinue() {
    if (!canContinue) return;
    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You need to be signed in to save your split.");
        setLoading(false);
        return;
      }

      const { error: deleteError } = await supabase.from("days").delete().eq("user_id", user.id);
      if (deleteError) throw deleteError;

      const rows = previewDays.map((name, position) => ({
        user_id: user.id,
        name,
        position,
      }));

      const { error: insertError } = await supabase.from("days").insert(rows);
      if (insertError) throw insertError;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, onboarded: true });
      if (profileError) throw profileError;

      router.replace("/tracker");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your split. Try again.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-36 pt-[calc(20px+env(safe-area-inset-top))]">
      <h1 className="t-title leading-[1.1]">
        How do you train?
      </h1>
      <p className="t-body mt-3 leading-relaxed">
        We&apos;ll set up your days. You can change this anytime.
      </p>

      <div className="mt-7 flex flex-col gap-3">
        {SPLITS.map((split) => {
          const isOn = selected === split.id;
          return (
            <button
              key={split.id}
              type="button"
              onClick={() => {
                setSelected(split.id);
                setError("");
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                isOn
                  ? "border-[#c9f24d] bg-[#c9f24d]/10 shadow-[inset_0_0_0_1px_#c9f24d]"
                  : "border-[#2a313c] bg-[#14171c]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="t-card">{split.title}</p>
                  {split.label ? (
                    <p className="t-meta mt-1">{split.label}</p>
                  ) : null}
                </div>
                {isOn ? (
                  <span className="t-value mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-[#c9f24d] text-[#14180a]!">
                    ✓
                  </span>
                ) : null}
              </div>
              {isOn && split.days ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {split.days.map((day) => (
                    <span
                      key={day}
                      className="t-meta rounded-full bg-[#c9f24d] px-3 py-1 text-[#14180a]!"
                    >
                      {toSentenceCase(day)}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {selected === "custom" ? (
        <form onSubmit={addCustomDay} className="mt-4">
          <label className="flex flex-col gap-2">
            <span className="t-label">Day name</span>
            <div className="flex gap-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g. Arms"
                className="t-value min-h-14 flex-1 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]"
              />
              <button
                type="submit"
                className="t-value min-h-14 min-w-20 rounded-2xl bg-[#c9f24d] px-4 text-[#14180a]!"
              >
                Add
              </button>
            </div>
          </label>
          {customDays.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {customDays.map((day, index) => (
                <button
                  key={`${day}-${index}`}
                  type="button"
                  onClick={() => setCustomDays((prev) => prev.filter((_, i) => i !== index))}
                  className="t-meta rounded-full bg-[#c9f24d] px-3 py-2 text-[#14180a]!"
                >
                  {toSentenceCase(day)} ×
                </button>
              ))}
            </div>
          ) : (
            <p className="t-meta mt-3">Add days one at a time.</p>
          )}
        </form>
      ) : null}

      {error ? <p className="t-body mt-4 text-[#ff7a6e]">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-[#2a313c] bg-[#0b0d10]/95 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || loading}
          className="t-value mx-auto block min-h-14 w-full max-w-md rounded-2xl bg-[#c9f24d] text-[#14180a]! disabled:opacity-40"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
