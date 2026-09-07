"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  type DayRow,
  type Equipment,
  type ExerciseRow,
  type LogRow,
  type Rating,
  equipmentLabel,
  formatDate,
  formatLoad,
  todayISO,
} from "@/lib/types";
import { orderedLogs, suggestionForExercise } from "@/lib/sessionSuggestion";

type Draft = { weight: string; reps: string; sets: string; error: string };

export function TrackerApp() {
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

  const loadDays = useCallback(async (uid: string) => {
    const { data, error: daysError } = await supabase
      .from("days")
      .select("id, user_id, name, position")
      .eq("user_id", uid)
      .order("position", { ascending: true });
    if (daysError) throw daysError;
    return (data ?? []) as DayRow[];
  }, []);

  const loadExercisesAndLogs = useCallback(async (uid: string, selected: string) => {
    const { data: exerciseRows, error: exError } = await supabase
      .from("exercises")
      .select("id, user_id, day_id, name, equipment, rep_min, rep_max, position")
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
      .select("id, user_id, exercise_id, logged_at, weight_kg, reps, sets, rating")
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
      [id]: { ...{ weight: "", reps: "", sets: "", error: "" }, ...(prev[id] ?? {}), ...patch },
    }));
  }

  async function saveSet(exerciseId: string, rating: Rating) {
    const draft = drafts[exerciseId] ?? { weight: "", reps: "", sets: "", error: "" };
    if (draft.weight === "" || draft.reps === "" || draft.sets === "") {
      updateDraft(exerciseId, { error: "Enter what you lifted first" });
      return;
    }
    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    const sets = Number(draft.sets);
    if (![weight, reps, sets].every((n) => Number.isFinite(n) && n > 0)) {
      updateDraft(exerciseId, { error: "Enter what you lifted first" });
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(userError ?? "No user");
      updateDraft(exerciseId, { error: "Couldn't save" });
      return;
    }

    const loggedAt = todayISO();
    const payload = {
      user_id: user.id,
      exercise_id: exerciseId,
      logged_at: loggedAt,
      weight_kg: weight,
      reps,
      sets,
      rating,
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
      updateDraft(exerciseId, { error: "Couldn't save" });
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
    return (
      <div className="tracker-root">
        <p className="progress-note">Loading your lifts…</p>
      </div>
    );
  }

  return (
    <div className="tracker-root">
      <header className="topbar">
        <div>
          <p className="eyebrow">{formatDate(today)}</p>
          <h1>Progressive Overload Tracker</h1>
        </div>
        <button
          type="button"
          className="sign-out-chip"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Sign out
        </button>
      </header>

      {error ? <p className="inline-error">{error}</p> : null}

      {days.length ? (
        <nav className="tabs" role="tablist" aria-label="Training days">
          {days.map((day) => (
            <button
              key={day.id}
              className={`tab ${day.id === dayId ? "is-active" : ""}`}
              type="button"
              onClick={() => selectDay(day.id)}
            >
              {day.name}
            </button>
          ))}
        </nav>
      ) : (
        <p className="progress-note">No training days yet. Finish onboarding to add a split.</p>
      )}

      {selectedDay ? (
        <main className="screen is-visible">
          {exercises.length === 0 ? (
            <EmptyExercises onAdd={() => setShowAdd(true)} />
          ) : (
            <>
              <p className="progress-note">
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
                  draft={drafts[ex.id]}
                  onDraft={(patch) => updateDraft(ex.id, patch)}
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
          userId={userId}
          dayId={dayId}
          nextPosition={exercises.length}
          onClose={() => setShowAdd(false)}
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
    <button className={`add-exercise add-exercise-${variant}`} type="button" onClick={onClick}>
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
      <h2>No exercises yet</h2>
      <p className="muted">Add the lifts you do on this day</p>
      <AddExerciseButton variant="empty" onClick={onAdd} />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="delete-exercise-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5.5 2.75h5M3.25 4.5h9.5M6.25 6.5v5M9.75 6.5v5M4.75 4.5l.5 8.1a1.25 1.25 0 0 0 1.25 1.15h3a1.25 1.25 0 0 0 1.25-1.15l.5-8.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function ExerciseCard({
  ex,
  logs,
  today,
  draft,
  onDraft,
  onSave,
  onDelete,
}: {
  ex: ExerciseRow;
  logs: LogRow[];
  today: string;
  draft?: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  onSave: (id: string, rating: Rating) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const todayLog = logs.find((l) => l.logged_at === today) ?? null;
  const last = orderedLogs(logs)[0] ?? null;
  const firstSession = !last;
  const logged = Boolean(todayLog);
  const suggestion = suggestionForExercise(ex, logs);

  const weightVal = draft?.weight ?? (logged ? String(todayLog?.weight_kg) : "");
  const repsVal = draft?.reps ?? (logged ? String(todayLog?.reps) : "");
  const setsVal = draft?.sets ?? (logged ? String(todayLog?.sets) : "");

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = window.setTimeout(() => setConfirmDelete(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmDelete]);

  return (
    <article className={`card ${logged ? "is-logged" : ""}`}>
      <div className="card-head">
        <div>
          <p className="ex-name">{ex.name}</p>
          <p className="equip-label">{equipmentLabel(ex.equipment)}</p>
        </div>
        <div className="card-head-actions">
          {logged ? (
            <span className="logged-badge" aria-label="Logged">
              ✓
            </span>
          ) : null}
          <button
            className={`delete-exercise ${confirmDelete ? "is-confirm" : ""}`}
            type="button"
            aria-label={confirmDelete ? `Confirm delete ${ex.name}` : `Delete ${ex.name}`}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              onDelete(ex.id);
            }}
          >
            {confirmDelete ? "Delete" : <TrashIcon />}
          </button>
        </div>
      </div>
      <div className="ref">
        <div className="ref-row">
          <span className="label">Last time</span>
          <span className="value ghost">
            {firstSession ? "first time in" : formatLoad(last.weight_kg, last.reps, last.sets)}
          </span>
        </div>
        {suggestion ? (
          <>
            <div className="ref-row">
              <span className="label">Suggested today</span>
              <span className="value suggest">
                {formatLoad(suggestion.weightKg, suggestion.reps, suggestion.sets)}
              </span>
            </div>
            <p className="hint">{suggestion.note}</p>
          </>
        ) : (
          <p className="hint">No suggestion yet — just record today.</p>
        )}
      </div>
      <div className="inputs">
        <label className="field">
          <span>kg</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={weightVal}
            onChange={(e) => onDraft({ weight: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Reps</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            value={repsVal}
            onChange={(e) => onDraft({ reps: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Sets</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            value={setsVal}
            onChange={(e) => onDraft({ sets: e.target.value })}
          />
        </label>
      </div>
      <p className="inline-error">{draft?.error || ""}</p>
      <div className="diff-row">
        <button
          className={`diff-btn easy ${todayLog?.rating === "easy" ? "is-selected" : ""}`}
          type="button"
          onClick={() => onSave(ex.id, "easy")}
        >
          Easy
        </button>
        <button
          className={`diff-btn ok ${todayLog?.rating === "just_right" ? "is-selected" : ""}`}
          type="button"
          onClick={() => onSave(ex.id, "just_right")}
        >
          Just Right
        </button>
        <button
          className={`diff-btn hard ${todayLog?.rating === "hard" ? "is-selected" : ""}`}
          type="button"
          onClick={() => onSave(ex.id, "hard")}
        >
          Hard
        </button>
      </div>
    </article>
  );
}

function AddExerciseSheet({
  userId,
  dayId,
  nextPosition,
  onClose,
  onCreated,
}: {
  userId: string;
  dayId: string;
  nextPosition: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("other");
  const [repMin, setRepMin] = useState("8");
  const [repMax, setRepMax] = useState("12");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name this lift.");
      return;
    }
    const min = Number(repMin) || 8;
    const max = Number(repMax) || 12;
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("exercises").insert({
      user_id: userId,
      day_id: dayId,
      name: trimmed,
      equipment,
      rep_min: min,
      rep_max: Math.max(min, max),
      position: nextPosition,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated();
  }

  return (
    <section className="sheet">
      <div className="sheet-inner">
        <button className="back-btn" type="button" onClick={onClose}>
          Back
        </button>
        <h2>Add exercise</h2>
        <p className="muted">This lift will show on this day’s list.</p>
        <form className="bw-form" onSubmit={onSubmit}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
              required
            />
          </label>
          <fieldset className="equip-fieldset">
            <legend>Equipment</legend>
            {(["dumbbell", "barbell", "other"] as Equipment[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`equip-option ${equipment === value ? "is-on" : ""}`}
                onClick={() => setEquipment(value)}
              >
                {equipmentLabel(value)}
              </button>
            ))}
          </fieldset>
          <div className="settings">
            <label>
              Rep min
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={repMin}
                onChange={(e) => setRepMin(e.target.value)}
              />
            </label>
            <label>
              Rep max
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={repMax}
                onChange={(e) => setRepMax(e.target.value)}
              />
            </label>
          </div>
          {error ? <p className="inline-error">{error}</p> : null}
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save exercise"}
          </button>
        </form>
      </div>
    </section>
  );
}
