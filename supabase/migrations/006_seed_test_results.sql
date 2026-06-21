-- ============================================================
-- seed_test_results.sql
-- Sets the first 8 R32 matches (by kickoff time) to completed
-- with random scores (home wins ~50% of the time, scores 0-3).
-- Run AFTER seed_test_data.sql.
-- After running: click "Recalculate All Scores" in /dev to award points.
-- ============================================================

UPDATE public.matches
SET
  winner_team_id = CASE
    WHEN sub.home_wins THEN team_home_id
    ELSE team_away_id
  END,
  home_score  = sub.hs,
  away_score  = sub.as_,
  status      = 'completed'
FROM (
  SELECT
    id,
    RANDOM() < 0.5  AS home_wins,
    FLOOR(RANDOM() * 4)::int AS hs,
    FLOOR(RANDOM() * 4)::int AS as_
  FROM public.matches
  WHERE round = 'R32'
    AND team_home_id IS NOT NULL
    AND team_away_id IS NOT NULL
  ORDER BY kickoff_time
  LIMIT 8
) sub
WHERE public.matches.id = sub.id;
