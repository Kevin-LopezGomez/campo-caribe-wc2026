-- ============================================================
-- 021_3rd_place_match.sql
-- Add the 3rd/4th place match (Sat Jul 18, 5 PM AST).
-- Adds next_match_loser_id column to matches so SF losers
-- auto-slot into this match via the same propagation pattern
-- used for winners via next_match_id.
-- ============================================================

-- Widen the round check constraint to include '3RD'.
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_round_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_round_check
  CHECK (round IN ('R32', 'R16', 'QF', 'SF', 'F', '3RD'));

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS next_match_loser_id uuid REFERENCES public.matches(id);

-- Insert the 3rd place match, then immediately point both SF matches at it.
-- 5:00 PM AST = 21:00 UTC (AST is UTC-4).
WITH third_place AS (
  INSERT INTO public.matches (round, kickoff_time, status)
  VALUES ('3RD', '2026-07-18 21:00:00+00', 'scheduled')
  RETURNING id
)
UPDATE public.matches
SET next_match_loser_id = (SELECT id FROM third_place)
WHERE round = 'SF';
