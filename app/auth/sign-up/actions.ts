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

  // Validate against the HR allowlist
  const { data: employee, error: lookupError } = await admin
    .from("approved_employees")
    .select("employee_id, full_name, access_key, is_admin, is_registered")
    .eq("employee_id", employeeId)
    .single();

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

  // Create the auth user. email_confirm: true skips the verification email.
  // The handle_new_user trigger will create the profile row automatically.
  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email: `${employeeId}@campocaribe.internal`,
    password,
    email_confirm: true,
    user_metadata: {
      employee_id: employeeId,
      full_name: employee.full_name,
      is_admin: employee.is_admin,
    },
  });

  if (createError || !authData.user) {
    return { error: createError?.message ?? "Failed to create account. Please try again." };
  }

  // Mark the employee as registered so the access key can't be reused for signup
  const { error: updateError } = await admin
    .from("approved_employees")
    .update({
      is_registered: true,
      registered_at: new Date().toISOString(),
    })
    .eq("employee_id", employeeId);

  if (updateError) {
    console.error("Failed to mark employee as registered:", updateError.message);
  }

  return {};
}
