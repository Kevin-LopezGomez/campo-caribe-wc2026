-- ============================================================
-- teardown_test_data.sql
-- Removes all test users and their data.
-- Resets all R32 matches back to scheduled.
-- Safe to run multiple times.
-- ============================================================

-- Picks cascade from profiles → via auth.users DELETE, but be explicit first
-- to avoid FK timing issues when deleting auth.users.
DELETE FROM public.score_events
WHERE user_id IN (SELECT id FROM public.profiles WHERE is_test = true);

DELETE FROM public.match_picks
WHERE user_id IN (SELECT id FROM public.profiles WHERE is_test = true);

DELETE FROM public.ride_or_die_picks
WHERE user_id IN (SELECT id FROM public.profiles WHERE is_test = true);

-- profiles cascade from auth.users ON DELETE CASCADE
DELETE FROM auth.users
WHERE email LIKE 'TEST%@campocaribe.internal';

-- In case profiles weren't cascade-deleted (e.g., trigger mismatch)
DELETE FROM public.profiles WHERE is_test = true;

DELETE FROM public.approved_employees WHERE is_test = true;

-- Reset R32 match results
UPDATE public.matches
SET
  winner_team_id = NULL,
  home_score     = NULL,
  away_score     = NULL,
  status         = 'scheduled'
WHERE round = 'R32';
