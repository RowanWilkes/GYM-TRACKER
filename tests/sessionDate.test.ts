import { formatLogDate, formatTodayHeader } from "../lib/types";
import { lastLogBefore, numbersForTodaySave } from "../lib/sessionSuggestion";
import type { LogRow } from "../lib/types";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

assertEqual(formatTodayHeader("2026-09-07"), "Today · Mon 7 Sept", "header names today and the calendar date");
assertEqual(formatLogDate("2026-09-01"), "1 Sept", "prior log date is day and month");

function log(logged_at: string, weight_kg = 60): LogRow {
  return {
    id: logged_at,
    user_id: "u",
    exercise_id: "ex-1",
    logged_at,
    weight_kg,
    reps: 7,
    sets: 6,
    rating: "just_right",
  };
}

const today = "2026-09-07";
assertEqual(lastLogBefore([], today), null, "no logs means no last time");
assertEqual(
  lastLogBefore([log(today, 80)], today)?.logged_at ?? null,
  null,
  "today's log is not last time"
);
assertEqual(
  lastLogBefore([log(today, 80), log("2026-09-01", 60), log("2026-08-20", 55)], today)?.logged_at,
  "2026-09-01",
  "last time is the latest log strictly before today"
);

assertEqual(
  numbersForTodaySave(
    { weight: "", reps: "", sets: "" },
    { weightKg: 65, reps: 8, sets: 6 },
    { weight_kg: 60, reps: 7, sets: 6 }
  ),
  { weight: 60, reps: 7, sets: 6 },
  "edit mode keeps today's logged numbers when inputs are not retyped"
);
assertEqual(
  numbersForTodaySave({ weight: "", reps: "", sets: "" }, { weightKg: 65, reps: 8, sets: 6 }),
  { weight: 65, reps: 8, sets: 6 },
  "empty inputs log the suggested target"
);
assertEqual(
  numbersForTodaySave({ weight: "70", reps: "6", sets: "5" }, { weightKg: 65, reps: 8, sets: 6 }),
  { weight: 70, reps: 6, sets: 5 },
  "typed values win over the suggestion"
);
assertEqual(
  numbersForTodaySave({ weight: "70", reps: "", sets: "" }, { weightKg: 65, reps: 8, sets: 6 }),
  null,
  "partial inputs are not saved as a mix of typed and suggested"
);
assertEqual(
  numbersForTodaySave({ weight: "", reps: "", sets: "" }, null),
  null,
  "empty inputs with no suggestion cannot save"
);

console.log("All session date tests passed.");
