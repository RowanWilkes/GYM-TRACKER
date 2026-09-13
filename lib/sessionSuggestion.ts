import { suggestNext, type Suggestion } from "@/lib/suggestNext";
import {
  computeSuggestion,
  firstSessionSuggestion,
  prevWasHardFromLogs,
  type NextSuggestion,
} from "@/lib/computeSuggestion";
import type { ExerciseRow, LogRow } from "@/lib/types";

export function orderedLogs(logs: LogRow[]): LogRow[] {
  return [...logs].sort((a, b) => (a.logged_at < b.logged_at ? 1 : a.logged_at > b.logged_at ? -1 : 0));
}

export function lastLogBefore(logs: LogRow[], beforeDate: string): LogRow | null {
  return orderedLogs(logs.filter((log) => log.logged_at < beforeDate))[0] ?? null;
}

export function numbersForTodaySave(
  draft: { weight: string; reps: string; sets: string },
  suggestion: { weightKg: number; reps: number; sets: number } | null,
  todayLog: { weight_kg: number; reps: number; sets: number } | null = null
): { weight: number; reps: number; sets: number } | null {
  const allFilled = draft.weight !== "" && draft.reps !== "" && draft.sets !== "";
  if (allFilled) {
    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    const sets = Number(draft.sets);
    if (![weight, reps, sets].every((n) => Number.isFinite(n) && n > 0)) return null;
    return { weight, reps, sets };
  }
  const anyFilled = draft.weight !== "" || draft.reps !== "" || draft.sets !== "";
  if (anyFilled) return null;
  if (todayLog) {
    return { weight: Number(todayLog.weight_kg), reps: todayLog.reps, sets: todayLog.sets };
  }
  if (suggestion) {
    return { weight: suggestion.weightKg, reps: suggestion.reps, sets: suggestion.sets };
  }
  return null;
}

export function hardStreakFromLogs(logs: LogRow[]): number {
  let streak = 0;
  for (const log of orderedLogs(logs)) {
    if (log.rating === "hard") streak += 1;
    else break;
  }
  return streak;
}

export function incrementForExercise(ex: ExerciseRow): number {
  const n = Number(ex.weight_increment);
  return Number.isFinite(n) && n > 0 ? n : 2.5;
}

export function repsPerSetFromLog(log: LogRow): number[] {
  if (Array.isArray(log.reps_per_set) && log.reps_per_set.length > 0) {
    return log.reps_per_set.map(Number);
  }
  const count = Math.max(1, log.sets || 1);
  return Array.from({ length: count }, () => log.reps);
}

export function todaySuggestion(ex: ExerciseRow, logs: LogRow[], today: string): NextSuggestion {
  const increment = incrementForExercise(ex);
  const prior = logs.filter((log) => log.logged_at < today);
  const last = lastLogBefore(logs, today);
  if (!last) {
    return firstSessionSuggestion({ repMin: ex.rep_min || 8, increment });
  }
  return computeSuggestion(
    {
      weightKg: Number(last.weight_kg),
      repsPerSet: repsPerSetFromLog(last),
      targetReps: last.target_reps ?? last.reps,
      rating: last.rating,
    },
    {
      repMin: ex.rep_min || 8,
      repMax: ex.rep_max || 12,
      increment,
      prevWasHard: prevWasHardFromLogs(prior),
    }
  );
}

export function suggestionForExercise(ex: ExerciseRow, logs: LogRow[]): Suggestion | null {
  const last = orderedLogs(logs)[0];
  if (!last?.rating) return null;

  return suggestNext(
    {
      weightKg: Number(last.weight_kg),
      reps: last.reps,
      sets: last.sets,
      rating: last.rating,
      hardStreak: hardStreakFromLogs(logs),
    },
    { repMin: ex.rep_min || 8, repMax: ex.rep_max || 12 },
    ex.equipment
  );
}
