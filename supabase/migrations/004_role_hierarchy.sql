-- ============================================================
-- 004_role_hierarchy.sql
-- Adds role (user/admin/dev) + is_test columns
-- Migrates is_admin → role, promotes CC001 to dev
-- Updates is_admin() to cover admin+dev, adds is_dev()
-- Updates handle_new_user trigger to read role from metadata
-- ============================================================

-- ---- Add columns ----
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'dev')),
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.approved_employees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'dev')),
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- ---- Migrate from is_admin ----
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true AND role = 'user';
UPDATE public.approved_employees SET role = 'admin' WHERE is_admin = true AND role = 'user';

-- ---- Promote dev user ----
UPDATE public.profiles SET role = 'dev' WHERE employee_id = 'CC001';
UPDATE public.approved_employees SET role = 'dev' WHERE employee_id = 'CC001';

-- ---- Update is_admin() to return true for admin + dev ----
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'dev') FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ---- New function: dev-only routes ----
CREATE OR REPLACE FUNCTION public.is_dev()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'dev' FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_dev() TO authenticated;

-- ---- Update handle_new_user to read role from metadata ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.raw_user_meta_data->>'employee_id' IS NOT NULL THEN
    INSERT INTO profiles (id, employee_id, full_name, is_admin, role)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'employee_id',
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
      COALESCE((new.raw_user_meta_data->>'is_admin')::boolean, false),
      COALESCE(new.raw_user_meta_data->>'role', 'user')
    );
  END IF;
  RETURN new;
END;
$$;

-- ---- Update get_leaderboard() to include role + is_test ----
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id       uuid,
  full_name     text,
  employee_id   text,
  role          text,
  is_test       boolean,
  total_points  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id           AS user_id,
    p.full_name,
    p.employee_id,
    p.role,
    p.is_test,
    COALESCE(SUM(se.points), 0) AS total_points
  FROM profiles p
  LEFT JOIN score_events se ON se.user_id = p.id
  GROUP BY p.id, p.full_name, p.employee_id, p.role, p.is_test
  ORDER BY total_points DESC;
$$;
