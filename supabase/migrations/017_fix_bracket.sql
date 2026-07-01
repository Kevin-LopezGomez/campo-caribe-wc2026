-- ============================================================
-- 017_fix_bracket.sql
-- Fix bracket structure to match the real 2026 WC knockout draw:
--   • Correct R32 kickoff times (ET = UTC-4)
--   • Correct R32 → R16 next_match_id pairings
--   • Correct R16 → QF next_match_id pairings (QF2/QF3 were swapped)
--   • Correct R16, QF, SF, Final kickoff times
--
-- Safe: identifies matches by team name, never by ID.
-- Does NOT touch match_picks, scores, or match statuses.
-- ============================================================

DO $$
DECLARE
  -- Team IDs (looked up by name as seeded)
  t_canada        UUID; t_south_africa UUID;
  t_brazil        UUID; t_japan        UUID;
  t_paraguay      UUID; t_germany      UUID;
  t_morocco       UUID; t_netherlands  UUID;
  t_norway        UUID; t_ivory_coast  UUID;
  t_france        UUID; t_sweden       UUID;
  t_mexico        UUID; t_ecuador      UUID;
  t_england       UUID; t_dr_congo     UUID;
  t_belgium       UUID; t_senegal      UUID;
  t_usa           UUID; t_bosnia       UUID;
  t_spain         UUID; t_austria      UUID;
  t_portugal      UUID; t_croatia      UUID;
  t_switzerland   UUID; t_algeria      UUID;
  t_australia     UUID; t_egypt        UUID;
  t_argentina     UUID; t_cape_verde   UUID;
  t_colombia      UUID; t_ghana        UUID;

  -- R16 match IDs (ordered by current kickoff_time ASC)
  -- These slots were seeded as Jul 5–8 and haven't been touched by admin yet.
  v_r16_1 UUID; v_r16_2 UUID; v_r16_3 UUID; v_r16_4 UUID;
  v_r16_5 UUID; v_r16_6 UUID; v_r16_7 UUID; v_r16_8 UUID;

  -- QF match IDs (ordered by current kickoff_time ASC, seeded Jul 11–12)
  v_qf1 UUID; v_qf2 UUID; v_qf3 UUID; v_qf4 UUID;

  -- SF match IDs (ordered by current kickoff_time ASC, seeded Jul 15–16)
  v_sf1 UUID; v_sf2 UUID;

  -- Final ID
  v_f UUID;

