"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function signUp(
  employeeId: string,
  accessKey: string,
  password: string
): Promise<{ error?: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Config error: SUPABASE_SERVICE_ROLE_KEY is not set in this deployment." };
  }

  const admin = createAdminClient();

  // Validate against the HR allowlist — ilike so casing in HR's spreadsheet doesn't matter
  const { data: employee, error: lookupError } = await admin
    .from("approved_employees")
    .select("employee_id, full_name, access_key, role, is_registered, job_title, home_department, division")
    .ilike("employee_id", employeeId)
    .maybeSingle();

  if (lookupError) {
    return { error: `Database error: ${lookupError.message}` };
  }
  if (!employee) {
    return { error: "Employee ID not found. Contact HR if you believe this is an error." };
  }

  if (employee.access_key !== accessKey) {
    return { error: "Invalid access key. Contact HR to retrieve your access key." };
  }

  if (employee.is_registered) {
    return { error: "This employee ID is already registered. Log in or reset your password." };
  }

  // Canonical ID: always uppercase, matches what we'll use for the email address
  const canonicalId = employee.employee_id.toUpperCase();

  // Create the auth user. email_confirm: true skips the verification email.
  // The handle_new_user trigger will create the profile row automatically.
  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email: `${canonicalId}@campocaribe.internal`,
    password,
    email_confirm: true,
    user_metadata: {
      employee_id: canonicalId,
      full_name: employee.full_name,
      role: employee.role ?? "user",
      job_title: employee.job_title ?? "",
      home_department: employee.home_department ?? "",
      division: employee.division ?? "",
    },
  });

  if (createError || !authData.user) {
    return { error: createError?.message ?? "Failed to create account. Please try again." };
  }

  // Match on the actual DB value so the update always hits the row, regardless of casing
  const { error: updateError } = await admin
    .from("approved_employees")
    .update({
      is_registered: true,
      registered_at: new Date().toISOString(),
    })
    .eq("employee_id", employee.employee_id);

  if (updateError) {
    console.error("Failed to mark employee as registered:", updateError.message);
  }

  return {};
}
