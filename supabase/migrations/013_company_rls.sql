-- ============================================================
-- 013_company_rls.sql
-- Scopes approved_employees visibility to admin's own company.
-- Dev role bypasses all restrictions (sees everything).
-- ============================================================

-- Helper: returns the company of the calling auth user
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company FROM profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_company() TO authenticated;

-- Helper: returns true if calling user is dev role
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

-- RLS policy: admins can only read approved_employees for their company.
-- Dev bypasses. Replaces any existing select policy on approved_employees.
DROP POLICY IF EXISTS "approved_employees: admin read" ON public.approved_employees;

CREATE POLICY "approved_employees: admin read"
  ON public.approved_employees FOR SELECT
  TO authenticated
  USING (
    public.is_dev()
    OR (
      public.is_admin()
      AND company = public.get_my_company()
    )
  );

-- Note: the existing insert/update policies on approved_employees
-- (used by the sign-up flow via admin client) use the service role key
-- and bypass RLS entirely — those are unaffected by this change.
