import { toSentenceCase } from "../lib/types";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
  }
}

assertEqual(toSentenceCase("Incline Bench Press"), "Incline bench press", "title case becomes sentence case");
assertEqual(toSentenceCase("CHEST & TRIS"), "Chest & tris", "tab labels become sentence case");
assertEqual(toSentenceCase("  bench press"), "Bench press", "trims then capitalizes");
assertEqual(toSentenceCase(""), "", "empty string stays empty");

console.log("All sentenceCase tests passed.");
