-- ============================================================
-- 012_company_field.sql
-- Adds company field to profiles table and updates
-- handle_new_user trigger to populate it from signup metadata.
-- approved_employees.company already exists (added manually).
-- ============================================================

-- 1. Normalize the column name on approved_employees to lowercase
--    (it was added manually as "Company" with capital C — rename for
--    consistency with the rest of the schema)
ALTER TABLE public.approved_employees
  RENAME COLUMN "Company" TO company;

-- 2. Add company to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text;

-- 3. Backfill existing profiles from approved_employees
UPDATE public.profiles p
SET company = ae.company
FROM public.approved_employees ae
WHERE p.employee_id = ae.employee_id
  AND p.company IS NULL;

-- 4. Update handle_new_user to include company from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.raw_user_meta_data->>'employee_id' IS NOT NULL THEN
    INSERT INTO profiles (
      id, employee_id, full_name, role,
      job_title, home_department, division, company
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'employee_id',
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
      COALESCE(new.raw_user_meta_data->>'role', 'user'),
      NULLIF(new.raw_user_meta_data->>'job_title', ''),
      NULLIF(new.raw_user_meta_data->>'home_department', ''),
      NULLIF(new.raw_user_meta_data->>'division', ''),
      NULLIF(new.raw_user_meta_data->>'company', '')
    );
  END IF;
  RETURN new;
END;
$$;
