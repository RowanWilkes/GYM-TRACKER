import { todaySuggestion, repsPerSetFromLog, nextSessionSuggestion, nextSessionDeltaTag } from "../lib/sessionSuggestion";
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

const justRightToday = log({
  logged_at: "2026-09-13",
  reps_per_set: [5, 5, 5, 5],
  target_reps: 5,
});
const justRightNext = nextSessionSuggestion(ex, [justRightToday], "2026-09-13");
assertEqual(justRightNext?.weightKg, 65, "Just Right next session keeps weight");
assertEqual(justRightNext?.targetReps, 6, "Just Right next session adds a rep");
assertEqual(
  nextSessionDeltaTag(
    { weightKg: 65, targetReps: 5, rating: "just_right" },
    justRightNext!,
    2.5
  ),
  "+1 rep",
  "Just Right delta is +1 rep"
);

const easyToday = log({
  logged_at: "2026-09-13",
  rating: "easy",
  reps_per_set: [5, 5, 5, 5],
  target_reps: 5,
});
const easyNext = nextSessionSuggestion(ex, [easyToday], "2026-09-13");
assertEqual(easyNext?.weightKg, 67.5, "Easy next session adds the increment");
assertEqual(
  nextSessionDeltaTag({ weightKg: 65, targetReps: 5, rating: "easy" }, easyNext!, 2.5),
  "+2.5kg",
  "Easy delta is +step kg"
);

const hardToday = log({
  logged_at: "2026-09-13",
  rating: "hard",
  reps_per_set: [5, 5, 5, 5],
  target_reps: 5,
});
const hardNext = nextSessionSuggestion(ex, [hardToday], "2026-09-13");
assertEqual(hardNext?.weightKg, 65, "Single Hard next session holds weight");
assertEqual(
  nextSessionDeltaTag({ weightKg: 65, targetReps: 5, rating: "hard" }, hardNext!, 2.5),
  "hold",
  "Single Hard delta is hold"
);

const deloadNext = nextSessionSuggestion(
  ex,
  [
    log({ logged_at: "2026-09-13", rating: "hard", reps_per_set: [5, 5, 5, 5], target_reps: 5 }),
    log({ logged_at: "2026-09-10", rating: "hard", reps_per_set: [5, 5, 5, 5], target_reps: 5 }),
  ],
  "2026-09-13"
);
assertEqual(deloadNext?.weightKg, 57.5, "Two Hard logs deload next session");
assertEqual(
  nextSessionDeltaTag({ weightKg: 65, targetReps: 5, rating: "hard" }, deloadNext!, 2.5),
  "deload",
  "Second Hard delta is deload"
);

const toppedToday = log({
  logged_at: "2026-09-13",
  rating: "just_right",
  weight_kg: 60,
  reps: 8,
  reps_per_set: [8, 8, 8, 8],
  target_reps: 8,
});
const toppedNext = nextSessionSuggestion(ex, [toppedToday], "2026-09-13");
assertEqual(toppedNext?.weightKg, 62.5, "Topped Just Right next session adds weight");
assertEqual(
  nextSessionDeltaTag({ weightKg: 60, targetReps: 8, rating: "just_right" }, toppedNext!, 2.5),
  "+2.5kg",
  "Topped Just Right delta is +step kg"
);

console.log("All todaySuggestion tests passed.");
