-- ============================================================
-- seed_test_data.sql
-- Creates 20 test users (TEST001-TEST020) with:
--   - approved_employees rows (is_test=true)
--   - auth.users (password: test123)
--   - profiles (is_test=true, role='user')
--   - random ride_or_die_pick from 48 teams
--   - random match_picks for all R32 matches with both teams set
--     (30% chance of including an exact score prediction 0-3)
-- Run AFTER 004_role_hierarchy.sql
-- Password for all test users: test123
-- ============================================================

DO $$
DECLARE
  i              int;
  v_id           uuid;
  v_employee_id  text;
  v_full_name    text;
  v_team_ids     uuid[];
  v_match        record;
BEGIN
  SELECT ARRAY(SELECT id FROM public.teams) INTO v_team_ids;

  FOR i IN 1..20 LOOP
    v_id          := gen_random_uuid();
    v_employee_id := 'TEST' || LPAD(i::text, 3, '0');
    v_full_name   := 'Test User ' || LPAD(i::text, 2, '0');

    -- approved_employees
    INSERT INTO public.approved_employees
      (employee_id, full_name, access_key, role, is_registered, is_test)
    VALUES
      (v_employee_id, v_full_name,
       LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0'),
       'user', true, true)
    ON CONFLICT (employee_id) DO NOTHING;

    -- auth.users (pgcrypto must be enabled; it is on all Supabase projects)
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_super_admin
    ) VALUES (
      v_id, 'authenticated', 'authenticated',
      v_employee_id || '@campocaribe.internal',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'employee_id', v_employee_id,
        'full_name',   v_full_name,
        'role',        'user'
      ),
      now(), now(), false
    ) ON CONFLICT DO NOTHING;

    -- profiles: trigger creates it, but ensure is_test=true and correct id
    INSERT INTO public.profiles (id, employee_id, full_name, role, is_test)
    VALUES (v_id, v_employee_id, v_full_name, 'user', true)
    ON CONFLICT (id) DO UPDATE SET is_test = true;

    -- random ride_or_die_pick
    INSERT INTO public.ride_or_die_picks (user_id, team_id, locked)
    VALUES (
      v_id,
      v_team_ids[1 + (FLOOR(RANDOM() * ARRAY_LENGTH(v_team_ids, 1)))::int],
      false
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- match_picks for every R32 match that has both teams
    FOR v_match IN
      SELECT id, team_home_id, team_away_id,
             RANDOM() < 0.5  AS pick_home,
             RANDOM() < 0.3  AS include_score,
             FLOOR(RANDOM() * 4)::int AS rh,
             FLOOR(RANDOM() * 4)::int AS ra
      FROM public.matches
      WHERE round = 'R32'
        AND team_home_id IS NOT NULL
        AND team_away_id IS NOT NULL
    LOOP
      INSERT INTO public.match_picks
        (user_id, match_id, winner_team_id, predicted_home_score, predicted_away_score)
      VALUES (
        v_id,
        v_match.id,
        CASE WHEN v_match.pick_home THEN v_match.team_home_id ELSE v_match.team_away_id END,
        CASE WHEN v_match.include_score THEN v_match.rh ELSE NULL END,
        CASE WHEN v_match.include_score THEN v_match.ra ELSE NULL END
      )
      ON CONFLICT (user_id, match_id) DO NOTHING;
    END LOOP;

  END LOOP;
END $$;
