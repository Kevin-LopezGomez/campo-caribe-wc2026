-- ============================================================
-- 002_seed_teams_matches.sql
-- WC2026 — 48 teams + full knockout bracket (M73–M103)
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TEAMS
-- FIFA Top 20 (April 2026) = is_top_20 true, NOT Cinderella eligible:
-- France, Spain, Argentina, England, Portugal, Brazil, Germany,
-- Netherlands, Belgium, Croatia, Morocco, Switzerland, USA,
-- Colombia, Mexico, Senegal, Uruguay, Japan, Côte d'Ivoire, Türkiye
-- ============================================================

insert into public.teams (name, country_code, flag_emoji, group_letter, is_top_20, eliminated) values
-- Group A
('Mexico',       'MEX', '🇲🇽', 'A', true,  false),
('South Africa', 'RSA', '🇿🇦', 'A', false, false),
('South Korea',  'KOR', '🇰🇷', 'A', false, false),
('Czechia',      'CZE', '🇨🇿', 'A', false, false),
-- Group B
('Canada',                 'CAN', '🇨🇦', 'B', false, false),
('Switzerland',            'SUI', '🇨🇭', 'B', true,  false),
('Qatar',                  'QAT', '🇶🇦', 'B', false, false),
('Bosnia and Herzegovina', 'BIH', '🇧🇦', 'B', false, false),
-- Group C
('Brazil',   'BRA', '🇧🇷', 'C', true,  false),
('Morocco',  'MAR', '🇲🇦', 'C', true,  false),
('Haiti',    'HAI', '🇭🇹', 'C', false, false),
('Scotland', 'SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', false, false),
-- Group D
('USA',       'USA', '🇺🇸', 'D', true,  false),
('Paraguay',  'PAR', '🇵🇾', 'D', false, false),
('Australia', 'AUS', '🇦🇺', 'D', false, false),
('Türkiye',   'TUR', '🇹🇷', 'D', true,  false),
-- Group E
('Germany',         'GER', '🇩🇪', 'E', true,  false),
('Curaçao',         'CUW', '🇨🇼', 'E', false, false),
('Côte d''Ivoire',  'CIV', '🇨🇮', 'E', true,  false),
('Ecuador',         'ECU', '🇪🇨', 'E', false, false),
-- Group F
('Netherlands', 'NED', '🇳🇱', 'F', true,  false),
('Japan',       'JPN', '🇯🇵', 'F', true,  false),
('Tunisia',     'TUN', '🇹🇳', 'F', false, false),
('Sweden',      'SWE', '🇸🇪', 'F', false, false),
-- Group G
('Belgium',     'BEL', '🇧🇪', 'G', true,  false),
('Egypt',       'EGY', '🇪🇬', 'G', false, false),
('Iran',        'IRN', '🇮🇷', 'G', false, false),
('New Zealand', 'NZL', '🇳🇿', 'G', false, false),
-- Group H
('Spain',        'ESP', '🇪🇸', 'H', true,  false),
('Cabo Verde',   'CPV', '🇨🇻', 'H', false, false),
('Saudi Arabia', 'KSA', '🇸🇦', 'H', false, false),
('Uruguay',      'URU', '🇺🇾', 'H', true,  false),
-- Group I
('France',  'FRA', '🇫🇷', 'I', true,  false),
('Senegal', 'SEN', '🇸🇳', 'I', true,  false),
('Norway',  'NOR', '🇳🇴', 'I', false, false),
('Iraq',    'IRQ', '🇮🇶', 'I', false, false),
-- Group J
('Argentina', 'ARG', '🇦🇷', 'J', true,  false),
('Algeria',   'ALG', '🇩🇿', 'J', false, false),
('Austria',   'AUT', '🇦🇹', 'J', false, false),
('Jordan',    'JOR', '🇯🇴', 'J', false, false),
-- Group K
('Portugal',   'POR', '🇵🇹', 'K', true,  false),
('Uzbekistan', 'UZB', '🇺🇿', 'K', false, false),
('Colombia',   'COL', '🇨🇴', 'K', true,  false),
('DR Congo',   'COD', '🇨🇩', 'K', false, false),
-- Group L
('England', 'ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L', true,  false),
('Croatia', 'CRO', '🇭🇷', 'L', true,  false),
('Ghana',   'GHA', '🇬🇭', 'L', false, false),
('Panama',  'PAN', '🇵🇦', 'L', false, false);

