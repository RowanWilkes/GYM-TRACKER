import { suggestNext, type Suggestion } from "@/lib/suggestNext";
import type { ExerciseRow, LogRow } from "@/lib/types";

export function orderedLogs(logs: LogRow[]): LogRow[] {
  return [...logs].sort((a, b) => (a.logged_at < b.logged_at ? 1 : a.logged_at > b.logged_at ? -1 : 0));
}

export function hardStreakFromLogs(logs: LogRow[]): number {
  let streak = 0;
  for (const log of orderedLogs(logs)) {
    if (log.rating === "hard") streak += 1;
    else break;
  }
  return streak;
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
