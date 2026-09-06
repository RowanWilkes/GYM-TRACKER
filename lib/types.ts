export type Equipment = "dumbbell" | "barbell" | "other";
export type Rating = "easy" | "just_right" | "hard";

export type DayRow = {
  id: string;
  user_id: string;
  name: string;
  position: number;
};

export type ExerciseRow = {
  id: string;
  user_id: string;
  day_id: string;
  name: string;
  equipment: Equipment;
  rep_min: number;
  rep_max: number;
  position: number;
};

export type LogRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  logged_at: string;
  weight_kg: number;
  reps: number;
  sets: number;
  rating: Rating | null;
};

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatLoad(weight: number, reps: number, sets: number): string {
  return `${weight} kg × ${reps} × ${sets}`;
}

export function equipmentLabel(equipment: Equipment): string {
  if (equipment === "dumbbell") return "Dumbbell";
  if (equipment === "barbell") return "Barbell";
  return "Other";
}

export function ratingLabel(rating: Rating): string {
  if (rating === "just_right") return "Just Right";
  if (rating === "easy") return "Easy";
  return "Hard";
}
