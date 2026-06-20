-- ============================================================
-- Campo Caribe WC2026 — Initial Schema
-- Run this in the Supabase SQL editor (Project > SQL Editor)
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- 1. profiles (one row per auth user)
create table public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  employee_id  text        unique not null,
  full_name    text        not null,
  is_admin     boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- 2. approved_employees (HR-managed allowlist)
create table public.approved_employees (
  id             uuid        primary key default gen_random_uuid(),
  employee_id    text        unique not null,
  full_name      text        not null,
  access_key     text        not null,
  is_admin       boolean     not null default false,
  is_registered  boolean     not null default false,
  registered_at  timestamptz,
  added_at       timestamptz not null default now(),
  added_by       uuid        references public.profiles(id)
);

-- 3. teams
create table public.teams (
  id            uuid    primary key default gen_random_uuid(),
  name          text    not null,
  country_code  text    not null check (char_length(country_code) = 3),
  flag_emoji    text    not null,
  group_letter  text,
  is_top_20     boolean not null default false,
  eliminated    boolean not null default false
);

-- 4. matches
create table public.matches (
  id              uuid        primary key default gen_random_uuid(),
  round           text        not null check (round in ('R32', 'R16', 'QF', 'SF', 'F')),
  team_home_id    uuid        references public.teams(id),
  team_away_id    uuid        references public.teams(id),
  kickoff_time    timestamptz not null,
  status          text        not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  winner_team_id  uuid        references public.teams(id),
  home_score      int,
  away_score      int,
  next_match_id   uuid        references public.matches(id)
);

-- 5. ride_or_die_picks (one per user, locked before R32)
create table public.ride_or_die_picks (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  team_id     uuid        not null references public.teams(id),
  locked      boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- 6. match_picks (one per user per match, locked at kickoff)
create table public.match_picks (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  match_id              uuid        not null references public.matches(id),
  winner_team_id        uuid        not null references public.teams(id),
  predicted_home_score  int,
  predicted_away_score  int,
  submitted_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, match_id)
);

-- 7. score_events (audit trail for all points awarded)
create table public.score_events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  points      int         not null,
  reason      text        not null,
  match_id    uuid        references public.matches(id),
  team_id     uuid        references public.teams(id),
  created_at  timestamptz not null default now()
);

-- 8. settings (admin-controlled key/value store)
create table public.settings (
  key    text  primary key,
  value  jsonb not null
);

-- Default settings
insert into public.settings (key, value) values
  ('registration_open',  'true'::jsonb),
  ('picks_locked',       'false'::jsonb),
  ('tournament_started', 'false'::jsonb);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Returns true if the calling user has is_admin = true.
-- security definer so it bypasses RLS on profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- Auto-create a profile row when a new auth user is inserted.
-- Employee metadata is embedded by the signup server action.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'employee_id' is not null then
    insert into profiles (id, employee_id, full_name, is_admin)
    values (
      new.id,
      new.raw_user_meta_data->>'employee_id',
      coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
      coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Leaderboard aggregate — security definer so it reads all score_events
-- even though individual events are private.
create or replace function public.get_leaderboard()
returns table (
  user_id       uuid,
  full_name     text,
  employee_id   text,
  total_points  bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id           as user_id,
    p.full_name,
    p.employee_id,
    coalesce(sum(se.points), 0) as total_points
  from profiles p
  left join score_events se on se.user_id = p.id
  group by p.id, p.full_name, p.employee_id
  order by total_points desc;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.approved_employees enable row level security;
alter table public.teams              enable row level security;
alter table public.matches            enable row level security;
alter table public.ride_or_die_picks  enable row level security;
alter table public.match_picks        enable row level security;
alter table public.score_events       enable row level security;
alter table public.settings           enable row level security;

-- ---- PROFILES ----
-- All authenticated users can read (needed for leaderboard names).
create policy "profiles: read all"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update their own row but cannot self-promote to admin.
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select is_admin from profiles where id = auth.uid())
  );

-- ---- APPROVED_EMPLOYEES ----
-- Only admins. Signup validation uses the service-role client (bypasses RLS).
create policy "approved_employees: admins only"
  on public.approved_employees for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- TEAMS ----
create policy "teams: anyone reads"
  on public.teams for select
  using (true);

create policy "teams: admins write"
  on public.teams for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- MATCHES ----
create policy "matches: anyone reads"
  on public.matches for select
  using (true);

create policy "matches: admins write"
  on public.matches for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- RIDE_OR_DIE_PICKS ----
-- Own pick is always visible.
create policy "rod_picks: read own"
  on public.ride_or_die_picks for select
  to authenticated
  using (auth.uid() = user_id);

-- After lock (tournament started) everyone can see all picks.
create policy "rod_picks: read all after lock"
  on public.ride_or_die_picks for select
  to authenticated
  using (locked = true);

-- Insert own pick only while unlocked.
create policy "rod_picks: insert own if unlocked"
  on public.ride_or_die_picks for insert
  to authenticated
  with check (auth.uid() = user_id and not locked);

-- Update own pick only while unlocked.
create policy "rod_picks: update own if unlocked"
  on public.ride_or_die_picks for update
  to authenticated
  using (auth.uid() = user_id and not locked)
  with check (auth.uid() = user_id and not locked);

-- Admins can do anything (correct mistakes, lock picks).
create policy "rod_picks: admins all"
  on public.ride_or_die_picks for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- MATCH_PICKS ----
-- Own picks always visible.
create policy "match_picks: read own"
  on public.match_picks for select
  to authenticated
  using (auth.uid() = user_id);

-- Other users' picks visible only after kickoff.
create policy "match_picks: read others after kickoff"
  on public.match_picks for select
  to authenticated
  using (
    auth.uid() != user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.kickoff_time <= now()
    )
  );

-- Insert own pick before kickoff.
create policy "match_picks: insert own before kickoff"
  on public.match_picks for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.kickoff_time > now()
    )
  );

-- Update own pick before kickoff.
create policy "match_picks: update own before kickoff"
  on public.match_picks for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.kickoff_time > now()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.kickoff_time > now()
    )
  );

-- Admins can correct results.
create policy "match_picks: admins all"
  on public.match_picks for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- SCORE_EVENTS ----
-- Users see only their own events; aggregates come from get_leaderboard().
create policy "score_events: read own"
  on public.score_events for select
  to authenticated
  using (auth.uid() = user_id);

-- Only admins (or service role from score calculation job) write events.
create policy "score_events: admins all"
  on public.score_events for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- SETTINGS ----
create policy "settings: anyone reads"
  on public.settings for select
  using (true);

create policy "settings: admins write"
  on public.settings for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- GRANTS
-- ============================================================

-- Table-level access (separate from RLS — required when tables are created via SQL)
grant usage on schema public to anon, authenticated, service_role;
grant all    on all tables    in schema public to authenticated, service_role;
grant all    on all sequences in schema public to authenticated, service_role;
grant select on all tables    in schema public to anon;

-- Function access
grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.is_admin()        to authenticated;