-- ============================================================
-- KNOCKOUT BRACKET (M73–M103)
-- Bracket structure:
--   R32 pairs  1+2  → R16-1,  3+4  → R16-2, ..., 15+16 → R16-8
--   R16 pairs  1+2  → QF-1,   3+4  → QF-2,   5+6  → QF-3,  7+8  → QF-4
--   QF  pairs  1+2  → SF-1,   3+4  → SF-2
--   SF  pairs  1+2  → Final
--
-- All times UTC. AST = UTC-4 (Puerto Rico, no DST).
-- Example: 15:00 UTC = 11:00 AST · 19:00 UTC = 15:00 AST · 23:00 UTC = 19:00 AST
-- Admin can update kickoff times and assign teams via /admin/matches.
-- ============================================================

do $$
declare
  -- Final
  v_f     uuid;
  -- Semis
  v_sf1   uuid; v_sf2   uuid;
  -- Quarters
  v_qf1   uuid; v_qf2   uuid; v_qf3   uuid; v_qf4   uuid;
  -- Round of 16
  v_r16_1 uuid; v_r16_2 uuid; v_r16_3 uuid; v_r16_4 uuid;
  v_r16_5 uuid; v_r16_6 uuid; v_r16_7 uuid; v_r16_8 uuid;
  -- Round of 32
  v_m73   uuid; v_m74   uuid; v_m75   uuid; v_m76   uuid;
  v_m77   uuid; v_m78   uuid; v_m79   uuid; v_m80   uuid;
  v_m81   uuid; v_m82   uuid; v_m83   uuid; v_m84   uuid;
  v_m85   uuid; v_m86   uuid; v_m87   uuid; v_m88   uuid;
