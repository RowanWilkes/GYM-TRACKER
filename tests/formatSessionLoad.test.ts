import { formatSessionLoad } from "../lib/types";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

assertEqual(
  formatSessionLoad(60, [8, 8, 8, 8]),
  "60kg × 8 × 4",
  "uniform reps collapse to weight × reps × setCount"
);
assertEqual(
  formatSessionLoad(60, [8, 8, 8, 6]),
  "60kg × 8,8,8,6",
  "mixed reps list every set"
);
assertEqual(
  formatSessionLoad(65, [5, 5, 5, 4]),
  "65kg × 5,5,5,4",
  "a single dropped set stays expanded"
);
assertEqual(
  formatSessionLoad(12.5, [10, 10, 10]),
  "12.5kg × 10 × 3",
  "fractional weights stay exact when reps are uniform"
);

console.log("All formatSessionLoad tests passed.");
