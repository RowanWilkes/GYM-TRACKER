"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  type DayRow,
  type Equipment,
  type ExerciseRow,
  type LogRow,
  type Rating,
  formatTodayHeader,
  todayISO,
  toSentenceCase,
} from "@/lib/types";
import LiftLoader from "@/components/LiftLoader";
import { DayTabs } from "@/components/day-tabs";
import { ExerciseCard, type ExerciseSession } from "@/components/exercise-card";
import {
  EQUIPMENT,
  searchExercises,
  type LibraryExercise,
} from "@/src/data/exerciseLibrary";

type Draft = { error: string };

export function TrackerApp() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [dayId, setDayId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const today = todayISO();
  const selectedDay = days.find((d) => d.id === dayId) ?? null;

  useEffect(() => {
    setDrafts({});
  }, [today]);

  const loadDays = useCallback(async (uid: string) => {
    const { data, error: daysError } = await supabase
      .from("days")
      .select("id, user_id, name, position, sort_order")
      .eq("user_id", uid)
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (daysError) throw daysError;
    return (data ?? []) as DayRow[];
  }, []);

  const loadExercisesAndLogs = useCallback(async (uid: string, selected: string) => {
    const { data: exerciseRows, error: exError } = await supabase
      .from("exercises")
      .select("id, user_id, day_id, name, equipment, rep_min, rep_max, position, weight_increment")
      .eq("user_id", uid)
      .eq("day_id", selected)
      .order("position", { ascending: true });
    if (exError) throw exError;
    const list = (exerciseRows ?? []) as ExerciseRow[];
    if (!list.length) {
      return { list, logs: [] as LogRow[] };
    }
    const ids = list.map((e) => e.id);
    const { data: logRows, error: logError } = await supabase
      .from("logs")
      .select("id, user_id, exercise_id, logged_at, weight_kg, reps, sets, rating, reps_per_set, target_reps")
      .eq("user_id", uid)
      .in("exercise_id", ids)
      .order("logged_at", { ascending: false });
    if (logError) throw logError;
    return { list, logs: (logRows ?? []) as LogRow[] };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setError("");
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("You need to be signed in.");
        setLoading(false);
        return;
      }
      try {
        const dayRows = await loadDays(user.id);
        if (cancelled) return;
        setUserId(user.id);
        setDays(dayRows);
        const first = dayRows[0]?.id ?? null;
        setDayId(first);
        if (first) {
          const { list, logs: logRows } = await loadExercisesAndLogs(user.id, first);
          if (cancelled) return;
          setExercises(list);
          setLogs(logRows);
        } else {
          setExercises([]);
          setLogs([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your tracker.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [loadDays, loadExercisesAndLogs]);

  async function selectDay(id: string) {
    if (!userId) return;
    setDayId(id);
    setShowAdd(false);
    setError("");
    try {
      const { list, logs: logRows } = await loadExercisesAndLogs(userId, id);
      setExercises(list);
      setLogs(logRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this day.");
    }
  }

  async function refreshCurrentDay() {
    if (!userId || !dayId) return;
    const { list, logs: logRows } = await loadExercisesAndLogs(userId, dayId);
    setExercises(list);
    setLogs(logRows);
  }

  const logsByExercise = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    for (const row of logs) {
      const list = map.get(row.exercise_id) ?? [];
      list.push(row);
      map.set(row.exercise_id, list);
    }
    return map;
  }, [logs]);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { error: "" }), ...patch },
    }));
  }

  async function saveSet(exerciseId: string, rating: Rating, session: ExerciseSession) {
    const weightKg = Number(session.weightKg);
    const repsPerSet = session.repsPerSet.map(Number);
    if (
      !Number.isFinite(weightKg) ||
      weightKg <= 0 ||
      repsPerSet.length < 1 ||
      repsPerSet.some((n) => !Number.isFinite(n) || n <= 0)
    ) {
      updateDraft(exerciseId, { error: "Enter what you lifted first" });
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(userError ?? "No user");
      updateDraft(exerciseId, { error: userError?.message || "You need to be signed in." });
      return;
    }

    const loggedAt = todayISO();
    const payload = {
      user_id: user.id,
      exercise_id: exerciseId,
      logged_at: loggedAt,
      weight_kg: weightKg,
      reps: Math.min(...repsPerSet),
      sets: repsPerSet.length,
      rating,
      reps_per_set: repsPerSet,
      target_reps: session.targetReps,
    };

    setLogs((prev) => {
      const index = prev.findIndex(
        (row) => row.exercise_id === exerciseId && row.logged_at === loggedAt
      );
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], ...payload };
        return next;
      }
      return [
        ...prev,
        {
          id: `pending-${exerciseId}-${loggedAt}`,
          ...payload,
        },
      ];
    });
    updateDraft(exerciseId, { error: "" });

    const { error: saveError } = await supabase
      .from("logs")
      .upsert(payload, { onConflict: "exercise_id,logged_at" });
    if (saveError) {
      console.error(saveError);
      updateDraft(exerciseId, { error: saveError.message || "Couldn't save" });
      await refreshCurrentDay();
      return;
    }

    await refreshCurrentDay();
  }

  async function deleteExercise(exerciseId: string) {
    if (!userId) return;
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    setLogs((prev) => prev.filter((row) => row.exercise_id !== exerciseId));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setError("");

    const { error: deleteError } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exerciseId)
      .eq("user_id", userId);
    if (deleteError) {
      console.error(deleteError);
      setError("Couldn't delete");
      await refreshCurrentDay();
    }
  }

  if (loading) {
    return <LiftLoader />;
  }

  return (
    <div className="tracker-root">
      <header className="topbar">
        <div>
          <p className="eyebrow t-meta">{formatTodayHeader(today)}</p>
          <h1 className="t-title">Progressive Overload Tracker</h1>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="sign-out-chip edit-days-chip flex-none w-[38px] h-[38px] rounded-full grid place-items-center border-[0.5px] border-[#2c322f] transition hover:bg-white/5 active:scale-[0.97]"
            aria-label="Edit training days"
            title="Edit training days"
            onClick={() => router.push("/training-days")}
          >
            <svg
              className="sign-out-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            className="sign-out-chip flex-none w-[38px] h-[38px] rounded-full grid place-items-center border-[0.5px] border-[#2c322f] text-[#8b928c] transition hover:border-[#3a413d] hover:text-[#c9cec9] hover:bg-white/5 active:scale-[0.97]"
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <svg
              className="sign-out-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {error ? <p className="inline-error t-body">{error}</p> : null}

      {days.length ? (
        <DayTabs days={days} dayId={dayId} onSelect={selectDay} />
      ) : (
        <p className="progress-note t-meta">No training days yet. Finish onboarding to add a split.</p>
      )}

      {selectedDay ? (
        <main className="screen is-visible">
          {exercises.length === 0 ? (
            <EmptyExercises onAdd={() => setShowAdd(true)} />
          ) : (
            <>
              <p className="progress-note t-meta">
                {exercises.filter((ex) => (logsByExercise.get(ex.id) ?? []).some((l) => l.logged_at === today)).length}
                {" of "}
                {exercises.length} logged today
              </p>
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  ex={ex}
                  logs={logsByExercise.get(ex.id) ?? []}
                  today={today}
                  error={drafts[ex.id]?.error}
                  onSave={saveSet}
                  onDelete={deleteExercise}
                />
              ))}
              <AddExerciseButton variant="row" onClick={() => setShowAdd(true)} />
            </>
          )}
        </main>
      ) : null}

      {showAdd && userId && dayId ? (
        <AddExerciseSheet
          dayId={dayId}
          dayName={selectedDay?.name ?? ""}
          dayExercises={exercises}
          nextPosition={exercises.length}
          onClose={() => setShowAdd(false)}
          onAdded={refreshCurrentDay}
          onCreated={async () => {
            setShowAdd(false);
            await refreshCurrentDay();
          }}
        />
      ) : null}
    </div>
  );
}

