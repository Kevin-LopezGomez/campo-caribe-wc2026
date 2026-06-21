-- ============================================================
-- 005_drop_is_admin.sql
-- Removes the is_admin column from profiles and approved_employees.
-- Prerequisites: 004_role_hierarchy.sql must have run first.
-- ============================================================

-- ---- Update handle_new_user: remove is_admin from INSERT ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.raw_user_meta_data->>'employee_id' IS NOT NULL THEN
    INSERT INTO profiles (id, employee_id, full_name, role)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'employee_id',
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
      COALESCE(new.raw_user_meta_data->>'role', 'user')
    );
  END IF;
  RETURN new;
END;
$$;

-- ---- Recreate "profiles: update own" policy without is_admin reference ----
-- The old policy used: is_admin = (select is_admin from profiles where id = auth.uid())
-- New policy prevents self-elevation by locking role to current value.
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- ---- Drop is_admin columns ----
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;
ALTER TABLE public.approved_employees DROP COLUMN IF EXISTS is_admin;
