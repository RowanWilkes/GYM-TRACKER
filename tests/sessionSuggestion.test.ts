import { suggestionForExercise, hardStreakFromLogs } from "../lib/sessionSuggestion";
import type { ExerciseRow, LogRow } from "../lib/types";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

const ex: ExerciseRow = {
  id: "ex-1",
  user_id: "u",
  day_id: "d",
  name: "Bench",
  equipment: "dumbbell",
  rep_min: 8,
  rep_max: 12,
  position: 0,
};

function log(partial: Partial<LogRow> & Pick<LogRow, "logged_at" | "rating" | "reps">): LogRow {
  return {
    id: partial.logged_at,
    user_id: "u",
    exercise_id: "ex-1",
    weight_kg: 40,
    sets: 4,
    ...partial,
  };
}

assertEqual(suggestionForExercise(ex, []), null, "No logs means no suggestion");

assertEqual(
  suggestionForExercise(ex, [log({ logged_at: "2026-08-20", rating: "just_right", reps: 10 })]),
  { weightKg: 40, reps: 11, sets: 4, note: "One more rep before you add weight" },
  "Just right below the range top adds a rep"
);

assertEqual(
  suggestionForExercise(ex, [log({ logged_at: "2026-08-20", rating: "easy", reps: 10 })]),
  { weightKg: 42.5, reps: 8, sets: 4, note: "You had room, so add weight" },
  "Easy adds weight and resets reps"
);

const twoHard = [
  log({ logged_at: "2026-08-22", rating: "hard", reps: 8 }),
  log({ logged_at: "2026-08-18", rating: "hard", reps: 8 }),
  log({ logged_at: "2026-08-10", rating: "easy", reps: 12 }),
];
assertEqual(hardStreakFromLogs(twoHard), 2, "Hard streak counts consecutive hard from the latest log");
assertEqual(
  suggestionForExercise(ex, twoHard),
  { weightKg: 35, reps: 8, sets: 4, note: "Second hard session, time to deload" },
  "Two hard sessions deload"
);

const brokenStreak = [
  log({ logged_at: "2026-08-22", rating: "hard", reps: 8 }),
  log({ logged_at: "2026-08-18", rating: "just_right", reps: 10 }),
  log({ logged_at: "2026-08-10", rating: "hard", reps: 8 }),
];
assertEqual(hardStreakFromLogs(brokenStreak), 1, "Hard streak stops at the first non-hard log");

console.log("All sessionSuggestion tests passed.");
