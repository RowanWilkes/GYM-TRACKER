import { buildLogPayload } from "../lib/logWrite";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

const mixed = buildLogPayload({
  userId: "user-1",
  exerciseId: "ex-1",
  loggedAt: "2026-09-13",
  weightKg: 65,
  repsPerSet: [5, 5, 5, 4],
  targetReps: 5,
  rating: "just_right",
});

if ("error" in mixed) {
  throw new Error(`mixed session should save, got ${mixed.error}`);
}

assertEqual(mixed.weight_kg, 65, "weight_kg is the pill value");
assertEqual(mixed.reps_per_set, [5, 5, 5, 4], "reps_per_set keeps every box");
assertEqual(mixed.reps, 4, "legacy reps is the weakest set");
assertEqual(mixed.sets, 4, "sets is the box count");
assertEqual(mixed.target_reps, 5, "target_reps is the session target");
assertEqual(mixed.rating, "just_right", "rating matches the tapped button");
assertEqual(mixed.exercise_id, "ex-1", "exercise_id is on the payload for the unique key");
assertEqual(mixed.logged_at, "2026-09-13", "logged_at is on the payload for the unique key");

assertEqual(
  "error" in buildLogPayload({
    userId: "user-1",
    exerciseId: "ex-1",
    loggedAt: "2026-09-13",
    weightKg: 65,
    repsPerSet: [],
    targetReps: 5,
    rating: "easy",
  }),
  true,
  "empty reps_per_set does not write a row"
);

assertEqual(
  "error" in buildLogPayload({
    userId: "user-1",
    exerciseId: "ex-1",
    loggedAt: "2026-09-13",
    weightKg: 0,
    repsPerSet: [5, 5, 5, 4],
    targetReps: 5,
    rating: "easy",
  }),
  true,
  "blank weight does not overwrite an existing log"
);

assertEqual(
  "error" in buildLogPayload({
    userId: "user-1",
    exerciseId: "ex-1",
    loggedAt: "2026-09-13",
    weightKg: 65,
    repsPerSet: [5, "", 5, 4],
    targetReps: 5,
    rating: "easy",
  }),
  true,
  "an empty rep box does not write"
);

console.log("All logWrite tests passed.");
