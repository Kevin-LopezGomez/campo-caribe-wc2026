-- ============================================================
-- 009_match_picks_status_check.sql
-- Closes a gap in match_picks RLS: the insert/update policies only
-- checked kickoff_time > now(), not match status. The predictor
-- server action (app/predictor/actions.ts) already treats
-- status != 'scheduled' as an independent lock condition, e.g. if
-- an admin flips a match to 'live' ahead of its scheduled
-- kickoff_time. This brings RLS in line so a direct API call
-- (bypassing the server action) can't write a pick in that window.
-- ============================================================

DROP POLICY IF EXISTS "match_picks: insert own before kickoff" ON public.match_picks;

CREATE POLICY "match_picks: insert own before kickoff"
  ON public.match_picks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.kickoff_time > now()
    )
  );

DROP POLICY IF EXISTS "match_picks: update own before kickoff" ON public.match_picks;

CREATE POLICY "match_picks: update own before kickoff"
  ON public.match_picks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.kickoff_time > now()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.kickoff_time > now()
    )
  );
