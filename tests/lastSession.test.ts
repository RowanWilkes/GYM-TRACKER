import { buildLastSessionRecap, isPersonalBest, lastPriorSessionDate } from "../lib/lastSession";
import type { ExerciseRow, LogRow } from "../lib/types";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

function ex(partial: Partial<ExerciseRow> & Pick<ExerciseRow, "id" | "name">): ExerciseRow {
  return {
    user_id: "u",
    day_id: "d",
    equipment: "other",
    rep_min: 8,
    rep_max: 12,
    position: 0,
    ...partial,
  };
}

function log(partial: Partial<LogRow> & Pick<LogRow, "exercise_id" | "logged_at">): LogRow {
  return {
    id: `${partial.exercise_id}-${partial.logged_at}`,
    user_id: "u",
    weight_kg: 60,
    reps: 8,
    sets: 4,
    rating: "just_right",
    reps_per_set: [8, 8, 8, 8],
    target_reps: 8,
    ...partial,
  };
}

assertEqual(lastPriorSessionDate([], "2026-09-19"), null, "No logs means no last session");
assertEqual(
  lastPriorSessionDate([log({ exercise_id: "a", logged_at: "2026-09-19" })], "2026-09-19"),
  "2026-09-19",
  "A session logged today still counts as the last session"
);
assertEqual(
  lastPriorSessionDate(
    [
      log({ exercise_id: "a", logged_at: "2026-09-19" }),
      log({ exercise_id: "a", logged_at: "2026-09-12" }),
      log({ exercise_id: "b", logged_at: "2026-09-05" }),
    ],
    "2026-09-19"
  ),
  "2026-09-19",
  "Last session is the most recent date on or before today"
);

const first = log({ exercise_id: "a", logged_at: "2026-09-01", weight_kg: 50 });
assertEqual(isPersonalBest(first, []), true, "First log is a personal best");
assertEqual(
  isPersonalBest(log({ exercise_id: "a", logged_at: "2026-09-12", weight_kg: 55 }), [first]),
  true,
  "Heavier weight is a personal best"
);
assertEqual(
  isPersonalBest(log({ exercise_id: "a", logged_at: "2026-09-12", weight_kg: 50, reps: 9, reps_per_set: [9, 9, 9, 9] }), [
    first,
  ]),
  true,
  "Same weight with higher reps is a personal best"
);
assertEqual(
  isPersonalBest(log({ exercise_id: "a", logged_at: "2026-09-12", weight_kg: 50, reps: 8, reps_per_set: [8, 8, 8, 8] }), [
    first,
  ]),
  false,
  "Matching an earlier load is not a personal best"
);

const row = ex({ id: "a", name: "bench press", position: 0 });
const curl = ex({ id: "b", name: "curl", position: 1 });
const pulldown = ex({ id: "c", name: "lat pulldown", position: 2 });
const recap = buildLastSessionRecap(
  [row, curl],
  [
    log({ exercise_id: "a", logged_at: "2026-09-12", weight_kg: 22.5, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({ exercise_id: "a", logged_at: "2026-09-01", weight_kg: 20, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({
      exercise_id: "b",
      logged_at: "2026-09-12",
      weight_kg: 30,
      reps: 8,
      reps_per_set: [8, 9, 9, 9],
    }),
    log({ exercise_id: "b", logged_at: "2026-09-01", weight_kg: 30, reps: 9, reps_per_set: [9, 9, 9, 9] }),
  ],
  "2026-09-19",
  "back & bis"
);

assertEqual(recap?.date, "2026-09-12", "Recap uses the last date with logs");
assertEqual(recap?.dayName, "back & bis", "Recap keeps the selected day name");
assertEqual(recap?.loggedCount, 2, "Logged count is exercises with a log that session");
assertEqual(recap?.totalCount, 2, "Total count is the current day roster");
assertEqual(recap?.newBestCount, 1, "Only the heavier bench is a new best");
assertEqual(recap?.exercises[0]?.loadLabel, "22.5kg × 8 × 4", "Uniform session load matches the cards");
assertEqual(recap?.exercises[1]?.loadLabel, "30kg × 8,9,9,9", "Mixed session load matches the cards");
assertEqual(recap?.exercises[0]?.isNewBest, true, "Heavier bench is flagged as a best");
assertEqual(recap?.exercises[1]?.isNewBest, false, "Curl with a dropped set is not a best");

const fullSession = buildLastSessionRecap(
  [row, curl, pulldown],
  [
    log({ exercise_id: "a", logged_at: "2026-09-19", weight_kg: 22.5, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({ exercise_id: "a", logged_at: "2026-09-12", weight_kg: 20, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({
      exercise_id: "b",
      logged_at: "2026-09-19",
      weight_kg: 30,
      reps: 8,
      reps_per_set: [8, 9, 9, 9],
    }),
    log({ exercise_id: "b", logged_at: "2026-09-12", weight_kg: 30, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({ exercise_id: "c", logged_at: "2026-09-19", weight_kg: 35, reps: 8, reps_per_set: [8, 8, 8, 8] }),
  ],
  "2026-09-19",
  "back & bis"
);
assertEqual(fullSession?.date, "2026-09-19", "A finished today session is the last session");
assertEqual(fullSession?.loggedCount, 3, "Every lift logged that session is listed");
assertEqual(fullSession?.exercises.map((item) => item.name), ["Bench press", "Curl", "Lat pulldown"], "Non-PB lifts stay in the recap");
assertEqual(fullSession?.exercises.map((item) => item.isNewBest), [true, true, true], "First-or-better loads can all be bests");
assertEqual(fullSession?.exercises[1]?.loadLabel, "30kg × 8,9,9,9", "Today's mixed curl is the recap row, not an older uniform set");

const threeOnPrior = buildLastSessionRecap(
  [row, curl, pulldown],
  [
    log({ exercise_id: "a", logged_at: "2026-09-12", weight_kg: 55, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({ exercise_id: "a", logged_at: "2026-09-01", weight_kg: 50, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({ exercise_id: "b", logged_at: "2026-09-12", weight_kg: 30, reps: 8, reps_per_set: [8, 8, 8, 8] }),
    log({ exercise_id: "b", logged_at: "2026-09-01", weight_kg: 30, reps: 9, reps_per_set: [9, 9, 9, 9] }),
    log({ exercise_id: "c", logged_at: "2026-09-12", weight_kg: 35, reps: 8, reps_per_set: [8, 8, 8, 8] }),
  ],
  "2026-09-19",
  "back & bis"
);
assertEqual(threeOnPrior?.loggedCount, 3, "A three-lift session lists all three, not only the PBs");
assertEqual(
  threeOnPrior?.exercises.map((item) => item.name),
  ["Bench press", "Curl", "Lat pulldown"],
  "Non-PB curl stays in the recap next to the bests"
);
assertEqual(threeOnPrior?.newBestCount, 2, "New-best count is independent of which rows are listed");
assertEqual(threeOnPrior?.exercises[1]?.isNewBest, false, "The non-PB lift is still shown");

assertEqual(
  buildLastSessionRecap([row], [], "2026-09-19", "Push"),
  null,
  "No recap when the day has no session"
);

console.log("All lastSession tests passed.");
