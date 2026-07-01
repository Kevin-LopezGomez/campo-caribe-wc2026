-- ============================================================
-- 019_fix_r16_teams.sql
-- STEP 1: Rebuild R16 team assignments from actual R32 winners.
--   Lower bracket_slot R32 winner → R16 team_home_id
--   Higher bracket_slot R32 winner → R16 team_away_id
--   If a feeder match is not yet completed, that side stays NULL.
--
-- STEP 5: Reset any R16 rows that were incorrectly marked completed
--   (no R16 games have legitimately been played as of Jul 1).
--
-- Does NOT touch: match_picks, ride_or_die_picks, R32 data,
--   next_match_id, bracket_slot, or score_events.
-- ============================================================

-- ── STEP 1: Rebuild R16 team_home / team_away from R32 winners ──
DO $$
DECLARE
  r16_rec    RECORD;
  home_winner UUID;
  away_winner UUID;
BEGIN
  FOR r16_rec IN
    SELECT id FROM matches WHERE round = 'R16'
  LOOP
    -- Lower bracket_slot R32 feeder → home side
    SELECT
      CASE WHEN status = 'completed' THEN winner_team_id ELSE NULL END
    INTO home_winner
    FROM matches
    WHERE next_match_id = r16_rec.id AND round = 'R32'
    ORDER BY bracket_slot ASC
    LIMIT 1 OFFSET 0;

    -- Higher bracket_slot R32 feeder → away side
    SELECT
      CASE WHEN status = 'completed' THEN winner_team_id ELSE NULL END
    INTO away_winner
    FROM matches
    WHERE next_match_id = r16_rec.id AND round = 'R32'
    ORDER BY bracket_slot ASC
    LIMIT 1 OFFSET 1;

    UPDATE matches
    SET team_home_id = home_winner,
        team_away_id = away_winner
    WHERE id = r16_rec.id;
  END LOOP;
END $$;

-- ── STEP 5: Reset any R16 rows incorrectly marked completed ─────
-- (flag check: if any R16 match legitimately played, this will also
--  reset it — user confirmed no R16 games played as of Jul 1 2026)
UPDATE matches
SET status        = 'scheduled',
    winner_team_id = NULL,
    home_score     = NULL,
    away_score     = NULL
WHERE round = 'R16'
  AND status != 'scheduled';
