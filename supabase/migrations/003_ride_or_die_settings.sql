-- ============================================================
-- 003_ride_or_die_settings.sql
-- Add ride_or_die_lock_time to settings table
-- Default: 2026-06-28 23:00 UTC (first R32 kickoff = 19:00 AST)
-- Run in Supabase SQL Editor
-- ============================================================

insert into public.settings (key, value)
values ('ride_or_die_lock_time', '"2026-06-28T23:00:00+00:00"'::jsonb)
on conflict (key) do nothing;
