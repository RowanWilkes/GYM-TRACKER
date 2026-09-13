export type Equipment =
  | "dumbbell"
  | "barbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "other";
export type Rating = "easy" | "just_right" | "hard";

export type DayRow = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  sort_order: number | null;
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
  weight_increment?: number | null;
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
  reps_per_set?: number[] | null;
  target_reps?: number | null;
};

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

function partsFromISO(iso: string): { weekday: string; day: number; month: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return { weekday: WEEKDAYS[date.getDay()], day: d, month: MONTHS[m - 1] };
}

export function formatDate(iso: string): string {
  const { weekday, day, month } = partsFromISO(iso);
  return `${weekday} ${day} ${month}`;
}

export function formatTodayHeader(iso: string): string {
  return `Today · ${formatDate(iso)}`;
}

export function formatLogDate(iso: string): string {
  const { day, month } = partsFromISO(iso);
  return `${day} ${month}`;
}

export function formatLoad(weight: number, reps: number, sets: number): string {
  return `${weight} kg × ${reps} × ${sets}`;
}

export function formatSessionLoad(weightKg: number, repsPerSet: number[]): string {
  const weight = Number(weightKg);
  const reps = repsPerSet.map(Number).filter((n) => Number.isFinite(n));
  if (reps.length === 0) return `${weight}kg`;
  const allEqual = reps.every((n) => n === reps[0]);
  if (allEqual) return `${weight}kg × ${reps[0]} × ${reps.length}`;
  return `${weight}kg × ${reps.join(",")}`;
}

export function toSentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function equipmentLabel(equipment: Equipment): string {
  const key = equipment.toLowerCase();
  if (key === "dumbbell") return "Dumbbell";
  if (key === "barbell") return "Barbell";
  if (key === "machine") return "Machine";
  if (key === "cable") return "Cable";
  if (key === "bodyweight") return "Bodyweight";
  return "Other";
}

export function ratingLabel(rating: Rating): string {
  if (rating === "just_right") return "Just Right";
  if (rating === "easy") return "Easy";
  return "Hard";
}
