-- Additive only: per-set reps on logs, plus a weight step on exercises.
-- Existing logs.reps / logs.sets / logs.weight_kg / logs.rating are left untouched.

alter table public.logs
  add column if not exists reps_per_set smallint[],
  add column if not exists target_reps smallint;

update public.logs
set
  reps_per_set = array_fill(reps, ARRAY[sets])::smallint[],
  target_reps = reps;

alter table public.exercises
  add column if not exists weight_increment numeric default 2.5;
