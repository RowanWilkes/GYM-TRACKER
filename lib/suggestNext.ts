export type Rating = 'easy' | 'just_right' | 'hard';
export type Equipment = 'dumbbell' | 'barbell' | 'other';

export interface LastSession {
  weightKg: number;
  reps: number;
  sets: number;
  rating: Rating;
  hardStreak: number; // consecutive 'hard' ratings ending with this session (this one counts as 1)
}
export interface RepRange { repMin: number; repMax: number; }
export interface Suggestion { weightKg: number; reps: number; sets: number; note: string; }

function incrementFor(equipment: Equipment): number {
  return equipment === 'barbell' ? 5 : 2.5;
}
function roundToIncrement(value: number, inc: number): number {
  return Math.round(value / inc) * inc;
}

export function suggestNext(last: LastSession, range: RepRange, equipment: Equipment): Suggestion {
  const inc = incrementFor(equipment);
  const { repMin, repMax } = range;
  const w = last.weightKg;

  if (last.rating === 'hard') {
    if (last.hardStreak >= 2) {
      return { weightKg: roundToIncrement(w * 0.9, inc), reps: repMin, sets: last.sets, note: 'Deload — build back up' };
    }
    return { weightKg: w, reps: last.reps, sets: last.sets, note: 'Repeat and nail it' };
  }
  if (last.rating === 'easy') {
    return { weightKg: w + inc, reps: repMin, sets: last.sets, note: 'Weight up — you had room' };
  }
  if (last.reps >= repMax) {
    return { weightKg: w + inc, reps: repMin, sets: last.sets, note: 'Topped the range — weight up' };
  }
  return { weightKg: w, reps: last.reps + 1, sets: last.sets, note: 'Add a rep' };
}
