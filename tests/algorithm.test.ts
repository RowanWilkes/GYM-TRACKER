import { getNextSuggestion } from "../lib/progression";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

const ex = { repRangeLow: 6, repRangeHigh: 10, incrementKg: 2.5 };

assertEqual(
  getNextSuggestion({ weight: 45, reps: 10, sets: 4, difficulty: "Hard" }, ex),
  { weight: 45, reps: 10, sets: 4 },
  "Hard repeats the same numbers"
);

assertEqual(
  getNextSuggestion({ weight: 45, reps: 8, sets: 4, difficulty: "JustRight" }, ex),
  { weight: 45, reps: 9, sets: 4 },
  "Just Right below the top of the range adds a rep"
);

assertEqual(
  getNextSuggestion({ weight: 45, reps: 10, sets: 4, difficulty: "JustRight" }, ex),
  { weight: 47.5, reps: 6, sets: 4 },
  "Just Right at the top of the range adds weight and resets reps"
);

assertEqual(
  getNextSuggestion({ weight: 45, reps: 10, sets: 4, difficulty: "Easy" }, ex),
  { weight: 47.5, reps: 6, sets: 4 },
  "Easy at the top of the range adds weight and resets reps"
);

assertEqual(
  getNextSuggestion({ weight: 45, reps: 7, sets: 4, difficulty: "Easy" }, ex),
  { weight: 45, reps: 9, sets: 4 },
  "Easy below the top of the range jumps two reps"
);

assertEqual(
  getNextSuggestion({ weight: 45, reps: 9, sets: 4, difficulty: "Easy" }, ex),
  { weight: 45, reps: 10, sets: 4 },
  "Easy two-rep jump is capped at the top of the range"
);

assertEqual(
  getNextSuggestion({ weight: 45, reps: 10, sets: 4, difficulty: null }, ex),
  { weight: 45, reps: 10, sets: 4 },
  "Imported notes with no rating keep the same target"
);

assertEqual(
  getNextSuggestion({ weight: 22.5, reps: 10, sets: 4, difficulty: "JustRight" }, { ...ex, incrementKg: 5 }),
  { weight: 27.5, reps: 6, sets: 4 },
  "Custom plate increment is used when adding weight"
);

console.log("All suggestion tests passed.");
