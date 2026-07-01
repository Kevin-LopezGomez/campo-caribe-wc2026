-- ============================================================
-- 018_bracket_slot.sql
-- Add bracket_slot column to matches for visual bracket ordering.
-- REQUIRES migration 017 to have been run first (R16/QF/SF kickoff
-- times set by 017 are used to identify those match rows).
--
-- Does NOT touch: match_picks, ride_or_die_picks, scores, statuses,
-- winner_team_id, or next_match_id.
-- ============================================================

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bracket_slot INTEGER;

-- ── R32: identified by team name ────────────────────────────────
UPDATE matches SET bracket_slot =  1 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Canada')               OR team_away_id=(SELECT id FROM teams WHERE name='Canada'));
UPDATE matches SET bracket_slot =  2 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Morocco')              OR team_away_id=(SELECT id FROM teams WHERE name='Morocco'));
UPDATE matches SET bracket_slot =  3 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Paraguay')             OR team_away_id=(SELECT id FROM teams WHERE name='Paraguay'));
UPDATE matches SET bracket_slot =  4 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='France')               OR team_away_id=(SELECT id FROM teams WHERE name='France'));
UPDATE matches SET bracket_slot =  5 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Belgium')              OR team_away_id=(SELECT id FROM teams WHERE name='Belgium'));
UPDATE matches SET bracket_slot =  6 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='USA')                  OR team_away_id=(SELECT id FROM teams WHERE name='USA'));
UPDATE matches SET bracket_slot =  7 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Spain')                OR team_away_id=(SELECT id FROM teams WHERE name='Spain'));
UPDATE matches SET bracket_slot =  8 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Portugal')             OR team_away_id=(SELECT id FROM teams WHERE name='Portugal'));
UPDATE matches SET bracket_slot =  9 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Brazil')               OR team_away_id=(SELECT id FROM teams WHERE name='Brazil'));
UPDATE matches SET bracket_slot = 10 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Norway')               OR team_away_id=(SELECT id FROM teams WHERE name='Norway'));
UPDATE matches SET bracket_slot = 11 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Mexico')               OR team_away_id=(SELECT id FROM teams WHERE name='Mexico'));
UPDATE matches SET bracket_slot = 12 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='England')              OR team_away_id=(SELECT id FROM teams WHERE name='England'));
UPDATE matches SET bracket_slot = 13 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Switzerland')          OR team_away_id=(SELECT id FROM teams WHERE name='Switzerland'));
UPDATE matches SET bracket_slot = 14 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Colombia')             OR team_away_id=(SELECT id FROM teams WHERE name='Colombia'));
UPDATE matches SET bracket_slot = 15 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Australia')            OR team_away_id=(SELECT id FROM teams WHERE name='Australia'));
UPDATE matches SET bracket_slot = 16 WHERE round='R32' AND (team_home_id=(SELECT id FROM teams WHERE name='Argentina')            OR team_away_id=(SELECT id FROM teams WHERE name='Argentina'));

-- ── R16: identified by kickoff times set in migration 017 ────────
-- slot 1 = Canada vs Morocco       Jul 4  1 PM ET
UPDATE matches SET bracket_slot = 1 WHERE round='R16' AND kickoff_time = '2026-07-04 17:00:00+00';
-- slot 2 = Paraguay vs France      Jul 4  5 PM ET
UPDATE matches SET bracket_slot = 2 WHERE round='R16' AND kickoff_time = '2026-07-04 21:00:00+00';
-- slot 3 = Brazil vs Norway        Jul 5  4 PM ET
UPDATE matches SET bracket_slot = 3 WHERE round='R16' AND kickoff_time = '2026-07-05 20:00:00+00';
-- slot 4 = Mexico vs Eng/DC        Jul 5  8 PM ET
UPDATE matches SET bracket_slot = 4 WHERE round='R16' AND kickoff_time = '2026-07-06 00:00:00+00';
-- slot 5 = Por-Cro vs Spa-Aut      Jul 6  3 PM ET
UPDATE matches SET bracket_slot = 5 WHERE round='R16' AND kickoff_time = '2026-07-06 19:00:00+00';
-- slot 6 = USA-Bos vs Bel-Sen      Jul 6  8 PM ET
UPDATE matches SET bracket_slot = 6 WHERE round='R16' AND kickoff_time = '2026-07-07 00:00:00+00';
-- slot 7 = Arg-CV vs Aus-Egy       Jul 7 12 PM ET
UPDATE matches SET bracket_slot = 7 WHERE round='R16' AND kickoff_time = '2026-07-07 16:00:00+00';
-- slot 8 = Swi-Alg vs Col-Gha      Jul 7  4 PM ET
UPDATE matches SET bracket_slot = 8 WHERE round='R16' AND kickoff_time = '2026-07-07 20:00:00+00';

-- ── QF: identified by kickoff times set in migration 017 ─────────
-- slot 1  Jul  9  4 PM ET
UPDATE matches SET bracket_slot = 1 WHERE round='QF' AND kickoff_time = '2026-07-09 20:00:00+00';
-- slot 2  Jul 10  3 PM ET
UPDATE matches SET bracket_slot = 2 WHERE round='QF' AND kickoff_time = '2026-07-10 19:00:00+00';
-- slot 3  Jul 11  5 PM ET
UPDATE matches SET bracket_slot = 3 WHERE round='QF' AND kickoff_time = '2026-07-11 21:00:00+00';
-- slot 4  Jul 11  9 PM ET
UPDATE matches SET bracket_slot = 4 WHERE round='QF' AND kickoff_time = '2026-07-12 01:00:00+00';

-- ── SF: identified by kickoff times set in migration 017 ─────────
-- slot 1  Jul 14  3 PM ET
UPDATE matches SET bracket_slot = 1 WHERE round='SF' AND kickoff_time = '2026-07-14 19:00:00+00';
-- slot 2  Jul 15  3 PM ET
UPDATE matches SET bracket_slot = 2 WHERE round='SF' AND kickoff_time = '2026-07-15 19:00:00+00';

-- ── Final ─────────────────────────────────────────────────────────
UPDATE matches SET bracket_slot = 1 WHERE round='F';

-- ── Verification (run this separately to confirm results) ─────────
-- SELECT round, bracket_slot, COUNT(*)
-- FROM matches
-- WHERE bracket_slot IS NOT NULL
-- GROUP BY round, bracket_slot
-- ORDER BY round, bracket_slot;