BEGIN
  -- ── Look up all team IDs ──────────────────────────────────────
  SELECT id INTO t_canada       FROM teams WHERE name = 'Canada';
  SELECT id INTO t_south_africa FROM teams WHERE name = 'South Africa';
  SELECT id INTO t_brazil       FROM teams WHERE name = 'Brazil';
  SELECT id INTO t_japan        FROM teams WHERE name = 'Japan';
  SELECT id INTO t_paraguay     FROM teams WHERE name = 'Paraguay';
  SELECT id INTO t_germany      FROM teams WHERE name = 'Germany';
  SELECT id INTO t_morocco      FROM teams WHERE name = 'Morocco';
  SELECT id INTO t_netherlands  FROM teams WHERE name = 'Netherlands';
  SELECT id INTO t_norway       FROM teams WHERE name = 'Norway';
  SELECT id INTO t_ivory_coast  FROM teams WHERE name = 'Côte d''Ivoire';
  SELECT id INTO t_france       FROM teams WHERE name = 'France';
  SELECT id INTO t_sweden       FROM teams WHERE name = 'Sweden';
  SELECT id INTO t_mexico       FROM teams WHERE name = 'Mexico';
  SELECT id INTO t_ecuador      FROM teams WHERE name = 'Ecuador';
  SELECT id INTO t_england      FROM teams WHERE name = 'England';
  SELECT id INTO t_dr_congo     FROM teams WHERE name = 'DR Congo';
  SELECT id INTO t_belgium      FROM teams WHERE name = 'Belgium';
  SELECT id INTO t_senegal      FROM teams WHERE name = 'Senegal';
  SELECT id INTO t_usa          FROM teams WHERE name = 'USA';
  SELECT id INTO t_bosnia       FROM teams WHERE name = 'Bosnia and Herzegovina';
  SELECT id INTO t_spain        FROM teams WHERE name = 'Spain';
  SELECT id INTO t_austria      FROM teams WHERE name = 'Austria';
  SELECT id INTO t_portugal     FROM teams WHERE name = 'Portugal';
  SELECT id INTO t_croatia      FROM teams WHERE name = 'Croatia';
  SELECT id INTO t_switzerland  FROM teams WHERE name = 'Switzerland';
  SELECT id INTO t_algeria      FROM teams WHERE name = 'Algeria';
  SELECT id INTO t_australia    FROM teams WHERE name = 'Australia';
  SELECT id INTO t_egypt        FROM teams WHERE name = 'Egypt';
  SELECT id INTO t_argentina    FROM teams WHERE name = 'Argentina';
  SELECT id INTO t_cape_verde   FROM teams WHERE name = 'Cabo Verde';
  SELECT id INTO t_colombia     FROM teams WHERE name = 'Colombia';
  SELECT id INTO t_ghana        FROM teams WHERE name = 'Ghana';

  -- ── Grab R16 / QF / SF / F IDs by current kickoff order ──────
  SELECT id INTO v_r16_1 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 0;
  SELECT id INTO v_r16_2 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 1;
  SELECT id INTO v_r16_3 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 2;
  SELECT id INTO v_r16_4 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 3;
  SELECT id INTO v_r16_5 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 4;
  SELECT id INTO v_r16_6 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 5;
  SELECT id INTO v_r16_7 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 6;
  SELECT id INTO v_r16_8 FROM matches WHERE round = 'R16' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 7;

  SELECT id INTO v_qf1 FROM matches WHERE round = 'QF' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 0;
  SELECT id INTO v_qf2 FROM matches WHERE round = 'QF' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 1;
  SELECT id INTO v_qf3 FROM matches WHERE round = 'QF' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 2;
  SELECT id INTO v_qf4 FROM matches WHERE round = 'QF' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 3;

  SELECT id INTO v_sf1 FROM matches WHERE round = 'SF' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 0;
  SELECT id INTO v_sf2 FROM matches WHERE round = 'SF' ORDER BY kickoff_time ASC LIMIT 1 OFFSET 1;

  SELECT id INTO v_f FROM matches WHERE round = 'F' LIMIT 1;

  -- ── Fix R32 kickoff times (ET = UTC-4) ───────────────────────
  -- Jun 28  3:00 PM ET → 19:00 UTC   Canada vs South Africa
  UPDATE matches SET kickoff_time = '2026-06-28 19:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_canada OR team_away_id = t_canada);

  -- Jun 29  1:00 PM ET → 17:00 UTC   Brazil vs Japan
  UPDATE matches SET kickoff_time = '2026-06-29 17:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_brazil OR team_away_id = t_brazil);

  -- Jun 29  4:30 PM ET → 20:30 UTC   Paraguay vs Germany
  UPDATE matches SET kickoff_time = '2026-06-29 20:30:00+00'
  WHERE round = 'R32' AND (team_home_id = t_paraguay OR team_away_id = t_paraguay);

  -- Jun 29  9:00 PM ET → Jun 30 01:00 UTC   Morocco vs Netherlands
  UPDATE matches SET kickoff_time = '2026-06-30 01:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_morocco OR team_away_id = t_morocco);

  -- Jun 30  1:00 PM ET → 17:00 UTC   Norway vs Ivory Coast
  UPDATE matches SET kickoff_time = '2026-06-30 17:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_norway OR team_away_id = t_norway);

  -- Jun 30  5:00 PM ET → 21:00 UTC   France vs Sweden
  UPDATE matches SET kickoff_time = '2026-06-30 21:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_france OR team_away_id = t_france);

  -- Jun 30 10:00 PM ET → Jul 1 02:00 UTC   Mexico vs Ecuador
  UPDATE matches SET kickoff_time = '2026-07-01 02:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_mexico OR team_away_id = t_mexico);

  -- Jul 1  12:00 PM ET → 16:00 UTC   England vs DR Congo
  UPDATE matches SET kickoff_time = '2026-07-01 16:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_england OR team_away_id = t_england);

  -- Jul 1   4:00 PM ET → 20:00 UTC   Belgium vs Senegal
  UPDATE matches SET kickoff_time = '2026-07-01 20:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_belgium OR team_away_id = t_belgium);

  -- Jul 1   8:00 PM ET → Jul 2 00:00 UTC   USA vs Bosnia
  UPDATE matches SET kickoff_time = '2026-07-02 00:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_usa OR team_away_id = t_usa);

  -- Jul 2   3:00 PM ET → 19:00 UTC   Spain vs Austria
  UPDATE matches SET kickoff_time = '2026-07-02 19:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_spain OR team_away_id = t_spain);

  -- Jul 2   7:00 PM ET → 23:00 UTC   Portugal vs Croatia
  UPDATE matches SET kickoff_time = '2026-07-02 23:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_portugal OR team_away_id = t_portugal);

  -- Jul 2  11:00 PM ET → Jul 3 03:00 UTC   Switzerland vs Algeria
  UPDATE matches SET kickoff_time = '2026-07-03 03:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_switzerland OR team_away_id = t_switzerland);

  -- Jul 3   2:00 PM ET → 18:00 UTC   Australia vs Egypt
  UPDATE matches SET kickoff_time = '2026-07-03 18:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_australia OR team_away_id = t_australia);

  -- Jul 3   6:00 PM ET → 22:00 UTC   Argentina vs Cape Verde
  UPDATE matches SET kickoff_time = '2026-07-03 22:00:00+00'
  WHERE round = 'R32' AND (team_home_id = t_argentina OR team_away_id = t_argentina);

  -- Jul 3   9:30 PM ET → Jul 4 01:30 UTC   Colombia vs Ghana
  UPDATE matches SET kickoff_time = '2026-07-04 01:30:00+00'
  WHERE round = 'R32' AND (team_home_id = t_colombia OR team_away_id = t_colombia);

  -- ── Fix R32 → R16 next_match_id ──────────────────────────────
  -- R16-1 (Canada vs Morocco):   Canada/SA  +  Morocco/Netherlands
  UPDATE matches SET next_match_id = v_r16_1
  WHERE round = 'R32'
    AND (team_home_id = t_canada OR team_away_id = t_canada
      OR team_home_id = t_south_africa OR team_away_id = t_south_africa);

  UPDATE matches SET next_match_id = v_r16_1
  WHERE round = 'R32'
    AND (team_home_id = t_morocco OR team_away_id = t_morocco
      OR team_home_id = t_netherlands OR team_away_id = t_netherlands);

  -- R16-2 (Paraguay vs France):  Paraguay/Germany  +  France/Sweden
  UPDATE matches SET next_match_id = v_r16_2
  WHERE round = 'R32'
    AND (team_home_id = t_paraguay OR team_away_id = t_paraguay
      OR team_home_id = t_germany OR team_away_id = t_germany);

  UPDATE matches SET next_match_id = v_r16_2
  WHERE round = 'R32'
    AND (team_home_id = t_france OR team_away_id = t_france
      OR team_home_id = t_sweden OR team_away_id = t_sweden);

  -- R16-3 (Brazil vs Norway):    Brazil/Japan  +  Norway/Ivory Coast
  UPDATE matches SET next_match_id = v_r16_3
  WHERE round = 'R32'
    AND (team_home_id = t_brazil OR team_away_id = t_brazil
      OR team_home_id = t_japan OR team_away_id = t_japan);

  UPDATE matches SET next_match_id = v_r16_3
  WHERE round = 'R32'
    AND (team_home_id = t_norway OR team_away_id = t_norway
      OR team_home_id = t_ivory_coast OR team_away_id = t_ivory_coast);

  -- R16-4 (Mexico vs England/DR Congo):  Mexico/Ecuador  +  England/DR Congo
  UPDATE matches SET next_match_id = v_r16_4
  WHERE round = 'R32'
    AND (team_home_id = t_mexico OR team_away_id = t_mexico
      OR team_home_id = t_ecuador OR team_away_id = t_ecuador);

  UPDATE matches SET next_match_id = v_r16_4
  WHERE round = 'R32'
    AND (team_home_id = t_england OR team_away_id = t_england
      OR team_home_id = t_dr_congo OR team_away_id = t_dr_congo);

  -- R16-5 (Portugal/Croatia vs Spain/Austria):  Portugal/Croatia  +  Spain/Austria
  UPDATE matches SET next_match_id = v_r16_5
  WHERE round = 'R32'
    AND (team_home_id = t_portugal OR team_away_id = t_portugal
      OR team_home_id = t_croatia OR team_away_id = t_croatia);

  UPDATE matches SET next_match_id = v_r16_5
  WHERE round = 'R32'
    AND (team_home_id = t_spain OR team_away_id = t_spain
      OR team_home_id = t_austria OR team_away_id = t_austria);

  -- R16-6 (USA/Bosnia vs Belgium/Senegal):  USA/Bosnia  +  Belgium/Senegal
  UPDATE matches SET next_match_id = v_r16_6
  WHERE round = 'R32'
    AND (team_home_id = t_usa OR team_away_id = t_usa
      OR team_home_id = t_bosnia OR team_away_id = t_bosnia);

  UPDATE matches SET next_match_id = v_r16_6
  WHERE round = 'R32'
    AND (team_home_id = t_belgium OR team_away_id = t_belgium
      OR team_home_id = t_senegal OR team_away_id = t_senegal);

  -- R16-7 (Argentina/Cape Verde vs Australia/Egypt):  Argentina/Cape Verde  +  Australia/Egypt
  UPDATE matches SET next_match_id = v_r16_7
  WHERE round = 'R32'
    AND (team_home_id = t_argentina OR team_away_id = t_argentina
      OR team_home_id = t_cape_verde OR team_away_id = t_cape_verde);

  UPDATE matches SET next_match_id = v_r16_7
  WHERE round = 'R32'
    AND (team_home_id = t_australia OR team_away_id = t_australia
      OR team_home_id = t_egypt OR team_away_id = t_egypt);

  -- R16-8 (Switzerland/Algeria vs Colombia/Ghana):  Switzerland/Algeria  +  Colombia/Ghana
  UPDATE matches SET next_match_id = v_r16_8
  WHERE round = 'R32'
    AND (team_home_id = t_switzerland OR team_away_id = t_switzerland
      OR team_home_id = t_algeria OR team_away_id = t_algeria);

  UPDATE matches SET next_match_id = v_r16_8
  WHERE round = 'R32'
    AND (team_home_id = t_colombia OR team_away_id = t_colombia
      OR team_home_id = t_ghana OR team_away_id = t_ghana);

  -- ── Fix R16 kickoff times ─────────────────────────────────────
  -- Jul 4  1:00 PM ET → 17:00 UTC   Canada vs Morocco
  UPDATE matches SET kickoff_time = '2026-07-04 17:00:00+00' WHERE id = v_r16_1;
  -- Jul 4  5:00 PM ET → 21:00 UTC   Paraguay vs France
  UPDATE matches SET kickoff_time = '2026-07-04 21:00:00+00' WHERE id = v_r16_2;
  -- Jul 5  4:00 PM ET → 20:00 UTC   Brazil vs Norway
  UPDATE matches SET kickoff_time = '2026-07-05 20:00:00+00' WHERE id = v_r16_3;
  -- Jul 5  8:00 PM ET → Jul 6 00:00 UTC   Mexico vs Winner(Eng/DC)
  UPDATE matches SET kickoff_time = '2026-07-06 00:00:00+00' WHERE id = v_r16_4;
  -- Jul 6  3:00 PM ET → 19:00 UTC   Winner(Por/Cro) vs Winner(Spa/Aut)
  UPDATE matches SET kickoff_time = '2026-07-06 19:00:00+00' WHERE id = v_r16_5;
  -- Jul 6  8:00 PM ET → Jul 7 00:00 UTC   Winner(USA/Bos) vs Winner(Bel/Sen)
  UPDATE matches SET kickoff_time = '2026-07-07 00:00:00+00' WHERE id = v_r16_6;
  -- Jul 7 12:00 PM ET → 16:00 UTC   Winner(Arg/CV) vs Winner(Aus/Egy)
  UPDATE matches SET kickoff_time = '2026-07-07 16:00:00+00' WHERE id = v_r16_7;
  -- Jul 7  4:00 PM ET → 20:00 UTC   Winner(Swi/Alg) vs Winner(Col/Gha)
  UPDATE matches SET kickoff_time = '2026-07-07 20:00:00+00' WHERE id = v_r16_8;

  -- ── Fix R16 → QF next_match_id ───────────────────────────────
  -- QF1: R16-1 (Canada/Morocco) + R16-2 (Paraguay/France)
  UPDATE matches SET next_match_id = v_qf1 WHERE id IN (v_r16_1, v_r16_2);
  -- QF3: R16-3 (Brazil/Norway) + R16-4 (Mexico/Eng-DC)   ← was QF2 in old seed!
  UPDATE matches SET next_match_id = v_qf3 WHERE id IN (v_r16_3, v_r16_4);
  -- QF2: R16-5 (Por-Cro/Spa-Aut) + R16-6 (USA-Bos/Bel-Sen)  ← was QF3 in old seed!
  UPDATE matches SET next_match_id = v_qf2 WHERE id IN (v_r16_5, v_r16_6);
  -- QF4: R16-7 (Arg-CV/Aus-Egy) + R16-8 (Swi-Alg/Col-Gha)
  UPDATE matches SET next_match_id = v_qf4 WHERE id IN (v_r16_7, v_r16_8);

  -- ── Fix QF kickoff times ──────────────────────────────────────
  -- Jul  9  4:00 PM ET → 20:00 UTC   QF1
  UPDATE matches SET kickoff_time = '2026-07-09 20:00:00+00' WHERE id = v_qf1;
  -- Jul 10  3:00 PM ET → 19:00 UTC   QF2
  UPDATE matches SET kickoff_time = '2026-07-10 19:00:00+00' WHERE id = v_qf2;
  -- Jul 11  5:00 PM ET → 21:00 UTC   QF3
  UPDATE matches SET kickoff_time = '2026-07-11 21:00:00+00' WHERE id = v_qf3;
  -- Jul 11  9:00 PM ET → Jul 12 01:00 UTC   QF4
  UPDATE matches SET kickoff_time = '2026-07-12 01:00:00+00' WHERE id = v_qf4;

  -- ── Fix QF → SF next_match_id ─────────────────────────────────
  -- SF1: QF1 + QF2
  UPDATE matches SET next_match_id = v_sf1 WHERE id IN (v_qf1, v_qf2);
  -- SF2: QF3 + QF4
  UPDATE matches SET next_match_id = v_sf2 WHERE id IN (v_qf3, v_qf4);

  -- ── Fix SF kickoff times ──────────────────────────────────────
  -- Jul 14  3:00 PM ET → 19:00 UTC   SF1
  UPDATE matches SET kickoff_time = '2026-07-14 19:00:00+00' WHERE id = v_sf1;
  -- Jul 15  3:00 PM ET → 19:00 UTC   SF2
  UPDATE matches SET kickoff_time = '2026-07-15 19:00:00+00' WHERE id = v_sf2;

  -- ── Fix SF → Final next_match_id ─────────────────────────────
  UPDATE matches SET next_match_id = v_f WHERE id IN (v_sf1, v_sf2);

  -- ── Fix Final kickoff time ────────────────────────────────────
  -- Jul 19  3:00 PM ET → 19:00 UTC
  UPDATE matches SET kickoff_time = '2026-07-19 19:00:00+00' WHERE id = v_f;

END $$;
