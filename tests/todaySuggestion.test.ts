import { todaySuggestion, repsPerSetFromLog } from "../lib/sessionSuggestion";
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
  name: "Bench press",
  equipment: "barbell",
  rep_min: 5,
  rep_max: 8,
  position: 0,
  weight_increment: 2.5,
};

function log(partial: Partial<LogRow> & Pick<LogRow, "logged_at">): LogRow {
  return {
    id: partial.logged_at,
    user_id: "u",
    exercise_id: "ex-1",
    weight_kg: 65,
    reps: 5,
    sets: 4,
    rating: "just_right",
    reps_per_set: [5, 5, 5, 5],
    target_reps: 5,
    ...partial,
  };
}

const first = todaySuggestion(ex, [], "2026-09-13");
assertEqual(first.weightKg, 20, "No logs seeds the default working weight");
assertEqual(first.targetReps, 5, "No logs uses rep_min as the target");
assertEqual(first.sets, 4, "No logs defaults to 4 sets");
assertEqual(first.message, "First session — find a working weight.", "No logs uses the first-session message");

const bumped = todaySuggestion(
  ex,
  [log({ logged_at: "2026-09-10", reps_per_set: [5, 5, 5, 5], target_reps: 5 })],
  "2026-09-13"
);
assertEqual(bumped.weightKg, 65, "Uniform target hits hold weight for today");
assertEqual(bumped.targetReps, 6, "Uniform target hits prefill every box with 6");
assertEqual(bumped.sets, 4, "Prefill set count matches last session");

const threeSets = todaySuggestion(
  ex,
  [log({ logged_at: "2026-09-10", reps_per_set: [5, 5, 5], sets: 3, target_reps: 5 })],
  "2026-09-13"
);
assertEqual(threeSets.sets, 3, "After logging 3 sets, the next suggestion still uses 3");

const close = todaySuggestion(
  ex,
  [log({ logged_at: "2026-09-10", reps_per_set: [5, 5, 5, 4], reps: 4, target_reps: 5 })],
  "2026-09-13"
);
assertEqual(close.weightKg, 65, "A dropped last set holds weight");
assertEqual(close.targetReps, 5, "A dropped last set keeps the same target");
assertEqual(
  close.message.startsWith("So close"),
  true,
  "A dropped last set uses the so-close message"
);

assertEqual(
  repsPerSetFromLog(log({ logged_at: "2026-09-10", reps_per_set: null, reps: 8, sets: 3 })),
  [8, 8, 8],
  "Legacy logs without an array expand reps across sets"
);

console.log("All todaySuggestion tests passed.");
