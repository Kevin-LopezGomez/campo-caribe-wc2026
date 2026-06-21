-- ============================================================
-- 010_department_fields.sql
-- Adds HR department/role metadata columns.
-- approved_employees: job_title, reports_to, home_department, division
-- profiles: job_title, home_department, division
--   (reports_to omitted — administrative, not needed in app UI)
-- Updates handle_new_user to populate new profile fields from metadata.
-- ============================================================

ALTER TABLE public.approved_employees
  ADD COLUMN IF NOT EXISTS job_title        text,
  ADD COLUMN IF NOT EXISTS reports_to       text,
  ADD COLUMN IF NOT EXISTS home_department  text,
  ADD COLUMN IF NOT EXISTS division         text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title        text,
  ADD COLUMN IF NOT EXISTS home_department  text,
  ADD COLUMN IF NOT EXISTS division         text;

-- ---- Update handle_new_user to populate department fields ----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.raw_user_meta_data->>'employee_id' IS NOT NULL THEN
    INSERT INTO profiles (id, employee_id, full_name, role, job_title, home_department, division)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'employee_id',
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
      COALESCE(new.raw_user_meta_data->>'role', 'user'),
      NULLIF(new.raw_user_meta_data->>'job_title', ''),
      NULLIF(new.raw_user_meta_data->>'home_department', ''),
      NULLIF(new.raw_user_meta_data->>'division', '')
    );
  END IF;
  RETURN new;
END;
$$;
