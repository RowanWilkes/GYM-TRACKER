export type SuggestionRating = "easy" | "just_right" | "hard";

export type LastLogInput = {
  weightKg: number;
  repsPerSet: number[];
  targetReps: number;
  rating: SuggestionRating | null;
};

export type SuggestionCfg = {
  repMin: number;
  repMax: number;
  increment: number;
  prevWasHard: boolean;
};

export type NextSuggestion = {
  weightKg: number;
  targetReps: number;
  sets: number;
  message: string;
};

const DEFAULT_START_WEIGHT_KG = 20;

export function roundToIncrement(weightKg: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) return weightKg;
  return Math.round(weightKg / increment) * increment;
}

export function computeSuggestion(lastLog: LastLogInput, cfg: SuggestionCfg): NextSuggestion {
  const rating = lastLog.rating ?? "just_right";
  const m = Math.min(...lastLog.repsPerSet);
  const sets = lastLog.repsPerSet.length;
  const round = (w: number) => roundToIncrement(w, cfg.increment);

  let weightKg = lastLog.weightKg;
  let targetReps = lastLog.targetReps;
  let message = "";

  if (rating === "hard") {
    if (cfg.prevWasHard) {
      weightKg = lastLog.weightKg * 0.9;
      targetReps = cfg.repMin;
      message = "Two hard sessions — deload and rebuild.";
    } else {
      message = "Tough session — repeat before adding.";
    }
  } else if (rating === "easy") {
    weightKg = lastLog.weightKg + cfg.increment;
    targetReps = cfg.repMin;
    message = "Felt easy — moving up.";
  } else if (m >= cfg.repMax) {
    weightKg = lastLog.weightKg + cfg.increment;
    targetReps = cfg.repMin;
    message = "Topped the range on every set — adding weight.";
  } else if (m >= lastLog.targetReps) {
    targetReps = Math.min(m + 1, cfg.repMax);
    message = "Every set hit target — up a rep.";
  } else {
    const missed = lastLog.repsPerSet.filter((r) => r < lastLog.targetReps).length;
    message =
      lastLog.targetReps - m === 1 && missed === 1
        ? `So close — ${lastLog.targetReps} on ${sets - missed} of ${sets} sets. Same weight, get all ${sets} next time.`
        : "A set fell short — repeat before adding.";
  }

  return {
    weightKg: round(weightKg),
    targetReps,
    sets,
    message,
  };
}

export function firstSessionSuggestion(
  cfg: Pick<SuggestionCfg, "repMin" | "increment">,
  lastKnownWeightKg?: number | null
): NextSuggestion {
  const seed =
    lastKnownWeightKg != null && Number.isFinite(lastKnownWeightKg) && lastKnownWeightKg > 0
      ? lastKnownWeightKg
      : DEFAULT_START_WEIGHT_KG;
  return {
    weightKg: roundToIncrement(seed, cfg.increment),
    targetReps: cfg.repMin,
    sets: 4,
    message: "First session — find a working weight.",
  };
}

export function prevWasHardFromLogs(
  logs: Array<{ logged_at: string; rating: SuggestionRating | null }>
): boolean {
  const ordered = [...logs].sort((a, b) => {
    if (a.logged_at === b.logged_at) return 0;
    return a.logged_at < b.logged_at ? 1 : -1;
  });
  return ordered[1]?.rating === "hard";
}