function AddExerciseButton({
  variant,
  onClick,
}: {
  variant: "empty" | "row";
  onClick: () => void;
}) {
  return (
    <button className={`add-exercise add-exercise-${variant} t-body`} type="button" onClick={onClick}>
      <svg className="add-exercise-plus" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 2.5v11M2.5 8h11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
      Add exercise
    </button>
  );
}

function EmptyExercises({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-exercises">
      <BarbellIcon />
      <h2 className="t-title">No exercises yet</h2>
      <p className="muted t-meta">Add the lifts you do on this day</p>
      <AddExerciseButton variant="empty" onClick={onAdd} />
    </div>
  );
}

function BarbellIcon() {
  return (
    <svg className="barbell-icon" viewBox="0 0 88 48" aria-hidden="true">
      <rect x="34" y="18" width="20" height="12" rx="4" fill="#c9f24d" />
      <rect x="16" y="10" width="12" height="28" rx="4" fill="#f4f1ea" />
      <rect x="60" y="10" width="12" height="28" rx="4" fill="#f4f1ea" />
      <rect x="8" y="16" width="8" height="16" rx="3" fill="#9aa3b2" />
      <rect x="72" y="16" width="8" height="16" rx="3" fill="#9aa3b2" />
    </svg>
  );
}

function libraryKey(entry: LibraryExercise): string {
  return `${entry.name}|${entry.equipment}`;
}

function exerciseNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function toCatalogEquipment(value: string): (typeof EQUIPMENT)[number] {
  const match = EQUIPMENT.find((item) => item.toLowerCase() === value.trim().toLowerCase());
  return match ?? "Other";
}

function logSupabaseError(label: string, err: { message?: string; code?: string; details?: string } | null) {
  console.error(label, {
    message: err?.message,
    code: err?.code,
    details: err?.details,
    error: err,
  });
}

function AddExerciseSheet({
  dayId,
  dayName,
  dayExercises,
  nextPosition,
  onClose,
  onAdded,
  onCreated,
}: {
  dayId: string;
  dayName: string;
  dayExercises: ExerciseRow[];
  nextPosition: number;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
  onCreated: () => void;
}) {
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("other");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(() => new Set());
  const [addedNames, setAddedNames] = useState<Set<string>>(() => new Set());
  const [sessionAdded, setSessionAdded] = useState(0);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef(nextPosition);
  const onDayRef = useRef<Set<string>>(new Set());
  const addingRef = useRef<Set<string>>(new Set());
  const matches = customMode ? [] : searchExercises(query);
  const onDayNames = useMemo(() => {
    const names = new Set(dayExercises.map((ex) => exerciseNameKey(ex.name)));
    for (const added of addedNames) names.add(added);
    return names;
  }, [dayExercises, addedNames]);
  onDayRef.current = onDayNames;

  useEffect(() => {
    positionRef.current = Math.max(positionRef.current, nextPosition);
  }, [nextPosition]);

  useEffect(() => {
    if (!customMode) return;
    nameRef.current?.focus();
  }, [customMode]);

  function isOnDay(entryName: string): boolean {
    return onDayNames.has(exerciseNameKey(entryName));
  }

  async function createExercise(fields: {
    name: string;
    equipment: string;
    repMin: number;
    repMax: number;
  }): Promise<boolean> {
    const trimmed = fields.name.trim();
    if (!trimmed) {
      setError("Name this lift.");
      return false;
    }
    setError("");
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      logSupabaseError("exercises insert skipped: no user", userErr);
      setError(userErr?.message || "You need to be signed in.");
      return false;
    }
    if (!dayId) {
      setError("Pick a training day first.");
      return false;
    }
    const position = positionRef.current;
    positionRef.current = position + 1;
    const payload = {
      user_id: user.id,
      day_id: dayId,
      name: trimmed,
      equipment: toCatalogEquipment(fields.equipment),
      rep_min: fields.repMin,
      rep_max: Math.max(fields.repMin, fields.repMax),
      position,
    };
    console.log("exercises insert payload", payload);
    const { error: insertError } = await supabase.from("exercises").insert(payload);
    if (insertError) {
      logSupabaseError("exercises insert failed", insertError);
      setError(insertError.message);
      return false;
    }
    return true;
  }

  async function addLibraryExercise(entry: LibraryExercise) {
    const key = libraryKey(entry);
    const nameKey = exerciseNameKey(entry.name);
    if (onDayRef.current.has(nameKey) || addingRef.current.has(key)) return;
    addingRef.current.add(key);
    onDayRef.current.add(nameKey);
    setAdding((prev) => new Set(prev).add(key));
    setAddedNames((prev) => new Set(prev).add(nameKey));
    const ok = await createExercise({
      name: entry.name,
      equipment: entry.equipment,
      repMin: entry.repMin,
      repMax: entry.repMax,
    });
    addingRef.current.delete(key);
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (!ok) {
      onDayRef.current.delete(nameKey);
      setAddedNames((prev) => {
        const next = new Set(prev);
        next.delete(nameKey);
        return next;
      });
      return;
    }
    setSessionAdded((n) => n + 1);
    await onAdded();
  }

  function openCustom() {
    setCustomMode(true);
    setError("");
    if (!name.trim() && query.trim()) setName(query.trim());
  }

  function backToSearch() {
    setCustomMode(false);
    setError("");
    setName("");
    setEquipment("other");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const ok = await createExercise({
      name,
      equipment,
      repMin: 8,
      repMax: 12,
    });
    setSaving(false);
    if (ok) onCreated();
  }

  return (
    <section className={`sheet ${sessionAdded > 0 ? "has-done-bar" : ""}`}>
      <div className="sheet-inner">
        <button className="back-btn t-body" type="button" onClick={onClose}>
          Back
        </button>
        <h2 className="t-title">Add exercise</h2>
        {customMode ? (
          <form className="bw-form" onSubmit={onSubmit}>
            <button className="library-back-search t-body" type="button" onClick={backToSearch}>
              Back to search
            </button>
            <label>
              <span className="t-label">Name</span>
              <input
                ref={nameRef}
                className="t-value"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hammer Strength chest press"
                required
              />
            </label>
            <fieldset className="equip-fieldset">
              <legend className="t-label">Equipment</legend>
              {EQUIPMENT.map((label) => {
                const value = label.toLowerCase() as Equipment;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`equip-option t-body ${equipment === value ? "is-on" : ""}`}
                    onClick={() => setEquipment(value)}
                  >
                    {label}
                  </button>
                );
              })}
            </fieldset>
            {error ? <p className="inline-error t-body">{error}</p> : null}
            <button className="primary-btn t-value" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save exercise"}
            </button>
          </form>
        ) : (
          <div className="bw-form">
            <label>
              <span className="t-label">Search</span>
              <input
                className="t-value"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder="Bench, squat, cable…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <p className="library-hint muted t-meta">Search for a lift or add your own.</p>
            {matches.length > 0 ? (
              <ul className="library-list">
                {matches.map((entry) => {
                  const key = libraryKey(entry);
                  const isAdded = isOnDay(entry.name);
                  const isAdding = adding.has(key);
                  return (
                    <li key={key} className="card library-card">
                      <div className="library-card-copy">
                        <p className="library-card-name t-card">{entry.name}</p>
                        <p className="library-card-meta t-meta muted">
                          {entry.equipment} · {entry.repMin}–{entry.repMax} reps
                        </p>
                      </div>
                      {isAdded ? (
                        <span className="library-add-pill is-added t-value">Added ✓</span>
                      ) : (
                        <button
                          type="button"
                          className="library-add-pill t-value"
                          disabled={isAdding}
                          aria-label={`Add ${entry.name}`}
                          onClick={() => addLibraryExercise(entry)}
                        >
                          {isAdding ? "Adding…" : "Add"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {error ? <p className="inline-error t-body">{error}</p> : null}
            <button
              className="add-exercise add-exercise-row library-custom-row t-body"
              type="button"
              onClick={openCustom}
            >
              {"＋ Can't find it? Add custom"}
            </button>
          </div>
        )}
      </div>
      {sessionAdded > 0 ? (
        <div className="library-done-bar">
          <div className="library-done-bar-inner">
            <div className="library-done-copy">
              <p className="library-done-count t-value">
                {sessionAdded} {sessionAdded === 1 ? "exercise" : "exercises"} added
              </p>
              <p className="library-done-day t-meta muted">
                to {toSentenceCase(dayName) || "this day"}
              </p>
            </div>
            <button className="library-done-btn t-value" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
