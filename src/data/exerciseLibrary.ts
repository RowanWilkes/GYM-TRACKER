export type Equipment = 'Barbell' | 'Dumbbell' | 'Machine' | 'Cable' | 'Bodyweight' | 'Other';
export const EQUIPMENT: Equipment[] = ['Barbell','Dumbbell','Machine','Cable','Bodyweight','Other'];

export type LibraryExercise = {
  name: string;
  equipment: Equipment;
  repMin: number;
  repMax: number;
  muscle: string;
  aliases?: string[];
};

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { name: 'Bench Press', equipment: 'Barbell', repMin: 5, repMax: 8, muscle: 'Chest' },
  { name: 'Incline Bench Press', equipment: 'Barbell', repMin: 6, repMax: 10, muscle: 'Chest' },
  { name: 'Dumbbell Bench Press', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Chest' },
  { name: 'Incline Dumbbell Press', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Chest' },
  { name: 'Machine Chest Press', equipment: 'Machine', repMin: 8, repMax: 12, muscle: 'Chest' },
  { name: 'Cable Fly', equipment: 'Cable', repMin: 12, repMax: 15, muscle: 'Chest' },
  { name: 'Dumbbell Fly', equipment: 'Dumbbell', repMin: 12, repMax: 15, muscle: 'Chest' },
  { name: 'Push-up', equipment: 'Bodyweight', repMin: 10, repMax: 20, muscle: 'Chest' },
  { name: 'Dip', equipment: 'Bodyweight', repMin: 8, repMax: 12, muscle: 'Chest' },
  // Back
  { name: 'Deadlift', equipment: 'Barbell', repMin: 3, repMax: 6, muscle: 'Back' },
  { name: 'Barbell Row', equipment: 'Barbell', repMin: 6, repMax: 10, muscle: 'Back' },
  { name: 'Pull-up', equipment: 'Bodyweight', repMin: 6, repMax: 10, muscle: 'Back' },
  { name: 'Chin-up', equipment: 'Bodyweight', repMin: 6, repMax: 10, muscle: 'Back' },
  { name: 'Lat Pulldown', equipment: 'Cable', repMin: 8, repMax: 12, muscle: 'Back', aliases: ['Pulldown'] },
  { name: 'Seated Cable Row', equipment: 'Cable', repMin: 8, repMax: 12, muscle: 'Back' },
  { name: 'Dumbbell Row', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Back' },
  { name: 'T-Bar Row', equipment: 'Barbell', repMin: 8, repMax: 12, muscle: 'Back' },
  { name: 'Face Pull', equipment: 'Cable', repMin: 12, repMax: 20, muscle: 'Back' },
  // Legs
  { name: 'Squat', equipment: 'Barbell', repMin: 5, repMax: 8, muscle: 'Legs' },
  { name: 'Front Squat', equipment: 'Barbell', repMin: 6, repMax: 10, muscle: 'Legs' },
  { name: 'Leg Press', equipment: 'Machine', repMin: 8, repMax: 12, muscle: 'Legs' },
  { name: 'Romanian Deadlift', equipment: 'Barbell', repMin: 6, repMax: 10, muscle: 'Legs', aliases: ['RDL'] },
  { name: 'Bulgarian Split Squat', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Legs', aliases: ['Split Squat'] },
  { name: 'Walking Lunge', equipment: 'Dumbbell', repMin: 10, repMax: 12, muscle: 'Legs' },
  { name: 'Leg Extension', equipment: 'Machine', repMin: 12, repMax: 15, muscle: 'Legs' },
  { name: 'Leg Curl', equipment: 'Machine', repMin: 12, repMax: 15, muscle: 'Legs' },
  { name: 'Hip Thrust', equipment: 'Barbell', repMin: 8, repMax: 12, muscle: 'Legs' },
  { name: 'Calf Raise', equipment: 'Machine', repMin: 12, repMax: 20, muscle: 'Legs' },
  // Shoulders
  { name: 'Overhead Press', equipment: 'Barbell', repMin: 5, repMax: 8, muscle: 'Shoulders', aliases: ['OHP','Military Press'] },
  { name: 'Dumbbell Shoulder Press', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Shoulders' },
  { name: 'Arnold Press', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Shoulders' },
  { name: 'Lateral Raise', equipment: 'Dumbbell', repMin: 12, repMax: 20, muscle: 'Shoulders' },
  { name: 'Rear Delt Fly', equipment: 'Dumbbell', repMin: 12, repMax: 20, muscle: 'Shoulders' },
  { name: 'Shrug', equipment: 'Dumbbell', repMin: 10, repMax: 15, muscle: 'Shoulders' },
  // Arms
  { name: 'Barbell Curl', equipment: 'Barbell', repMin: 8, repMax: 12, muscle: 'Biceps' },
  { name: 'Dumbbell Curl', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Biceps' },
  { name: 'Hammer Curl', equipment: 'Dumbbell', repMin: 8, repMax: 12, muscle: 'Biceps' },
  { name: 'Preacher Curl', equipment: 'Dumbbell', repMin: 10, repMax: 15, muscle: 'Biceps' },
  { name: 'Cable Curl', equipment: 'Cable', repMin: 10, repMax: 15, muscle: 'Biceps' },
  { name: 'Tricep Pushdown', equipment: 'Cable', repMin: 10, repMax: 15, muscle: 'Triceps', aliases: ['Pushdown'] },
  { name: 'Overhead Tricep Extension', equipment: 'Dumbbell', repMin: 10, repMax: 15, muscle: 'Triceps' },
  { name: 'Skullcrusher', equipment: 'Barbell', repMin: 8, repMax: 12, muscle: 'Triceps' },
  { name: 'Close-Grip Bench Press', equipment: 'Barbell', repMin: 6, repMax: 10, muscle: 'Triceps' },
  // Machines (generic movements — specific units go in as custom)
  { name: 'Machine Shoulder Press', equipment: 'Machine', repMin: 8, repMax: 12, muscle: 'Shoulders' },
  { name: 'Machine Row', equipment: 'Machine', repMin: 8, repMax: 12, muscle: 'Back' },
  { name: 'Pec Deck', equipment: 'Machine', repMin: 12, repMax: 15, muscle: 'Chest', aliases: ['Chest Fly Machine'] },
  { name: 'Assisted Pull-up', equipment: 'Machine', repMin: 8, repMax: 12, muscle: 'Back' },
  { name: 'Hack Squat', equipment: 'Machine', repMin: 8, repMax: 12, muscle: 'Legs' },
  { name: 'Smith Machine Squat', equipment: 'Machine', repMin: 6, repMax: 10, muscle: 'Legs' },
  { name: 'Machine Lateral Raise', equipment: 'Machine', repMin: 12, repMax: 20, muscle: 'Shoulders' },
  { name: 'Machine Bicep Curl', equipment: 'Machine', repMin: 10, repMax: 15, muscle: 'Biceps' },
  { name: 'Machine Tricep Extension', equipment: 'Machine', repMin: 10, repMax: 15, muscle: 'Triceps' },
  // Core
  { name: 'Hanging Leg Raise', equipment: 'Bodyweight', repMin: 8, repMax: 15, muscle: 'Core' },
  { name: 'Hanging Knee Raise', equipment: 'Bodyweight', repMin: 10, repMax: 20, muscle: 'Core' },
  { name: 'Cable Crunch', equipment: 'Cable', repMin: 12, repMax: 20, muscle: 'Core' },
  { name: 'Russian Twist', equipment: 'Bodyweight', repMin: 15, repMax: 20, muscle: 'Core' },
];

export function searchExercises(query: string): LibraryExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = EXERCISE_LIBRARY.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.muscle.toLowerCase().includes(q) ||
    (e.aliases ?? []).some(a => a.toLowerCase().includes(q))
  );
  return matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name);
  });
}
