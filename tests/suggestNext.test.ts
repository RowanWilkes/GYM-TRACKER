import { suggestNext, type LastSession, type RepRange } from "../lib/suggestNext";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

const range: RepRange = { repMin: 8, repMax: 12 };

const base: LastSession = {
  weightKg: 40,
  reps: 10,
  sets: 4,
  rating: "just_right",
  hardStreak: 1,
};

assertEqual(
  suggestNext({ ...base, rating: "hard", hardStreak: 1 }, range, "other"),
  { weightKg: 40, reps: 10, sets: 4, note: "Repeat and nail it" },
  "One hard session repeats the same numbers"
);

assertEqual(
  suggestNext({ ...base, rating: "hard", hardStreak: 2 }, range, "other"),
  { weightKg: 35, reps: 8, sets: 4, note: "Deload — build back up" },
  "Two hard sessions deload ~10% to the nearest 2.5"
);

assertEqual(
  suggestNext({ ...base, rating: "hard", hardStreak: 2, weightKg: 80 }, range, "barbell"),
  { weightKg: 70, reps: 8, sets: 4, note: "Deload — build back up" },
  "Barbell deload rounds to 5 kg"
);

assertEqual(
  suggestNext({ ...base, rating: "easy" }, range, "dumbbell"),
  { weightKg: 42.5, reps: 8, sets: 4, note: "Weight up — you had room" },
  "Easy adds a dumbbell increment and resets reps"
);

assertEqual(
  suggestNext({ ...base, rating: "easy" }, range, "barbell"),
  { weightKg: 45, reps: 8, sets: 4, note: "Weight up — you had room" },
  "Easy barbell adds 5 kg"
);

assertEqual(
  suggestNext({ ...base, reps: 12, rating: "just_right" }, range, "other"),
  { weightKg: 42.5, reps: 8, sets: 4, note: "Topped the range — weight up" },
  "Just right at the top of the range adds weight"
);

assertEqual(
  suggestNext({ ...base, reps: 10, rating: "just_right" }, range, "other"),
  { weightKg: 40, reps: 11, sets: 4, note: "Add a rep" },
  "Just right below the top of the range adds a rep"
);

console.log("All suggestNext tests passed.");
