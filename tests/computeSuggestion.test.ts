import {
  computeSuggestion,
  firstSessionSuggestion,
  prevWasHardFromLogs,
  type LastLogInput,
  type SuggestionCfg,
} from "../lib/computeSuggestion";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${label}\n  expected ${e}\n  got      ${a}`);
  }
}

const cfg: SuggestionCfg = {
  repMin: 5,
  repMax: 8,
  increment: 2.5,
  prevWasHard: false,
};

function last(partial: Partial<LastLogInput> & Pick<LastLogInput, "repsPerSet">): LastLogInput {
  return {
    weightKg: 65,
    targetReps: 5,
    rating: "just_right",
    ...partial,
  };
}

const hitTarget = computeSuggestion(last({ repsPerSet: [5, 5, 5, 5] }), cfg);
assertEqual(hitTarget.weightKg, 65, "Uniform 5s hold weight");
assertEqual(hitTarget.targetReps, 6, "Uniform 5s bump target to 6");
assertEqual(hitTarget.sets, 4, "Set count matches repsPerSet length");
assertEqual(hitTarget.message, "Every set hit target — up a rep.", "Uniform 5s message");

const soClose = computeSuggestion(last({ repsPerSet: [5, 5, 5, 4] }), cfg);
assertEqual(soClose.weightKg, 65, "One rep short holds weight");
assertEqual(soClose.targetReps, 5, "One rep short keeps target");
assertEqual(
  soClose.message,
  "So close — 5 on 3 of 4 sets. Same weight, get all 4 next time.",
  "One-rep short on a single set uses the so-close copy"
);

const topped = computeSuggestion(
  last({ weightKg: 60, repsPerSet: [12, 12, 12], targetReps: 12 }),
  { ...cfg, repMin: 8, repMax: 12 }
);
assertEqual(topped.weightKg, 62.5, "Topping rep_max adds increment");
assertEqual(topped.targetReps, 8, "Topping rep_max resets target to rep_min");
assertEqual(topped.message, "Topped the range on every set — adding weight.", "Top of range message");

const deload = computeSuggestion(last({ rating: "hard", repsPerSet: [5, 5, 5, 5] }), {
  ...cfg,
  prevWasHard: true,
});
assertEqual(deload.weightKg, 57.5, "Two hards deload 65 * 0.9 rounded to 2.5");
assertEqual(deload.targetReps, 5, "Deload resets target to rep_min");
assertEqual(deload.message, "Two hard sessions — deload and rebuild.", "Deload message");

const nullRating = computeSuggestion(last({ rating: null, repsPerSet: [5, 5, 5, 5] }), cfg);
assertEqual(nullRating.weightKg, 65, "Null rating holds weight like just_right");
assertEqual(nullRating.targetReps, 6, "Null rating bumps target like just_right");
assertEqual(nullRating.message, "Every set hit target — up a rep.", "Null rating uses just_right path");

const hardOnce = computeSuggestion(last({ rating: "hard", repsPerSet: [5, 5, 4, 4] }), cfg);
assertEqual(hardOnce.weightKg, 65, "Single hard session holds weight");
assertEqual(hardOnce.targetReps, 5, "Single hard session keeps target");
assertEqual(hardOnce.message, "Tough session — repeat before adding.", "Single hard message");

const easy = computeSuggestion(last({ rating: "easy", repsPerSet: [5, 5, 5, 5] }), cfg);
assertEqual(easy.weightKg, 67.5, "Easy adds increment");
assertEqual(easy.targetReps, 5, "Easy resets target to rep_min");
assertEqual(easy.message, "Felt easy — moving up.", "Easy message");

const shortAverageWouldHide = computeSuggestion(last({ repsPerSet: [8, 8, 8, 4], targetReps: 8 }), {
  ...cfg,
  repMax: 8,
});
assertEqual(shortAverageWouldHide.weightKg, 65, "A single weak set holds weight even if others topped");
assertEqual(shortAverageWouldHide.targetReps, 8, "A single weak set does not raise target");
assertEqual(
  shortAverageWouldHide.message,
  "A set fell short — repeat before adding.",
  "More than one rep short uses the generic hold message"
);

assertEqual(
  prevWasHardFromLogs([
    { logged_at: "2026-09-13", rating: "hard" },
    { logged_at: "2026-09-10", rating: "hard" },
  ]),
  true,
  "Previous session hard means prevWasHard"
);
assertEqual(
  prevWasHardFromLogs([
    { logged_at: "2026-09-13", rating: "hard" },
    { logged_at: "2026-09-10", rating: "just_right" },
  ]),
  false,
  "Previous just_right is not prevWasHard"
);
assertEqual(
  prevWasHardFromLogs([
    { logged_at: "2026-09-13", rating: "hard" },
    { logged_at: "2026-09-10", rating: null },
  ]),
  false,
  "Null previous rating is not hard"
);

const first = firstSessionSuggestion({ repMin: 8, increment: 2.5 });
assertEqual(first.weightKg, 20, "First session uses a sane default weight");
assertEqual(first.targetReps, 8, "First session target is rep_min");
assertEqual(first.message, "First session — find a working weight.", "First session message");

const seeded = firstSessionSuggestion({ repMin: 8, increment: 2.5 }, 61);
assertEqual(seeded.weightKg, 60, "First session rounds last known weight to increment");
assertEqual(seeded.targetReps, 8, "Seeded first session still uses rep_min");

console.log("All computeSuggestion tests passed.");
