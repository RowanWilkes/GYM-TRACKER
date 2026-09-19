"use client";

import { useEffect, useState } from "react";
import {
  type ExerciseRow,
  type LogRow,
  type Rating,
  equipmentLabel,
  formatLoad,
  formatLogDate,
  formatSessionLoad,
  ratingLabel,
  toSentenceCase,
} from "@/lib/types";
import { roundToIncrement } from "@/lib/computeSuggestion";
import {
  incrementForExercise,
  lastLogBefore,
  nextSessionDeltaTag,
  nextSessionSuggestion,
  repsPerSetFromLog,
  todaySuggestion,
} from "@/lib/sessionSuggestion";

const MIN_SETS = 1;
const MAX_SETS = 8;

export type ExerciseSession = {
  weightKg: number;
  repsPerSet: number[];
  targetReps: number;
};

type ExerciseCardProps = {
  ex: ExerciseRow;
  logs: LogRow[];
  today: string;
  error?: string;
  onSave: (id: string, rating: Rating, session: ExerciseSession) => void;
  onDelete: (id: string) => void;
};

export function ExerciseCard({ ex, logs, today, error, onSave, onDelete }: ExerciseCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const todayLog = logs.find((l) => l.logged_at === today) ?? null;
  const last = lastLogBefore(logs, today);
  const firstSession = !last;
  const logged = Boolean(todayLog);
  const isLoggedToday = Boolean(todayLog?.rating);
  const collapsed = isLoggedToday && !editing;
  const suggestion = todaySuggestion(ex, logs, today);
  const increment = incrementForExercise(ex);
  const targetReps = todayLog?.target_reps ?? suggestion.targetReps;
  const nextSession = nextSessionSuggestion(ex, logs, today);

  const seededWeight = todayLog ? String(Number(todayLog.weight_kg)) : String(suggestion.weightKg);
  const seededReps = todayLog
    ? repsPerSetFromLog(todayLog).map(String)
    : Array.from({ length: Math.max(MIN_SETS, suggestion.sets) }, () => String(suggestion.targetReps));

  const [weight, setWeight] = useState(seededWeight);
  const [repsPerSet, setRepsPerSet] = useState(seededReps);

  useEffect(() => {
    setWeight(seededWeight);
    setRepsPerSet(seededReps);
  }, [ex.id, today, seededWeight, seededReps.join(",")]);

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
  }, [ex.id, today]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = window.setTimeout(() => setConfirmDelete(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmDelete]);

  function stepWeight(direction: 1 | -1) {
    const current = Number(weight);
    const base = Number.isFinite(current) ? current : suggestion.weightKg;
    setWeight(String(roundToIncrement(base + direction * increment, increment)));
  }

  function setRepCount(nextCount: number) {
    const count = Math.min(MAX_SETS, Math.max(MIN_SETS, nextCount));
    setRepsPerSet((prev) => {
      if (count === prev.length) return prev;
      if (count < prev.length) return prev.slice(0, count);
      return [...prev, ...Array.from({ length: count - prev.length }, () => String(targetReps))];
    });
  }

  function save(rating: Rating) {
    const weightKg = Number(weight);
    const reps = repsPerSet.map((value) => Number(value));
    setEditing(false);
    onSave(ex.id, rating, { weightKg, repsPerSet: reps, targetReps });
  }

  if (collapsed && todayLog && nextSession) {
    const rating = todayLog.rating as Rating;
    const pillClass = rating === "just_right" ? "ok" : rating;
    const didToday = formatSessionLoad(todayLog.weight_kg, repsPerSetFromLog(todayLog));
    const nextLoad = formatSessionLoad(
      nextSession.weightKg,
      Array.from({ length: nextSession.sets }, () => nextSession.targetReps)
    );
    const delta = nextSessionDeltaTag(
      {
        weightKg: Number(todayLog.weight_kg),
        targetReps: todayLog.target_reps ?? todayLog.reps,
        rating,
      },
      nextSession,
      increment
    );

    return (
      <article className="card is-logged">
        <div className="logged-head">
          <div className="logged-title">
            <span className="logged-badge" aria-label="Logged">
              ✓
            </span>
            <p className="ex-name t-card">{toSentenceCase(ex.name)}</p>
          </div>
          <div className="logged-head-actions">
            <span className={`rating-pill ${pillClass} t-label`}>{ratingLabel(rating)}</span>
            <button
              className="edit-log"
              type="button"
              aria-label={`Edit ${ex.name}`}
              onClick={() => setEditing(true)}
            >
              <PencilIcon />
            </button>
          </div>
        </div>
        <div className="ref-row">
          <span className="label t-meta">You did today</span>
          <span className="value t-value">{didToday}</span>
        </div>
        <div className="ref-row logged-next">
          <span className="logged-next-label t-meta">
            <NextSessionArrow />
            Next session
          </span>
          <span className="value suggest t-value">
            <span className="delta-tag t-meta">{delta}</span>
            {nextLoad}
          </span>
        </div>
        {error ? <p className="inline-error t-body">{error}</p> : null}
      </article>
    );
  }

  return (
    <article className={`card ${logged ? "is-logged" : ""}`}>
      <div className="card-head">
        <div>
          <p className="ex-name t-card">{toSentenceCase(ex.name)}</p>
          <p className="equip-label t-label">{equipmentLabel(ex.equipment)}</p>
        </div>
        <div className="card-head-actions">
          {logged ? (
            <span className="logged-badge" aria-label="Logged">
              ✓
            </span>
          ) : null}
          <button
            className={`delete-exercise ${confirmDelete ? "is-confirm t-label" : ""}`}
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
          <span className="label t-body">
            {firstSession ? "Last time" : `Last time · ${formatLogDate(last.logged_at)}`}
          </span>
          <span className={`value ghost ${firstSession ? "t-meta" : "t-value"}`}>
            {firstSession ? "first time in" : formatSessionLoad(last.weight_kg, repsPerSetFromLog(last))}
          </span>
        </div>
        <div className="ref-row">
          <span className="label t-body">Suggested today</span>
          <span className="value suggest t-value">
            {formatLoad(suggestion.weightKg, suggestion.targetReps, suggestion.sets)}
          </span>
        </div>
        <p className="hint t-meta">{suggestion.message}</p>
      </div>

      <div className="editor-row">
        <div className="stepper-pill">
          <button type="button" aria-label="Decrease weight" onClick={() => stepWeight(-1)}>
            −
          </button>
          <label className="stepper-value">
            <input
              className="t-value"
              type="number"
              inputMode="decimal"
              step={increment}
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <span className="t-meta">kg</span>
          </label>
          <button type="button" aria-label="Increase weight" onClick={() => stepWeight(1)}>
            +
          </button>
        </div>
        <div className="stepper-pill">
          <button
            type="button"
            aria-label="Fewer sets"
            onClick={() => setRepCount(repsPerSet.length - 1)}
          >
            −
          </button>
          <span className="stepper-count t-value">
            {repsPerSet.length}
            <span className="t-meta">{repsPerSet.length === 1 ? "set" : "sets"}</span>
          </span>
          <button
            type="button"
            aria-label="More sets"
            onClick={() => setRepCount(repsPerSet.length + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="rep-section">
        <span className="t-label">Reps per set</span>
        <div className="rep-boxes">
          {repsPerSet.map((value, index) => {
            const offTarget = Number(value) !== Number(targetReps);
            return (
              <input
                key={`${ex.id}-set-${index}`}
                className={`rep-box t-value ${offTarget ? "is-off-target" : ""}`}
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                aria-label={`Set ${index + 1} reps`}
                value={value}
                onChange={(e) => {
                  const next = [...repsPerSet];
                  next[index] = e.target.value;
                  setRepsPerSet(next);
                }}
              />
            );
          })}
        </div>
      </div>

      <p className="inline-error t-body">{error || ""}</p>
      <div className="diff-row">
        <button
          className={`diff-btn easy t-value ${todayLog?.rating === "easy" ? "is-selected" : ""}`}
          type="button"
          onClick={() => save("easy")}
        >
          Easy
        </button>
        <button
          className={`diff-btn ok t-value ${todayLog?.rating === "just_right" ? "is-selected" : ""}`}
          type="button"
          onClick={() => save("just_right")}
        >
          Just Right
        </button>
        <button
          className={`diff-btn hard t-value ${todayLog?.rating === "hard" ? "is-selected" : ""}`}
          type="button"
          onClick={() => save("hard")}
        >
          Hard
        </button>
      </div>
    </article>
  );
}

function PencilIcon() {
  return (
    <svg className="edit-log-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NextSessionArrow() {
  return (
    <svg className="logged-next-arrow" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        d="M5 11L11 5M7 5h4v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
