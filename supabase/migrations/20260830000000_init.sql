-- Progressive Overload Tracker — initial schema
-- Paste into the Supabase SQL editor, or apply with the CLI:
--   supabase db push
--
-- Hardening vs the original draft:
-- - trigger function locks search_path (security definer requirement)
-- - indexes on every foreign key
-- - one log per exercise per day (matches "one entry per visit")
-- - policies are idempotent so this file can be re-run

-- Profiles (one row per user, created automatically on signup)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  bodyweight_kg numeric,
  experience_level text check (experience_level in ('new', 'intermediate', 'experienced')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Training days (the tabs: "Chest & Tris", "Back & Bis", etc.)
create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Exercises, each belonging to a day
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day_id uuid not null references public.days on delete cascade,
  name text not null,
  equipment text not null default 'other' check (equipment in ('dumbbell', 'barbell', 'other')),
  rep_min int not null default 8,
  rep_max int not null default 12,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Logged sessions
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  exercise_id uuid not null references public.exercises on delete cascade,
  logged_at date not null default current_date,
  weight_kg numeric not null,
  reps int not null,
  sets int not null,
  rating text check (rating in ('easy', 'just_right', 'hard')),
  created_at timestamptz not null default now()
);

create index if not exists days_user_id_position_idx
  on public.days (user_id, position);

create index if not exists exercises_user_id_idx
  on public.exercises (user_id);

create index if not exists exercises_day_id_position_idx
  on public.exercises (day_id, position);

create index if not exists logs_user_id_idx
  on public.logs (user_id);

create index if not exists logs_exercise_logged_at_idx
  on public.logs (exercise_id, logged_at desc);

create unique index if not exists logs_one_per_exercise_per_day
  on public.logs (exercise_id, logged_at);

-- Row-level security: every user sees ONLY their own rows
alter table public.profiles  enable row level security;
alter table public.days      enable row level security;
alter table public.exercises enable row level security;
alter table public.logs      enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "own days" on public.days;
create policy "own days"
  on public.days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own exercises" on public.exercises;
create policy "own exercises"
  on public.exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own logs" on public.logs;
create policy "own logs"
  on public.logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
