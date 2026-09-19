import { repsPerSetFromLog } from "@/lib/sessionSuggestion";
import { formatSessionLoad, toSentenceCase, type ExerciseRow, type LogRow } from "@/lib/types";

export type RecapExercise = {
  id: string;
  name: string;
  loadLabel: string;
  isNewBest: boolean;
};

export type RecapSession = {
  date: string;
  dayName: string;
  loggedCount: number;
  totalCount: number;
  newBestCount: number;
  exercises: RecapExercise[];
};

export function sessionDay(loggedAt: string): string {
  return loggedAt.slice(0, 10);
}

export function lastPriorSessionDate(logs: LogRow[], today: string): string | null {
  let latest: string | null = null;
  for (const log of logs) {
    const day = sessionDay(log.logged_at);
    if (day > today) continue;
    if (!latest || day > latest) latest = day;
  }
  return latest;
}

export function isPersonalBest(sessionLog: LogRow, earlierLogs: LogRow[]): boolean {
  if (earlierLogs.length === 0) return true;
  const best = earlierLogs.reduce((acc, log) => (isBetterLoad(log, acc) ? log : acc));
  return isBetterLoad(sessionLog, best);
}

export function buildLastSessionRecap(
  exercises: ExerciseRow[],
  logs: LogRow[],
  today: string,
  dayName: string
): RecapSession | null {
  const date = lastPriorSessionDate(logs, today);
  if (!date) return null;

  const rows: RecapExercise[] = [];
  let newBestCount = 0;
  for (const ex of exercises) {
    const all = logs.filter((log) => log.exercise_id === ex.id);
    const sessionLog = all.find((log) => sessionDay(log.logged_at) === date);
    if (!sessionLog) continue;
    const earlier = all.filter((log) => sessionDay(log.logged_at) < date);
    const isNewBest = isPersonalBest(sessionLog, earlier);
    if (isNewBest) newBestCount += 1;
    rows.push({
      id: ex.id,
      name: toSentenceCase(ex.name),
      loadLabel: formatSessionLoad(sessionLog.weight_kg, repsPerSetFromLog(sessionLog)),
      isNewBest,
    });
  }

  if (rows.length === 0) return null;

  return {
    date,
    dayName,
    loggedCount: rows.length,
    totalCount: exercises.length,
    newBestCount,
    exercises: rows,
  };
}

function isBetterLoad(candidate: LogRow, baseline: LogRow): boolean {
  const candidateWeight = Number(candidate.weight_kg);
  const baselineWeight = Number(baseline.weight_kg);
  if (candidateWeight !== baselineWeight) return candidateWeight > baselineWeight;
  const candidateReps = repsPerSetFromLog(candidate);
  const baselineReps = repsPerSetFromLog(baseline);
  const candidateMin = Math.min(...candidateReps);
  const baselineMin = Math.min(...baselineReps);
  if (candidateMin !== baselineMin) return candidateMin > baselineMin;
  const candidateSum = candidateReps.reduce((sum, n) => sum + n, 0);
  const baselineSum = baselineReps.reduce((sum, n) => sum + n, 0);
  return candidateSum > baselineSum;
}
