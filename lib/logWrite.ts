import type { Rating } from "@/lib/types";

export type LogWriteInput = {
  userId: string;
  exerciseId: string;
  loggedAt: string;
  weightKg: number;
  repsPerSet: Array<number | string>;
  targetReps: number;
  rating: Rating;
};

export type LogWritePayload = {
  user_id: string;
  exercise_id: string;
  logged_at: string;
  weight_kg: number;
  reps_per_set: number[];
  target_reps: number;
  sets: number;
  reps: number;
  rating: Rating;
};

const RATINGS: Rating[] = ["easy", "just_right", "hard"];

export function buildLogPayload(input: LogWriteInput): LogWritePayload | { error: string } {
  const weightKg = Number(input.weightKg);
  const repsPerSet = input.repsPerSet.map((value) => Math.round(Number(value)));
  const targetReps = Math.round(Number(input.targetReps));

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { error: "Enter what you lifted first" };
  }
  if (repsPerSet.length < 1 || repsPerSet.some((n) => !Number.isFinite(n) || n <= 0)) {
    return { error: "Enter what you lifted first" };
  }
  if (!Number.isFinite(targetReps) || targetReps <= 0) {
    return { error: "Enter what you lifted first" };
  }
  if (!RATINGS.includes(input.rating)) {
    return { error: "Pick how the set felt" };
  }

  return {
    user_id: input.userId,
    exercise_id: input.exerciseId,
    logged_at: input.loggedAt,
    weight_kg: weightKg,
    reps_per_set: repsPerSet,
    target_reps: targetReps,
    sets: repsPerSet.length,
    reps: Math.min(...repsPerSet),
    rating: input.rating,
  };
}
