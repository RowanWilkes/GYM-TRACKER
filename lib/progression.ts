export type Difficulty = "Easy" | "JustRight" | "Hard";

export type SuggestionExercise = {
  repRangeLow: number;
  repRangeHigh: number;
  incrementKg: number;
};

export type LastEntry = {
  weight: number;
  reps: number;
  sets: number;
  difficulty?: Difficulty | null;
};

export function roundKg(n: number): number {
  return Math.round(n * 2) / 2;
}

export function getNextSuggestion(
  lastEntry: LastEntry | null | undefined,
  exercise: SuggestionExercise
): { weight: number; reps: number; sets: number } | null {
  if (!lastEntry) return null;

  const weight = Number(lastEntry.weight);
  const reps = Number(lastEntry.reps);
  const sets = Number(lastEntry.sets);
  const difficulty = lastEntry.difficulty;
  const low = Number(exercise.repRangeLow);
  const high = Number(exercise.repRangeHigh);
  const incrementKg = Number(exercise.incrementKg);

  if (!difficulty || difficulty === "Hard") {
    return { weight, reps, sets };
  }

  if (difficulty === "JustRight") {
    if (reps < high) {
      return { weight, reps: reps + 1, sets };
    }
    return { weight: roundKg(weight + incrementKg), reps: low, sets };
  }

  if (difficulty === "Easy") {
    if (reps >= high) {
      return { weight: roundKg(weight + incrementKg), reps: low, sets };
    }
    return { weight, reps: Math.min(reps + 2, high), sets };
  }

  return { weight, reps, sets };
}