begin
  -- Generate all UUIDs
  v_f     := gen_random_uuid();
  v_sf1   := gen_random_uuid(); v_sf2   := gen_random_uuid();
  v_qf1   := gen_random_uuid(); v_qf2   := gen_random_uuid();
  v_qf3   := gen_random_uuid(); v_qf4   := gen_random_uuid();
  v_r16_1 := gen_random_uuid(); v_r16_2 := gen_random_uuid();
  v_r16_3 := gen_random_uuid(); v_r16_4 := gen_random_uuid();
  v_r16_5 := gen_random_uuid(); v_r16_6 := gen_random_uuid();
  v_r16_7 := gen_random_uuid(); v_r16_8 := gen_random_uuid();
  v_m73   := gen_random_uuid(); v_m74   := gen_random_uuid();
  v_m75   := gen_random_uuid(); v_m76   := gen_random_uuid();
  v_m77   := gen_random_uuid(); v_m78   := gen_random_uuid();
  v_m79   := gen_random_uuid(); v_m80   := gen_random_uuid();
  v_m81   := gen_random_uuid(); v_m82   := gen_random_uuid();
  v_m83   := gen_random_uuid(); v_m84   := gen_random_uuid();
  v_m85   := gen_random_uuid(); v_m86   := gen_random_uuid();
  v_m87   := gen_random_uuid(); v_m88   := gen_random_uuid();

  -- Final (M103) — must exist first for FK chain
  insert into public.matches (id, round, kickoff_time, status) values
    (v_f, 'F', '2026-07-19 19:00:00+00', 'scheduled');

  -- Semis (M101, M102)
  insert into public.matches (id, round, kickoff_time, status, next_match_id) values
    (v_sf1, 'SF', '2026-07-15 22:00:00+00', 'scheduled', v_f),
    (v_sf2, 'SF', '2026-07-16 22:00:00+00', 'scheduled', v_f);

  -- Quarters (M97–M100): QF1+QF2 → SF1, QF3+QF4 → SF2
  insert into public.matches (id, round, kickoff_time, status, next_match_id) values
    (v_qf1, 'QF', '2026-07-11 15:00:00+00', 'scheduled', v_sf1),
    (v_qf2, 'QF', '2026-07-11 22:00:00+00', 'scheduled', v_sf1),
    (v_qf3, 'QF', '2026-07-12 15:00:00+00', 'scheduled', v_sf2),
    (v_qf4, 'QF', '2026-07-12 22:00:00+00', 'scheduled', v_sf2);

  -- R16 (M89–M96): R16-1+R16-2 → QF1, ..., R16-7+R16-8 → QF4
  insert into public.matches (id, round, kickoff_time, status, next_match_id) values
    (v_r16_1, 'R16', '2026-07-05 15:00:00+00', 'scheduled', v_qf1),
    (v_r16_2, 'R16', '2026-07-05 22:00:00+00', 'scheduled', v_qf1),
    (v_r16_3, 'R16', '2026-07-06 15:00:00+00', 'scheduled', v_qf2),
    (v_r16_4, 'R16', '2026-07-06 22:00:00+00', 'scheduled', v_qf2),
    (v_r16_5, 'R16', '2026-07-07 15:00:00+00', 'scheduled', v_qf3),
    (v_r16_6, 'R16', '2026-07-07 22:00:00+00', 'scheduled', v_qf3),
    (v_r16_7, 'R16', '2026-07-08 15:00:00+00', 'scheduled', v_qf4),
    (v_r16_8, 'R16', '2026-07-08 22:00:00+00', 'scheduled', v_qf4);

  -- R32 (M73–M88): adjacent pairs feed same R16 slot
  -- M73+M74 → R16-1, M75+M76 → R16-2, ..., M87+M88 → R16-8
  insert into public.matches (id, round, kickoff_time, status, next_match_id) values
    (v_m73, 'R32', '2026-06-28 15:00:00+00', 'scheduled', v_r16_1),
    (v_m74, 'R32', '2026-06-28 19:00:00+00', 'scheduled', v_r16_1),
    (v_m75, 'R32', '2026-06-28 23:00:00+00', 'scheduled', v_r16_2),
    (v_m76, 'R32', '2026-06-29 15:00:00+00', 'scheduled', v_r16_2),
    (v_m77, 'R32', '2026-06-29 19:00:00+00', 'scheduled', v_r16_3),
    (v_m78, 'R32', '2026-06-29 23:00:00+00', 'scheduled', v_r16_3),
    (v_m79, 'R32', '2026-06-30 15:00:00+00', 'scheduled', v_r16_4),
    (v_m80, 'R32', '2026-06-30 19:00:00+00', 'scheduled', v_r16_4),
    (v_m81, 'R32', '2026-06-30 23:00:00+00', 'scheduled', v_r16_5),
    (v_m82, 'R32', '2026-07-01 01:00:00+00', 'scheduled', v_r16_5),
    (v_m83, 'R32', '2026-07-01 15:00:00+00', 'scheduled', v_r16_6),
    (v_m84, 'R32', '2026-07-01 19:00:00+00', 'scheduled', v_r16_6),
    (v_m85, 'R32', '2026-07-01 23:00:00+00', 'scheduled', v_r16_7),
    (v_m86, 'R32', '2026-07-02 15:00:00+00', 'scheduled', v_r16_7),
    (v_m87, 'R32', '2026-07-02 19:00:00+00', 'scheduled', v_r16_8),
    (v_m88, 'R32', '2026-07-02 23:00:00+00', 'scheduled', v_r16_8);

end $$;
