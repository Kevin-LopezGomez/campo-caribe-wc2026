-- ============================================================
-- 020_fix_next_match_ids.sql
-- Re-set next_match_id for R16 → QF → SF → Final.
-- Safe to run even if 017 already set these; identifies matches
-- by kickoff_time (which 017 already corrected to the right values).
-- Does NOT touch team assignments, picks, or scores.
-- ============================================================

DO $$
DECLARE
  v_r16_1 UUID; v_r16_2 UUID; v_r16_3 UUID; v_r16_4 UUID;
  v_r16_5 UUID; v_r16_6 UUID; v_r16_7 UUID; v_r16_8 UUID;
  v_qf1   UUID; v_qf2   UUID; v_qf3   UUID; v_qf4   UUID;
  v_sf1   UUID; v_sf2   UUID;
  v_f     UUID;
BEGIN
  -- R16 matches by kickoff_time set in migration 017
  SELECT id INTO v_r16_1 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-04 17:00:00+00';
  SELECT id INTO v_r16_2 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-04 21:00:00+00';
  SELECT id INTO v_r16_3 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-05 20:00:00+00';
  SELECT id INTO v_r16_4 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-06 00:00:00+00';
  SELECT id INTO v_r16_5 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-06 19:00:00+00';
  SELECT id INTO v_r16_6 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-07 00:00:00+00';
  SELECT id INTO v_r16_7 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-07 16:00:00+00';
  SELECT id INTO v_r16_8 FROM matches WHERE round = 'R16' AND kickoff_time = '2026-07-07 20:00:00+00';

  -- QF matches by kickoff_time set in migration 017
  SELECT id INTO v_qf1 FROM matches WHERE round = 'QF' AND kickoff_time = '2026-07-09 20:00:00+00';
  SELECT id INTO v_qf2 FROM matches WHERE round = 'QF' AND kickoff_time = '2026-07-10 19:00:00+00';
  SELECT id INTO v_qf3 FROM matches WHERE round = 'QF' AND kickoff_time = '2026-07-11 21:00:00+00';
  SELECT id INTO v_qf4 FROM matches WHERE round = 'QF' AND kickoff_time = '2026-07-12 01:00:00+00';

  -- SF matches by kickoff_time set in migration 017
  SELECT id INTO v_sf1 FROM matches WHERE round = 'SF' AND kickoff_time = '2026-07-14 19:00:00+00';
  SELECT id INTO v_sf2 FROM matches WHERE round = 'SF' AND kickoff_time = '2026-07-15 19:00:00+00';

  -- Final
  SELECT id INTO v_f FROM matches WHERE round = 'F';

  -- Verify all IDs found before touching anything
  IF v_r16_1 IS NULL OR v_r16_2 IS NULL OR v_r16_3 IS NULL OR v_r16_4 IS NULL
  OR v_r16_5 IS NULL OR v_r16_6 IS NULL OR v_r16_7 IS NULL OR v_r16_8 IS NULL THEN
    RAISE EXCEPTION 'Could not find all 8 R16 matches by kickoff_time — has migration 017 run?';
  END IF;
  IF v_qf1 IS NULL OR v_qf2 IS NULL OR v_qf3 IS NULL OR v_qf4 IS NULL THEN
    RAISE EXCEPTION 'Could not find all 4 QF matches by kickoff_time — has migration 017 run?';
  END IF;
  IF v_sf1 IS NULL OR v_sf2 IS NULL THEN
    RAISE EXCEPTION 'Could not find both SF matches by kickoff_time — has migration 017 run?';
  END IF;

  -- ── R16 → QF next_match_id ────────────────────────────────────
  -- QF1 (Jul9): fed by R16-1 (Canada/Morocco) + R16-2 (Paraguay/France)
  UPDATE matches SET next_match_id = v_qf1 WHERE id IN (v_r16_1, v_r16_2);
  -- QF3 (Jul11 5pm): fed by R16-3 (Brazil/Norway) + R16-4 (Mexico/England)
  UPDATE matches SET next_match_id = v_qf3 WHERE id IN (v_r16_3, v_r16_4);
  -- QF2 (Jul10): fed by R16-5 (Por-Cro/Spa-Aut) + R16-6 (USA-Bos/Bel-Sen)
  UPDATE matches SET next_match_id = v_qf2 WHERE id IN (v_r16_5, v_r16_6);
  -- QF4 (Jul11 9pm): fed by R16-7 (Arg-CV/Aus-Egy) + R16-8 (Swi-Alg/Col-Gha)
  UPDATE matches SET next_match_id = v_qf4 WHERE id IN (v_r16_7, v_r16_8);

  -- ── QF → SF next_match_id ─────────────────────────────────────
  -- SF1 (Jul14): QF1 + QF2
  UPDATE matches SET next_match_id = v_sf1 WHERE id IN (v_qf1, v_qf2);
  -- SF2 (Jul15): QF3 + QF4
  UPDATE matches SET next_match_id = v_sf2 WHERE id IN (v_qf3, v_qf4);

  -- ── SF → Final next_match_id ──────────────────────────────────
  UPDATE matches SET next_match_id = v_f WHERE id IN (v_sf1, v_sf2);

END $$;

-- ── Verification ──────────────────────────────────────────────────
-- SELECT m.round, m.kickoff_time, nm.round AS next_round, nm.kickoff_time AS next_kickoff
-- FROM matches m LEFT JOIN matches nm ON nm.id = m.next_match_id
-- WHERE m.round IN ('R16','QF','SF') ORDER BY m.round, m.kickoff_time;
